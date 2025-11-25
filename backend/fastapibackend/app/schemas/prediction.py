"""Schemas for prediction requests and responses."""

from typing import Dict, List
from pydantic import BaseModel, Field


class LocationRequest(BaseModel):
    city: str = Field(..., description="City name supported by OpenWeatherMap")
    police_station: str
    gender: str
    family: str
    month: int = Field(..., ge=1, le=12)
    day: int = Field(..., ge=1, le=31)
    year: int = Field(..., ge=1900)


class BatchPredictRequest(BaseModel):
    locations: List[LocationRequest] = Field(..., min_length=1)


class PredictionResult(BaseModel):
    city: str
    police_station: str
    predicted_label: str
    probabilities: Dict[str, float]
    weather_snapshot: Dict[str, float]


class BatchPredictResponse(BaseModel):
    predictions: List[PredictionResult]


class SingleLocationRequest(BaseModel):
    police_station: str = Field(..., description="Police station name in Delhi")
    gender: str = Field(..., description="Gender: male, female, or other")
    family: str = Field(..., description="Family status: with_family or alone")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    day: int = Field(..., ge=1, le=31, description="Day of month")


class SinglePredictionResponse(BaseModel):
    police_station: str
    predicted_label: str
    probabilities: Dict[str, float]
    weather_snapshot: Dict[str, float]


class PredictAllRequest(BaseModel):
    gender: str = Field("female", description="Gender: male, female, or other")
    family: str = Field("alone", description="Family status: with_family or alone")
    month: int = Field(..., ge=1, le=12, description="Month (1-12)")
    day: int = Field(..., ge=1, le=31, description="Day of month")


class PredictAllResponse(BaseModel):
    city: str
    gender: str
    family: str
    month: int
    day: int
    predictions: List[SinglePredictionResponse]
