from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Sequence

import httpx
from fastapi import HTTPException

from ..config import get_settings

LOGGER = logging.getLogger(__name__)

CoordinateValue = Sequence[float] | Dict[str, float] | str


async def geocode_location(location: str) -> Dict[str, float | str]:
    if not location or not location.strip():
        LOGGER.error("Geocode called with empty location")
        raise HTTPException(status_code=400, detail="location parameter required")

    LOGGER.info(f"Geocoding location: {location}")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": location,
                    "format": "json",
                    "limit": 1,
                    "countrycodes": "in",
                },
                headers={"User-Agent": "SentrySafety/1.0"},
            )
    except httpx.RequestError as exc:
        LOGGER.error("Geocoding request error: %s", exc, exc_info=True)
        raise HTTPException(status_code=503, detail="Geocoding service unavailable") from exc

    if response.status_code != 200:
        LOGGER.error("Geocoding service error %s: %s", response.status_code, response.text[:200])
        raise HTTPException(status_code=502, detail="Geocoding service error")

    results = response.json()
    if not results:
        LOGGER.warning(f"No results found for location: {location}")
        raise HTTPException(status_code=404, detail=f"Location not found: {location}")

    result = results[0]
    geocoded = {
        "lat": float(result["lat"]),
        "lng": float(result["lon"]),
        "display_name": result.get("display_name", location),
        "location": location,
    }
    LOGGER.info(f"Geocoded {location} to {geocoded['lat']}, {geocoded['lng']}")
    return geocoded


def _ensure_coordinate_pair(value: Sequence[float], label: str) -> List[float]:
    if len(value) != 2:
        raise HTTPException(status_code=400, detail=f"{label} must contain two floats [lat, lng]")

    try:
        lat = float(value[0])
        lng = float(value[1])
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"{label} must contain numeric coordinates") from exc

    if not -90.0 <= lat <= 90.0:
        raise HTTPException(status_code=400, detail=f"{label} latitude must be between -90 and 90")
    if not -180.0 <= lng <= 180.0:
        raise HTTPException(status_code=400, detail=f"{label} longitude must be between -180 and 180")

    return [lat, lng]


async def resolve_point(value: CoordinateValue, label: str) -> List[float]:
    if isinstance(value, str):
        geo = await geocode_location(value)
        return [float(geo["lat"]), float(geo["lng"])]

    if isinstance(value, dict) and {"lat", "lng"}.issubset(value.keys()):
        return _ensure_coordinate_pair([value["lat"], value["lng"]], label)

    if isinstance(value, Sequence):
        return _ensure_coordinate_pair(value, label)

    raise HTTPException(status_code=400, detail=f"{label} must be [lat, lng], {{lat,lng}}, or a location name")


def _bisect_bbox(coords: list[list[float]]) -> list[list[float]] | None:
    if not coords:
        return None
    try:
        lons = [point[0] for point in coords]
        lats = [point[1] for point in coords]
    except (TypeError, IndexError):
        return None

    min_lng, max_lng = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    return [
        [round(min_lng, 5), round(min_lat, 5)],
        [round(max_lng, 5), round(min_lat, 5)],
        [round(max_lng, 5), round(max_lat, 5)],
        [round(min_lng, 5), round(max_lat, 5)],
        [round(min_lng, 5), round(min_lat, 5)],
    ]


def build_avoid_multipolygon(
    safety_polygons: Dict[str, Any], avoid_risk_levels: list[str], limit: int = 30
) -> Dict[str, Any] | None:
    polygon_rings = []

    LOGGER.info(f"Building avoid polygons for risk levels: {avoid_risk_levels}")
    
    for feature in safety_polygons.get("features", []):
        if len(polygon_rings) >= limit:
            break

        props = feature.get("properties", {})
        risk_level = (props.get("risk_level") or "").lower().strip()
        if risk_level not in {lvl.lower() for lvl in avoid_risk_levels}:
            continue

        geometry = feature.get("geometry") or {}
        geom_type = geometry.get("type")
        coords = geometry.get("coordinates")
        if not coords:
            continue

        # Handle Polygon: coords is [outer_ring, ...holes]
        if geom_type == "Polygon":
            # Simplify outer ring to bounding box
            bbox = _bisect_bbox(coords[0])
            if bbox and len(bbox) >= 4:
                # Verify ring is closed
                if bbox[0] == bbox[-1]:
                    # MultiPolygon expects [ [outer_ring] ] for each polygon
                    polygon_rings.append([bbox])
                else:
                    LOGGER.warning(f"Skipping unclosed polygon ring from {props.get('station_name')}")
        
        # Handle MultiPolygon: coords is [ [[outer_ring, ...holes]], ... ]
        elif geom_type == "MultiPolygon":
            for poly in coords:
                if len(polygon_rings) >= limit:
                    break
                # poly[0] is the outer ring of this sub-polygon
                bbox = _bisect_bbox(poly[0])
                if bbox and len(bbox) >= 4:
                    # Verify ring is closed
                    if bbox[0] == bbox[-1]:
                        polygon_rings.append([bbox])
                    else:
                        LOGGER.warning(f"Skipping unclosed polygon ring from {props.get('station_name')}")

    LOGGER.info(f"Built {len(polygon_rings)} avoid polygon(s)")
    
    # If no polygons, return None (caller won't add avoid_polygons to request)
    if not polygon_rings:
        return None

    # Return MultiPolygon geometry (NOT FeatureCollection)
    return {
        "type": "MultiPolygon",
        "coordinates": polygon_rings
    }


def build_ors_payload(
    start: List[float], end: List[float], avoid_multipolygon: Dict[str, Any] | None, profile: str
) -> Dict[str, Any]:
    """Build ORS API payload with MultiPolygon avoid geometry."""
    # Convert [lat, lng] to [lng, lat] for ORS
    start_lnglat = [round(start[1], 6), round(start[0], 6)]
    end_lnglat = [round(end[1], 6), round(end[0], 6)]

    payload = {
        "coordinates": [start_lnglat, end_lnglat],
        "preference": "recommended",
        "units": "m",
        "language": "en",
        "geometry": True,
        "instructions": True,
        "elevation": False,
        "radiuses": [1000, 1000],  # Increase search radius to 1000m for finding routable points
    }
    
    # Only add options with avoid_polygons if we have valid MultiPolygon geometry
    # None means no avoidance zones - don't add options at all
    if avoid_multipolygon is not None:
        if avoid_multipolygon.get("type") == "MultiPolygon":
            coords = avoid_multipolygon.get("coordinates", [])
            if coords and len(coords) > 0:
                # Validate: ensure no empty polygons
                valid_coords = [poly for poly in coords if poly and len(poly) > 0]
                if valid_coords:
                    payload["options"] = {
                        "avoid_polygons": {
                            "type": "MultiPolygon",
                            "coordinates": valid_coords
                        }
                    }
                    LOGGER.debug(f"Added {len(valid_coords)} avoid polygon(s) to ORS payload")
    
    return payload


async def call_ors(profile: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Execute OpenRouteService request with logging and error handling."""
    settings = get_settings()
    if not settings.ors_api_key:
        raise HTTPException(status_code=500, detail="ORS API key not configured")

    url = f"{settings.ors_api_url}/{profile}/geojson"
    headers = {
        "Authorization": settings.ors_api_key,
        "Content-Type": "application/json",
    }

    avoid_polygons = payload.get("options", {}).get("avoid_polygons")
    avoid_count = 0
    if avoid_polygons and avoid_polygons.get("type") == "MultiPolygon":
        avoid_count = len(avoid_polygons.get("coordinates", []))
    
    LOGGER.info(
        "Calling ORS profile=%s start=%s end=%s avoid_polygons=%d",
        profile,
        payload["coordinates"][0],
        payload["coordinates"][1],
        avoid_count,
    )
    
    # Debug logging disabled for production

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:  # Reduced timeout to 15s
            response = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        LOGGER.error("ORS request timed out after 15s")
        raise HTTPException(status_code=504, detail="Routing request timed out. Try reducing avoid zones or simplifying the route.") from exc
    except httpx.RequestError as exc:
        LOGGER.error("ORS request error: %s", exc)
        raise HTTPException(status_code=503, detail="Routing service temporarily unavailable") from exc

    if response.status_code == 413:
        LOGGER.error("ORS payload rejected with 413")
        raise HTTPException(status_code=413, detail="ORS request too large, try fewer avoid polygons")

    if response.status_code >= 400:
        error_text = response.text
        LOGGER.error("ORS error %s: %s", response.status_code, error_text[:800])
        
        # Better error message for common issues
        if "Could not find routable point" in error_text:
            detail = "Cannot find route: Start or destination is not near any roads. Please choose a location closer to a road or landmark."
        elif "2010" in error_text:
            detail = "The specified location is not accessible by the selected travel mode. Try a different location or travel profile."
        else:
            detail = f"ORS routing failed: {error_text[:200]}"
        
        raise HTTPException(status_code=response.status_code, detail=detail)

    LOGGER.info("ORS route successful: %d features", len(response.json().get("features", [])))
    return response.json()
