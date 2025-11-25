from .health import router as health_router
from .aqi import router as aqi_router
from .prediction import router as prediction_router

__all__ = ["health_router", "aqi_router", "prediction_router"]
