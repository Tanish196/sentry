"""AQI endpoints."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..constants import DELHI_POLICE_STATIONS
from ..schemas.aqi import AQIData, AQIResponse
from ..services.waqi_service import fetch_aqi_from_waqi, categorize_aqi, get_all_station_names
from ..services.gemini_service import fetch_aqi_from_gemini

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/aqi", tags=["aqi"])


@router.get("", response_model=AQIResponse)
async def get_aqi_for_all_stations():
    """Get AQI data for all Delhi police stations using WAQI API."""
    settings = get_settings()
    
    try:
        # Fetch AQI data from WAQI API (much more reliable than Gemini)
        aqi_dict = await fetch_aqi_from_waqi(
            waqi_token=settings.waqi_api_token,
            max_concurrent=15,  # Reasonable concurrency for WAQI API
            retry_delay=0.5,
            max_retries=2
        )
        
        # Build response using all available stations
        aqi_data_list = []
        available_stations = get_all_station_names()
        
        for station in available_stations:
            station_data = aqi_dict.get(station, {})
            aqi_value = station_data.get("aqi", 150.0)
            aqi_category = station_data.get("status", categorize_aqi(aqi_value))
            
            aqi_data_list.append(
                AQIData(
                    police_station=station,
                    aqi=aqi_value,
                    aqi_category=aqi_category
                )
            )
        
        LOGGER.info(f"Successfully fetched AQI data for {len(aqi_data_list)} police stations")
        
        return AQIResponse(
            timestamp=datetime.utcnow().isoformat() + "Z",
            data=aqi_data_list
        )
    
    except Exception as e:
        LOGGER.error(f"Failed to fetch AQI data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AQI data: {str(e)}")


@router.get("/legacy", response_model=AQIResponse)
async def get_aqi_for_all_stations_gemini():
    """Legacy endpoint using Gemini API (for comparison - not recommended for production use)."""
    settings = get_settings()
    
    try:
        # Fetch AQI data from Gemini (keeping for backward compatibility)
        aqi_dict = await fetch_aqi_from_gemini(
            DELHI_POLICE_STATIONS,
            settings.gemini_api_key,
            settings.gemini_api_url
        )
        
        # Build response
        aqi_data_list = []
        for station in DELHI_POLICE_STATIONS:
            aqi_value = aqi_dict.get(station, 150.0)  # Default to 150 if not found
            aqi_data_list.append(
                AQIData(
                    police_station=station,
                    aqi=aqi_value,
                    aqi_category=categorize_aqi(aqi_value)
                )
            )
        
        return AQIResponse(
            timestamp=datetime.utcnow().isoformat() + "Z",
            data=aqi_data_list
        )
    
    except Exception as e:
        LOGGER.error(f"Failed to fetch AQI data from Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AQI data: {str(e)}")


@router.get("/station/{station_name}")
async def get_aqi_for_station(station_name: str):
    """Get AQI data for a specific police station."""
    settings = get_settings()
    
    try:
        # Fetch data for all stations (cached/optimized in production)
        aqi_dict = await fetch_aqi_from_waqi(
            waqi_token=settings.waqi_api_token,
            max_concurrent=15
        )
        
        station_data = aqi_dict.get(station_name.lower())
        if not station_data:
            raise HTTPException(
                status_code=404, 
                detail=f"Police station '{station_name}' not found"
            )
        
        return {
            "station": station_name,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            **station_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        LOGGER.error(f"Failed to fetch AQI data for station {station_name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AQI data: {str(e)}")


@router.get("/stations")
async def get_available_stations():
    """Get list of all available police stations with coordinates."""
    from ..services.waqi_service import POLICE_STATION_COORDINATES
    
    stations = []
    for station_name, (lng, lat) in POLICE_STATION_COORDINATES.items():
        stations.append({
            "name": station_name,
            "coordinates": [lng, lat],
            "latitude": lat,
            "longitude": lng
        })
    
    return {
        "total_stations": len(stations),
        "stations": sorted(stations, key=lambda x: x["name"])
    }