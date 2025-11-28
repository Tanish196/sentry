"""Application configuration."""

import os
from functools import lru_cache

from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    openweather_api_key: str = os.getenv("OPENWEATHER_API_KEY", "")
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    waqi_api_token: str = os.getenv("AQICN_API_KEY", "fc06969e9f076c24793423ed7d231e038c3767d9")
    ors_api_key: str = os.getenv("ORS_API_KEY", "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjllNDU0YWI5Mjg3YTQ1MDJhY2JhNTJhYTgzMmVjNWRmIiwiaCI6Im11cm11cjY0In0=")
    
    weather_url: str = "https://api.openweathermap.org/data/2.5/weather"
    air_pollution_url: str = "https://api.openweathermap.org/data/2.5/air_pollution"
    gemini_api_url: str = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    waqi_api_url: str = "http://api.waqi.info/feed/geo"
    ors_api_url: str = os.getenv("ORS_API_URL", "https://api.openrouteservice.org/v2/directions")
    
    # Path to police boundaries GeoJSON file
    safety_polygon_path: str = os.getenv(
        "SAFETY_POLYGON_PATH",
        "../../../frontend/public/data/police-boundaries.geojson"
    )
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields from environment


@lru_cache()
def get_settings() -> Settings:
    return Settings()