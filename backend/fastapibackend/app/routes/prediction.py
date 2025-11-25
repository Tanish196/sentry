import asyncio
import logging
from typing import Dict, List

import httpx
from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..constants import DELHI_POLICE_STATIONS
from ..schemas.prediction import (
    BatchPredictRequest,
    BatchPredictResponse,
    LocationRequest,
    PredictionResult,
    SingleLocationRequest,
    SinglePredictionResponse,
    PredictAllRequest,
    PredictAllResponse,
)
from ..services.gemini_service import fetch_aqi_from_gemini
from ..services.prediction_service import predict_safety, extract_weather_features
from ..services.weather_service import fetch_weather_and_aqi
from ..models import get_model_artifacts

LOGGER = logging.getLogger(__name__)

router = APIRouter(tags=["prediction"])


def _extract_feature_row(location: LocationRequest, bundle: Dict) -> Dict[str, float | str]:
    """Extract feature row from location and weather bundle."""
    weather_features = extract_weather_features(bundle["weather"], bundle["aqi"])
    
    return {
        "month": location.month,
        "day": location.day,
        "police_station": location.police_station,
        "gender": location.gender,
        "family": location.family,
        "Max Temperature": weather_features["temp_max"],
        "Avg Temperature": weather_features["temp_avg"],
        "Min Temperature": weather_features["temp_min"],
        "Max Humidity": weather_features["humidity"],
        "Avg Humidity": weather_features["humidity"],
        "Min Humidity": weather_features["humidity"],
        "Max Wind Speed": weather_features["wind_speed"],
        "Avg Wind Speed": weather_features["wind_speed"],
        "Min Wind Speed": weather_features["wind_speed"],
        "Total Precipitation": weather_features["precipitation"],
        "aqi": bundle["aqi"],
        "aqi_median": bundle["aqi"],
    }


@router.post("/predict", response_model=BatchPredictResponse)
async def predict(request: BatchPredictRequest):
    if not request.locations:
        raise HTTPException(status_code=400, detail="At least one location is required")

    settings = get_settings()
    model, preprocessor, label_encoder = get_model_artifacts()

    async with httpx.AsyncClient(timeout=20.0) as client:
        bundles = await asyncio.gather(
            *[
                fetch_weather_and_aqi(
                    client,
                    loc.city,
                    settings.openweather_api_key,
                    settings.weather_url,
                    settings.air_pollution_url
                )
                for loc in request.locations
            ]
        )

    feature_rows = [_extract_feature_row(loc, bundle) for loc, bundle in zip(request.locations, bundles)]
    labels, probabilities = predict_safety(feature_rows, model, preprocessor, label_encoder)

    results: List[PredictionResult] = []
    for loc, label, probs, bundle in zip(request.locations, labels, probabilities, bundles):
        prob_map = {cls: float(prob) for cls, prob in zip(label_encoder.classes_, probs)}
        weather_main = bundle["weather"].get("main", {})
        weather_snapshot = {
            "temp": float(weather_main.get("temp", 0.0)),
            "humidity": float(weather_main.get("humidity", 0.0)),
            "wind_speed": float(bundle["weather"].get("wind", {}).get("speed", 0.0)),
            "aqi": float(bundle.get("aqi", 0.0)),
        }
        results.append(
            PredictionResult(
                city=loc.city,
                police_station=loc.police_station,
                predicted_label=label,
                probabilities=prob_map,
                weather_snapshot=weather_snapshot,
            )
        )

    return BatchPredictResponse(predictions=results)


@router.post("/predict-single", response_model=SinglePredictionResponse)
async def predict_single(request: SingleLocationRequest):
    settings = get_settings()
    model, preprocessor, label_encoder = get_model_artifacts()
    
    try:
        # Fetch weather data for Delhi
        async with httpx.AsyncClient(timeout=20.0) as client:
            weather_bundle = await fetch_weather_and_aqi(
                client,
                "Delhi",
                settings.openweather_api_key,
                settings.weather_url,
                settings.air_pollution_url
            )
        
        # Get AQI from Gemini for this specific station
        aqi_dict = await fetch_aqi_from_gemini(
            [request.police_station],
            settings.gemini_api_key,
            settings.gemini_api_url
        )
        gemini_aqi = aqi_dict.get(request.police_station, 150.0)
        
        # Override the weather bundle AQI with Gemini's value
        weather_bundle["aqi"] = gemini_aqi
        
        # Extract weather features
        weather_features = extract_weather_features(weather_bundle["weather"], gemini_aqi)
        
        # Build feature row
        feature_row = {
            "month": request.month,
            "day": request.day,
            "police_station": request.police_station,
            "gender": request.gender,
            "family": request.family,
            "Max Temperature": weather_features["temp_max"],
            "Avg Temperature": weather_features["temp_avg"],
            "Min Temperature": weather_features["temp_min"],
            "Max Humidity": weather_features["humidity"],
            "Avg Humidity": weather_features["humidity"],
            "Min Humidity": weather_features["humidity"],
            "Max Wind Speed": weather_features["wind_speed"],
            "Avg Wind Speed": weather_features["wind_speed"],
            "Min Wind Speed": weather_features["wind_speed"],
            "Total Precipitation": weather_features["precipitation"],
            "aqi": gemini_aqi,
            "aqi_median": gemini_aqi,
        }
        
        labels, probabilities = predict_safety([feature_row], model, preprocessor, label_encoder)
        label = labels[0]
        probs = probabilities[0]
        
        prob_map = {cls: float(prob) for cls, prob in zip(label_encoder.classes_, probs)}
        weather_snapshot = {
            "temp": weather_features["temp_avg"],
            "humidity": weather_features["humidity"],
            "wind_speed": weather_features["wind_speed"],
            "aqi": gemini_aqi,
        }
        
        return SinglePredictionResponse(
            police_station=request.police_station,
            predicted_label=label,
            probabilities=prob_map,
            weather_snapshot=weather_snapshot
        )
    
    except Exception as e:
        LOGGER.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@router.post("/predict-all", response_model=PredictAllResponse)
async def predict_all(request: PredictAllRequest):
    settings = get_settings()
    model, preprocessor, label_encoder = get_model_artifacts()
    
    try:
        # Fetch weather data for Delhi once
        async with httpx.AsyncClient(timeout=20.0) as client:
            weather_bundle = await fetch_weather_and_aqi(
                client,
                "Delhi",
                settings.openweather_api_key,
                settings.weather_url,
                settings.air_pollution_url
            )
        
        # Get AQI from Gemini for all stations
        aqi_dict = await fetch_aqi_from_gemini(
            DELHI_POLICE_STATIONS,
            settings.gemini_api_key,
            settings.gemini_api_url
        )
        
        # Extract weather features
        weather_features = extract_weather_features(
            weather_bundle["weather"],
            weather_bundle["aqi"]
        )
        
        # Build feature rows for all police stations
        feature_rows = []
        for station in DELHI_POLICE_STATIONS:
            station_aqi = aqi_dict.get(station, 150.0)  # Default to 150 if not found
            
            feature_row = {
                "month": request.month,
                "day": request.day,
                "police_station": station,
                "gender": request.gender,
                "family": request.family,
                "Max Temperature": weather_features["temp_max"],
                "Avg Temperature": weather_features["temp_avg"],
                "Min Temperature": weather_features["temp_min"],
                "Max Humidity": weather_features["humidity"],
                "Avg Humidity": weather_features["humidity"],
                "Min Humidity": weather_features["humidity"],
                "Max Wind Speed": weather_features["wind_speed"],
                "Avg Wind Speed": weather_features["wind_speed"],
                "Min Wind Speed": weather_features["wind_speed"],
                "Total Precipitation": weather_features["precipitation"],
                "aqi": station_aqi,
                "aqi_median": station_aqi,
            }
            feature_rows.append(feature_row)
        
        # Make predictions for all stations
        labels, probabilities = predict_safety(feature_rows, model, preprocessor, label_encoder)
        
        # Build response
        predictions = []
        for station, label, probs in zip(DELHI_POLICE_STATIONS, labels, probabilities):
            station_aqi = aqi_dict.get(station, 150.0)
            prob_map = {cls: float(prob) for cls, prob in zip(label_encoder.classes_, probs)}
            weather_snapshot = {
                "temp": weather_features["temp_avg"],
                "humidity": weather_features["humidity"],
                "wind_speed": weather_features["wind_speed"],
                "aqi": station_aqi,
            }
            
            predictions.append(
                SinglePredictionResponse(
                    police_station=station,
                    predicted_label=label,
                    probabilities=prob_map,
                    weather_snapshot=weather_snapshot
                )
            )
        
        return PredictAllResponse(
            city="Delhi",
            gender=request.gender,
            family=request.family,
            month=request.month,
            day=request.day,
            predictions=predictions
        )
    
    except Exception as e:
        LOGGER.error(f"Predict-all failed: {e}")
        raise HTTPException(status_code=500, detail=f"Predict-all failed: {str(e)}")
