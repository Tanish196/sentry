"""AQI endpoints."""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..config import get_settings
from ..constants import DELHI_POLICE_STATIONS
from ..schemas.aqi import AQIData, AQIResponse
from ..services.gemini_service import fetch_aqi_from_gemini, categorize_aqi

LOGGER = logging.getLogger(__name__)

router = APIRouter(prefix="/aqi", tags=["aqi"])


@router.get("", response_model=AQIResponse)
async def get_aqi_for_all_stations():
    settings = get_settings()
    
    try:
        # Fetch AQI data from Gemini
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
        LOGGER.error(f"Failed to fetch AQI data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch AQI data: {str(e)}")