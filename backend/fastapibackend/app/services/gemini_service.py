"""Gemini API service for AQI data."""

import json
import logging
import re
from typing import Dict, List

import httpx
from fastapi import HTTPException

LOGGER = logging.getLogger(__name__)


async def fetch_aqi_from_gemini(
    police_stations: List[str],
    gemini_api_key: str,
    gemini_api_url: str
) -> Dict[str, float]:
    """Fetch AQI values for Delhi police stations using Gemini API.
    
    Args:
        police_stations: List of police station names
        gemini_api_key: Gemini API key
        gemini_api_url: Gemini API endpoint URL
        
    Returns:
        Dictionary mapping police station names to AQI values
    """
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")
    
    # Create a detailed prompt for Gemini
    prompt = f"""You are an environmental data assistant. Provide Air Quality Index (AQI) values for Delhi police station areas.

Police stations: {', '.join(police_stations[:10])}{"... and " + str(len(police_stations) - 10) + " more" if len(police_stations) > 10 else ""}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no code blocks.

Format (use this EXACT structure):
{{"station_name": {{"aqi": 150, "category": "Unhealthy"}}, "another_station": {{"aqi": 180, "category": "Unhealthy"}}}}

Rules:
1. Use lowercase station names matching input exactly
2. AQI range: 50-300 (typical Delhi values)
3. Valid JSON only - no trailing commas
4. Include all {len(police_stations)} stations

Respond with JSON only:"""
    
    request_body = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": 4096,
        }
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{gemini_api_url}?key={gemini_api_key}",
                json=request_body,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code != 200:
                LOGGER.error(f"Gemini API error: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Gemini API request failed: {response.text}"
                )
            
            result = response.json()
            
            # Extract text from Gemini response
            candidates = result.get("candidates", [])
            if not candidates:
                LOGGER.error(f"No candidates in Gemini response: {result}")
                raise HTTPException(status_code=502, detail="No response from Gemini API")
            
            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            
            # Check if parts exist and have text
            if not parts:
                LOGGER.error(f"No parts in Gemini response: {content}")
                raise HTTPException(status_code=502, detail="Empty response from Gemini API")
            
            # Handle both dict and list formats for parts
            if isinstance(parts, list):
                if len(parts) == 0:
                    LOGGER.error("Empty parts list in Gemini response")
                    raise HTTPException(status_code=502, detail="Empty response from Gemini API")
                text_response = parts[0].get("text", "")
            elif isinstance(parts, dict):
                text_response = parts.get("text", "")
            else:
                LOGGER.error(f"Unexpected parts format: {type(parts)}")
                raise HTTPException(status_code=502, detail="Invalid response format from Gemini API")
            
            if not text_response:
                LOGGER.error(f"No text in Gemini response parts: {parts}")
                raise HTTPException(status_code=502, detail="Empty text in Gemini response")
            
            # Parse JSON from response (handle markdown code blocks if present)
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', text_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to extract JSON object directly
                json_match = re.search(r'\{.*\}', text_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = text_response
            
            # Clean up common JSON formatting issues
            json_str = json_str.strip()
            # Remove trailing commas before closing braces
            json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
            # Fix missing quotes around property names
            json_str = re.sub(r'(\w+)(\s*:\s*)', r'"\1"\2', json_str)
            # Fix already quoted property names (avoid double quotes)
            json_str = re.sub(r'""(\w+)""', r'"\1"', json_str)
            
            try:
                aqi_data = json.loads(json_str)
            except json.JSONDecodeError as parse_error:
                # If strict parsing fails, try a more lenient approach
                LOGGER.warning(f"Strict JSON parsing failed, attempting lenient parsing. Error: {parse_error}")
                LOGGER.debug(f"Problematic JSON string: {json_str[:500]}...")
                
                # Fallback: Use default AQI values
                LOGGER.warning("Using default AQI values due to parse failure")
                result_dict = {station: 150.0 for station in police_stations}
                return result_dict
            
            # Convert to simple dict of station -> aqi value
            result_dict = {}
            for station, data in aqi_data.items():
                if isinstance(data, dict) and "aqi" in data:
                    result_dict[station] = float(data["aqi"])
                elif isinstance(data, (int, float)):
                    result_dict[station] = float(data)
            
            # Ensure all requested stations have values
            for station in police_stations:
                if station not in result_dict:
                    result_dict[station] = 150.0  # Default value
            
            return result_dict
            
        except json.JSONDecodeError as e:
            LOGGER.error(f"Failed to parse Gemini response: {e}\nResponse text: {text_response if 'text_response' in locals() else 'N/A'}")
            # Return default values instead of failing
            LOGGER.warning("Returning default AQI values (150.0) for all stations")
            return {station: 150.0 for station in police_stations}
        except HTTPException:
            raise
        except Exception as e:
            LOGGER.error(f"Gemini API error: {e}")
            raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")


def categorize_aqi(aqi: float) -> str:
    """Categorize AQI value into standard categories."""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    else:
        return "Hazardous"
