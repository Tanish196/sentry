"""Weather and AQI fetching service."""

import logging
from typing import Dict

import httpx
from fastapi import HTTPException

LOGGER = logging.getLogger(__name__)


async def fetch_weather_and_aqi(
    client: httpx.AsyncClient,
    city: str,
    openweather_api_key: str,
    weather_url: str,
    air_pollution_url: str
) -> Dict:
    """Fetch weather and AQI data from OpenWeatherMap API.
    
    Args:
        client: HTTP client instance
        city: City name
        openweather_api_key: OpenWeatherMap API key
        weather_url: Weather API endpoint
        air_pollution_url: Air pollution API endpoint
        
    Returns:
        Dictionary with weather data and AQI
    """
    if not openweather_api_key:
        raise HTTPException(status_code=500, detail="OPENWEATHER_API_KEY not configured.")

    weather_resp = await client.get(
        weather_url,
        params={"q": city, "appid": openweather_api_key, "units": "metric"},
    )
    if weather_resp.status_code != 200:
        raise HTTPException(
            status_code=weather_resp.status_code,
            detail=f"Weather lookup failed for {city}: {weather_resp.text}"
        )

    weather_data = weather_resp.json()
    coord = weather_data.get("coord") or {}
    lat, lon = coord.get("lat"), coord.get("lon")
    if lat is None or lon is None:
        raise HTTPException(
            status_code=502,
            detail=f"Weather data for {city} missing lat/lon"
        )

    aqi_resp = await client.get(
        air_pollution_url,
        params={"lat": lat, "lon": lon, "appid": openweather_api_key},
    )
    if aqi_resp.status_code != 200:
        raise HTTPException(
            status_code=aqi_resp.status_code,
            detail=f"AQI lookup failed for {city}: {aqi_resp.text}"
        )

    aqi_payload = aqi_resp.json()
    aqi_list = aqi_payload.get("list") or []
    if not aqi_list:
        raise HTTPException(status_code=502, detail=f"AQI payload empty for {city}")

    aqi_value = float(aqi_list[0].get("main", {}).get("aqi", 0))
    return {"weather": weather_data, "aqi": aqi_value}
