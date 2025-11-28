from .health import router as health_router
from .aqi import router as aqi_router
from .prediction import router as prediction_router
from .route import router as route_router
from .safety import router as safety_router

__all__ = [
	"health_router",
	"aqi_router",
	"prediction_router",
	"route_router",
	"safety_router",
]
