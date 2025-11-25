from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .models import load_model_artifacts
from .routes import health_router, aqi_router, prediction_router

# Configure logging
logging.basicConfig(level=logging.INFO)
LOGGER = logging.getLogger(__name__)

# Load model artifacts on startup
load_model_artifacts()

app = FastAPI(title="Sentry Safety Predictor", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(aqi_router)
app.include_router(prediction_router)
