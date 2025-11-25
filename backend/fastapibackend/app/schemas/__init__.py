from .prediction import (
    LocationRequest,
    BatchPredictRequest,
    PredictionResult,
    BatchPredictResponse,
    SingleLocationRequest,
    SinglePredictionResponse,
    PredictAllRequest,
    PredictAllResponse,
)
from .aqi import AQIData, AQIResponse

__all__ = [
    "LocationRequest",
    "BatchPredictRequest",
    "PredictionResult",
    "BatchPredictResponse",
    "SingleLocationRequest",
    "SinglePredictionResponse",
    "PredictAllRequest",
    "PredictAllResponse",
    "AQIData",
    "AQIResponse",
]
