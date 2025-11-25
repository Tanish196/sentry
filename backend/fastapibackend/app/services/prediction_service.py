"""Prediction service for safety classification."""

import logging
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
from fastapi import HTTPException

LOGGER = logging.getLogger(__name__)

FEATURES = [
    "month",
    "day",
    "police_station",
    "gender",
    "family",
    "Max Temperature",
    "Avg Temperature",
    "Min Temperature",
    "Max Humidity",
    "Avg Humidity",
    "Min Humidity",
    "Max Wind Speed",
    "Avg Wind Speed",
    "Min Wind Speed",
    "Total Precipitation",
    "aqi",
    "aqi_median",
]


def predict_safety(
    batch: List[Dict[str, float | str]],
    model,
    preprocessor,
    label_encoder
) -> Tuple[np.ndarray, np.ndarray]:
    """Make safety predictions for a batch of feature rows.
    
    Args:
        batch: List of feature dictionaries
        model: Trained ML model
        preprocessor: Feature preprocessor
        label_encoder: Label encoder
        
    Returns:
        Tuple of (labels, probabilities)
    """
    if model is None or preprocessor is None or label_encoder is None:
        raise HTTPException(status_code=500, detail="Model artifacts missing")

    df = pd.DataFrame(batch, columns=FEATURES)
    transformed = preprocessor.transform(df)
    probabilities = model.predict_proba(transformed)
    label_indices = model.predict(transformed)
    labels = label_encoder.inverse_transform(label_indices.astype(int))
    return labels, probabilities


def extract_weather_features(weather_data: Dict, aqi: float) -> Dict[str, float]:
    """Extract weather features from OpenWeatherMap response.
    
    Args:
        weather_data: Weather API response
        aqi: AQI value
        
    Returns:
        Dictionary of weather features
    """
    main = weather_data.get("main", {})
    wind = weather_data.get("wind", {})

    temp_max = float(main.get("temp_max", main.get("temp", 0.0)))
    temp_avg = float(main.get("temp", temp_max))
    temp_min = float(main.get("temp_min", temp_avg))
    humidity = float(main.get("humidity", 0.0))
    wind_speed = float(wind.get("speed", 0.0))

    precipitation = 0.0
    for precip_key in ("rain", "snow"):
        precip_block = weather_data.get(precip_key)
        if isinstance(precip_block, dict):
            precipitation += float(precip_block.get("1h") or precip_block.get("3h") or 0.0)

    return {
        "temp_max": temp_max,
        "temp_avg": temp_avg,
        "temp_min": temp_min,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "precipitation": precipitation,
    }
