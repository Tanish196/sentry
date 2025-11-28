"""Safety area service for geofence management and safe routing."""

import json
import logging
import os
from datetime import datetime, timedelta
from functools import lru_cache, wraps
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
from fastapi import HTTPException

from ..config import get_settings
from ..models import get_model_artifacts
from ..services.prediction_service import predict_safety
from ..services.waqi_service import fetch_aqi_from_waqi, POLICE_STATION_COORDINATES

LOGGER = logging.getLogger(__name__)

# Time-based cache storage
_timed_cache = {}
_cache_ttl = timedelta(minutes=30)


def timed_cache(func):
    """Decorator to cache function results with a time-to-live."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Create cache key from function name and arguments
        cache_key = f"{func.__name__}:{args}:{kwargs}"
        
        # Check if we have cached data
        if cache_key in _timed_cache:
            cached_data, cached_time = _timed_cache[cache_key]
            if datetime.now() - cached_time < _cache_ttl:
                LOGGER.info(f"Returning cached data for {func.__name__}")
                return cached_data
        
        # Fetch fresh data
        LOGGER.info(f"Cache miss or expired for {func.__name__}, fetching fresh data")
        result = await func(*args, **kwargs)
        
        # Store in cache with timestamp
        _timed_cache[cache_key] = (result, datetime.now())
        
        return result
    
    return wrapper

SAFE_LABEL_HINTS = {"safe", "low risk", "allow", "green"}
DANGER_LABEL_HINTS = {"danger", "high", "forbidden", "severe"}


def _resolve_class_order(label_encoder, model) -> List[str]:
    """Return the class order from label encoder or model."""
    if label_encoder is not None and hasattr(label_encoder, "classes_"):
        return [str(cls) for cls in label_encoder.classes_]
    if hasattr(model, "classes_"):
        return [str(cls) for cls in getattr(model, "classes_", [])]
    return []


def _extract_safe_probability(prob_vector: np.ndarray, class_order: List[str]) -> float:
    """Extract probability of safe/low-risk class from model output."""
    if prob_vector is None or len(prob_vector) == 0:
        return 0.5

    safe_idx = None
    for idx, class_name in enumerate(class_order):
        normalized = class_name.lower()
        if any(hint in normalized for hint in SAFE_LABEL_HINTS):
            safe_idx = idx
            break

    if safe_idx is not None and safe_idx < len(prob_vector):
        return float(prob_vector[safe_idx])

    # Fallback: if we can locate a danger/high-risk class, use inverse prob
    for idx, class_name in enumerate(class_order):
        normalized = class_name.lower()
        if any(hint in normalized for hint in DANGER_LABEL_HINTS):
            danger_prob = float(prob_vector[idx]) if idx < len(prob_vector) else 0.5
            return float(max(0.0, min(1.0, 1.0 - danger_prob)))

    # Last resort: keep previous behavior (assume final column is safest)
    return float(prob_vector[-1])


def _classify_risk_level(safety_score: float, predicted_label: str) -> str:
    """
    Classify risk level based on safety score and ML prediction.
    
    Args:
        safety_score: Probability of safe class (0-1, higher is safer)
        predicted_label: ML model prediction (Safe/Moderate Risk/High Risk)
    
    Returns:
        Risk level: "safe", "caution", or "forbidden"
    """
    # High Risk predictions are always forbidden
    if "High Risk" in predicted_label or "high" in predicted_label.lower():
        return "forbidden"
    
    # Use safety score thresholds
    if safety_score >= 0.7:
        return "safe"
    elif safety_score >= 0.4:
        return "caution"
    else:
        return "forbidden"


@lru_cache(maxsize=1)
def _load_police_boundaries() -> Dict[str, Any]:
    """Load police boundaries GeoJSON from disk (cached)."""
    settings = get_settings()
    polygon_path = Path(settings.safety_polygon_path)
    
    # Try multiple possible paths
    search_paths = [
        polygon_path,
        Path(__file__).parent.parent.parent.parent.parent.parent / "frontend" / "public" / "data" / "police-boundaries.geojson",
        Path("frontend/public/data/police-boundaries.geojson"),
        Path("../frontend/public/data/police-boundaries.geojson"),
    ]
    
    for path in search_paths:
        if path.exists():
            LOGGER.info(f"Loading police boundaries from {path}")
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    
    LOGGER.error(f"Could not find police boundaries file. Searched: {search_paths}")
    raise FileNotFoundError("Police boundaries GeoJSON file not found")


def _build_feature_row_for_polygon(
    police_station: str,
    month: int,
    day: int,
    temp_max: float,
    temp_avg: float,
    temp_min: float,
    humidity: float,
    wind_speed: float,
    precipitation: float,
    aqi: float,
    aqi_median: float,
    gender: str = "Male",
    family: str = "No"
) -> Dict[str, Any]:
    """Build a feature row for ML prediction."""
    return {
        "month": month,
        "day": day,
        "police_station": police_station,
        "gender": gender,
        "family": family,
        "Max Temperature": temp_max,
        "Avg Temperature": temp_avg,
        "Min Temperature": temp_min,
        "Max Humidity": humidity,
        "Avg Humidity": humidity,
        "Min Humidity": humidity,
        "Max Wind Speed": wind_speed,
        "Avg Wind Speed": wind_speed,
        "Min Wind Speed": wind_speed,
        "Total Precipitation": precipitation,
        "aqi": aqi,
        "aqi_median": aqi_median,
    }


@timed_cache
async def get_safety_polygons(
    month: Optional[int] = None,
    day: Optional[int] = None,
    use_current_conditions: bool = True
) -> Dict[str, Any]:
    """
    Get safety-annotated police station polygons.
    
    Args:
        month: Month for prediction (1-12), defaults to current
        day: Day for prediction (1-31), defaults to current
        use_current_conditions: Whether to fetch live weather/AQI
    
    Returns:
        GeoJSON FeatureCollection with safety annotations
    """
    try:
        # Get current date if not provided
        now = datetime.now()
        if month is None:
            month = now.month
        if day is None:
            day = now.day
        # Load police boundaries
        boundaries_data = _load_police_boundaries()
        
        # Get model artifacts
        model, preprocessor, label_encoder = get_model_artifacts()
        if model is None:
            raise HTTPException(status_code=500, detail="ML model not loaded")
        class_order = _resolve_class_order(label_encoder, model)
        
        # Fetch current AQI data for all stations
        settings = get_settings()
        aqi_data = {}
        
        if use_current_conditions:
            try:
                aqi_data = await fetch_aqi_from_waqi(
                    waqi_token=settings.waqi_api_token,
                    max_concurrent=10,
                    retry_delay=0.5,
                    max_retries=1
                )
            except Exception as e:
                LOGGER.warning(f"Failed to fetch live AQI data: {e}, using defaults")
        
        # Default weather values (can be enhanced to fetch real data)
        default_weather = {
            "temp_max": 32.0,
            "temp_avg": 28.0,
            "temp_min": 24.0,
            "humidity": 65.0,
            "wind_speed": 3.5,
            "precipitation": 0.0,
        }
        
        # Calculate median AQI
        aqi_values = [data.get("aqi", 150.0) for data in aqi_data.values()]
        aqi_median = float(np.median(aqi_values)) if aqi_values else 150.0
        
        # Build feature rows for each police station
        feature_rows = []
        station_names = []
        
        for feature in boundaries_data.get("features", []):
            props = feature.get("properties", {})
            # Fix: Use POL_STN_NM instead of NAME
            station_name = props.get("POL_STN_NM", "").lower().strip()
            
            # Remove "PS " prefix and normalize
            normalized_name = station_name.replace("ps ", "").replace(".", "").strip()
            
            # Try to match station name
            matched_station = None
            for ps_name in POLICE_STATION_COORDINATES.keys():
                if ps_name in normalized_name or normalized_name in ps_name:
                    matched_station = ps_name
                    break
            
            if not matched_station:
                # Use first part of name
                parts = normalized_name.split()
                if parts:
                    matched_station = " ".join(parts[:2])
            
            # Get AQI for this station
            station_key = matched_station or ""
            station_aqi_data = aqi_data.get(station_key, {}) if station_key else {}
            station_aqi = station_aqi_data.get("aqi", 150.0)
            
            # Build feature row
            feature_row = _build_feature_row_for_polygon(
                police_station=matched_station or station_name,
                month=month,
                day=day,
                aqi=station_aqi,
                aqi_median=aqi_median,
                temp_max=default_weather["temp_max"],
                temp_avg=default_weather["temp_avg"],
                temp_min=default_weather["temp_min"],
                humidity=default_weather["humidity"],
                wind_speed=default_weather["wind_speed"],
                precipitation=default_weather["precipitation"],
            )
            
            feature_rows.append(feature_row)
            station_names.append(station_name)
        
        # Make predictions
        if feature_rows:
            labels, probabilities = predict_safety(
                feature_rows,
                model,
                preprocessor,
                label_encoder
            )
        else:
            labels = []
            probabilities = []
        
        # Annotate features with safety predictions
        annotated_features = []
        
        for idx, feature in enumerate(boundaries_data.get("features", [])):
            if idx < len(labels):
                predicted_label = labels[idx]
                probs = probabilities[idx]
                
                # Extract safe probability using resolved class order
                safety_score = _extract_safe_probability(probs, class_order)
                
                # Classify risk level
                risk_level = _classify_risk_level(safety_score, predicted_label)
                
                # Add safety annotations to properties
                props = feature.get("properties", {})
                
                # Get AQI for this station from station_names match
                matched_station_name = station_names[idx] if idx < len(station_names) else None
                station_aqi = aqi_data.get(matched_station_name, {}).get("aqi", 150.0) if matched_station_name else 150.0
                
                props.update({
                    "safety_score": round(safety_score, 3),
                    "risk_level": risk_level,
                    "predicted_label": predicted_label,
                    "station_id": f"ps_{idx:03d}",
                    "matched_station": matched_station_name,
                    # Add original GeoJSON properties for frontend display
                    "station_name": props.get("POL_STN_NM", "Unknown"),
                    "district": props.get("DIST_NM", "Unknown"),
                    "range": props.get("RANGE", "Unknown"),
                    "subdivision": props.get("SUB_DIVISI", "Unknown"),
                    "aqi": round(station_aqi, 1),
                })
                
                feature["properties"] = props
                annotated_features.append(feature)
            else:
                # No prediction available - mark as caution
                props = feature.get("properties", {})
                props.update({
                    "safety_score": 0.5,
                    "risk_level": "forbidden",  # Conservative: unpredicted areas are risky
                    "predicted_label": "Unknown",
                    "station_id": f"ps_{idx:03d}",
                })
                feature["properties"] = props
                annotated_features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": annotated_features,
            "metadata": {
                "generated_at": now.isoformat(),
                "month": month,
                "day": day,
                "total_features": len(annotated_features),
                "median_aqi": aqi_median,
            }
        }
    
    except Exception as e:
        LOGGER.error(f"Error generating safety polygons: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate safety polygons: {str(e)}")


