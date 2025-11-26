"""Gemini API service for AQI data."""

import asyncio
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
    gemini_api_url: str,
    batch_size: int = 5,  # Reduced batch size to avoid rate limits
    max_retries: int = 3,
    initial_backoff: float = 2.0,  # Increased backoff
    request_delay: float = 1.0,  # Delay between requests
) -> Dict[str, float]:
    """Fetch AQI values for Delhi police stations using Gemini API.

    This function splits the station list into smaller batches to avoid sending an
    oversized prompt to the model, retries with exponential backoff on transient
    failures, respects rate limits with proper delays, and merges the results
    into a single mapping station->aqi.

    Args:
        police_stations: List of police station names (strings)
        gemini_api_key: Gemini API key
        gemini_api_url: Gemini API endpoint URL
        batch_size: Number of stations per request to Gemini (default: 5)
        max_retries: Number of times to retry a failing request (default: 3)
        initial_backoff: Initial backoff in seconds for retries (default: 2.0)
        request_delay: Delay in seconds between batch requests (default: 1.0)

    Returns:
        Dictionary mapping police station names to AQI values (float)
    """

    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured.")

    # Normalize stations list to strings
    stations = [str(s).strip() for s in police_stations]

    # Prepare result dict with default values; we'll overwrite where we get results
    merged_results: Dict[str, float] = {s: 150.0 for s in stations}

    async def call_gemini_for_batch(batch: List[str]) -> Dict[str, float]:
        """Call Gemini for a batch of stations and return mapping station->aqi."""

        # Simplified prompt that's more likely to return valid JSON
        batch_list_text = ', '.join(f'"{s}"' for s in batch)
        prompt = (
            "For the following Delhi police stations, provide ONLY a JSON object with AQI values.\n"
            f"Stations: {batch_list_text}\n\n"
            "Response format: {\"station1\": 120, \"station2\": 85}\n"
            "Use only numbers 50-300 for AQI values. Return ONLY the JSON object."
        )

        request_body = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.1,  # Lower temperature for more consistent output
                "topK": 20,
                "topP": 0.8,
                "maxOutputTokens": 256,  # Reduced for shorter, cleaner responses
            }
        }

        attempt = 0
        backoff = initial_backoff
        last_exc = None

        while attempt < max_retries:
            attempt += 1
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(
                        f"{gemini_api_url}?key={gemini_api_key}",
                        json=request_body,
                        headers={"Content-Type": "application/json"},
                    )

                if resp.status_code != 200:
                    LOGGER.warning(
                        "Gemini batch request failed (status %s): %s",
                        resp.status_code,
                        resp.text[:500],
                    )
                    
                    # Handle rate limiting specifically
                    if resp.status_code == 429:
                        # Extract retry-after from response if available
                        retry_after = 60  # default fallback
                        try:
                            error_data = resp.json()
                            message = error_data.get("error", {}).get("message", "")
                            # Extract retry time from message like "Please retry in 9.896051981s"
                            import re
                            retry_match = re.search(r'retry in ([\d.]+)s', message)
                            if retry_match:
                                retry_after = float(retry_match.group(1))
                        except Exception:
                            pass
                        
                        LOGGER.info("Rate limited, waiting %s seconds", retry_after)
                        await asyncio.sleep(retry_after)
                        backoff = initial_backoff  # Reset backoff after rate limit wait
                        continue
                    
                    last_exc = HTTPException(status_code=resp.status_code, detail="Gemini API request failed")
                    # Retry for 5xx errors
                    if 500 <= resp.status_code < 600:
                        await asyncio.sleep(backoff)
                        backoff *= 2
                        continue
                    raise last_exc

                result = resp.json()

                # Extract candidate text safely
                candidates = result.get("candidates", [])
                if not candidates:
                    raise ValueError("No candidates in Gemini response")

                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                if isinstance(parts, list) and parts:
                    text_response = parts[0].get("text", "")
                elif isinstance(parts, dict):
                    text_response = parts.get("text", "")
                else:
                    text_response = str(content)

                if not text_response:
                    raise ValueError("Empty text response from Gemini")

                # Extract JSON substring with improved parsing
                json_str = None
                
                # Try multiple extraction methods
                # 1. Look for json code block
                json_match = re.search(r'```json\s*(\{[\s\S]*?\})\s*```', text_response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1).strip()
                
                # 2. Look for any JSON object
                if not json_str:
                    json_match = re.search(r'(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})', text_response, re.DOTALL)
                    if json_match:
                        json_str = json_match.group(1).strip()
                
                # 3. Try to extract from the entire response if it looks like JSON
                if not json_str and text_response.strip().startswith('{'):
                    json_str = text_response.strip()

                if not json_str:
                    raise ValueError("No JSON found in Gemini response")

                # Multiple cleanup attempts for common JSON issues
                def clean_json(raw_json):
                    """Apply multiple cleaning strategies to fix malformed JSON."""
                    # Remove trailing commas
                    cleaned = re.sub(r',\s*(?=[}\]])', '', raw_json)
                    # Fix single quotes to double quotes
                    cleaned = re.sub(r"'([^']*)':", r'"\1":', cleaned)
                    # Ensure property names are quoted
                    cleaned = re.sub(r'(\w+):', r'"\1":', cleaned)
                    # Remove any trailing text after the closing brace
                    match = re.match(r'(\{.*?\})', cleaned, re.DOTALL)
                    if match:
                        cleaned = match.group(1)
                    return cleaned

                # Try to parse JSON with progressive cleanup
                parsed = None
                for attempt_clean in [False, True]:
                    try:
                        json_to_parse = clean_json(json_str) if attempt_clean else json_str
                        parsed = json.loads(json_to_parse)
                        break
                    except json.JSONDecodeError as e:
                        if attempt_clean:
                            LOGGER.warning("Failed to parse batch JSON after cleaning (len %d): %s", len(json_str), e)
                            # Last resort: try to extract key-value pairs manually
                            try:
                                parsed = {}
                                # Look for patterns like "station": 123 or "station": {"aqi": 123}
                                matches = re.findall(r'"([^"]+)":\s*(\d+(?:\.\d+)?)', json_to_parse)
                                for key, value in matches:
                                    parsed[key] = float(value)
                                if parsed:
                                    LOGGER.info("Recovered %d values using regex fallback", len(parsed))
                                    break
                            except Exception:
                                pass
                            raise

                if not parsed:
                    raise ValueError("Could not parse JSON response")

                # parsed expected to be mapping station -> numeric value
                batch_result: Dict[str, float] = {}
                for k, v in parsed.items():
                    # accept either numeric or {"aqi": val} format
                    if isinstance(v, dict) and "aqi" in v:
                        try:
                            batch_result[str(k).strip()] = float(v["aqi"])
                        except Exception:
                            LOGGER.debug("Non-numeric aqi for %s: %s", k, v)
                    elif isinstance(v, (int, float)):
                        batch_result[str(k).strip()] = float(v)

                # Ensure we return entries for the batch; if missing, they'll remain default
                return batch_result

            except Exception as exc:
                LOGGER.exception("Gemini batch attempt %s failed", attempt)
                last_exc = exc
                # If last attempt, break and return empty to let caller use defaults
                if attempt >= max_retries:
                    break
                await asyncio.sleep(backoff)
                backoff *= 2

        # If we reach here there was a persistent failure for this batch
        LOGGER.error("Gemini batch failed after %s attempts: %s", max_retries, last_exc)
        return {}

    # Process batches sequentially with delays to respect rate limits
    batches = [stations[i:i + batch_size] for i in range(0, len(stations), batch_size)]
    LOGGER.info("Processing %d batches of max %d stations each", len(batches), batch_size)

    for i, batch in enumerate(batches):
        if i > 0:  # Add delay between batches except for the first
            LOGGER.info("Waiting %s seconds before next batch...", request_delay)
            await asyncio.sleep(request_delay)
            
        LOGGER.info("Processing batch %d/%d with %d stations", i + 1, len(batches), len(batch))
        batch_result = await call_gemini_for_batch(batch)
        
        # Merge results, preserving defaults for missing entries
        for k, v in batch_result.items():
            # Use provided station key if exact match, otherwise try normalized match
            key = k
            if key not in merged_results:
                # attempt case-insensitive match
                found = next((s for s in merged_results.keys() if s.lower() == k.lower()), None)
                if found:
                    key = found
                else:
                    # unknown key; add it verbatim
                    merged_results[k] = v
                    continue
            merged_results[key] = v

    # Final sanity: ensure numeric values and clamp to reasonable AQI range
    for s in list(merged_results.keys()):
        try:
            val = float(merged_results[s])
            # clamp
            if val < 0:
                val = 0.0
            merged_results[s] = max(0.0, min(val, 1000.0))
        except Exception:
            merged_results[s] = 150.0

    return merged_results


def categorize_aqi(aqi_value: float) -> str:
    """Return a descriptive AQI category for a numeric AQI value.

    Categories follow common AQI bands. This helper exists for compatibility
    with other services that import it from this module.
    """
    try:
        aqi = float(aqi_value)
    except Exception:
        return "Unknown"

    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"