"""Safe routing endpoint for OpenRouteService integration."""

from __future__ import annotations

import logging
from typing import Any, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

from ..services.safety_area_service import get_safety_polygons
from ..services.routing_service import (
    resolve_point,
    build_avoid_multipolygon,
    build_ors_payload,
    call_ors,
)

LOGGER = logging.getLogger(__name__)

router = APIRouter(tags=["routing"])


class SafeRouteRequest(BaseModel):
    start: Any
    end: Any
    profile: str = "foot-walking"
    avoid_risk_levels: List[str] = Field(default_factory=lambda: ["forbidden"])

    @field_validator("profile")
    @classmethod
    def ensure_profile(cls, value: str) -> str:
        if not value:
            raise ValueError("profile is required")
        return value

    @field_validator("avoid_risk_levels")
    @classmethod
    def normalize_risk_levels(cls, value: List[str]) -> List[str]:
        if not value:
            return ["forbidden"]
        return [lvl.lower().strip() for lvl in value if lvl]


def point_in_polygon(point: List[float], polygon: List[List[float]]) -> bool:
    """
    Ray-casting algorithm to check if point is inside polygon.
    Point: [lat, lng]
    Polygon: [[lng, lat], [lng, lat], ...]
    """
    lat, lng = point[0], point[1]
    n = len(polygon)
    inside = False
    
    p1_lng, p1_lat = polygon[0]
    for i in range(1, n + 1):
        p2_lng, p2_lat = polygon[i % n]
        if lat > min(p1_lat, p2_lat):
            if lat <= max(p1_lat, p2_lat):
                if lng <= max(p1_lng, p2_lng):
                    if p1_lat != p2_lat:
                        xinters = (lat - p1_lat) * (p2_lng - p1_lng) / (p2_lat - p1_lat) + p1_lng
                    if p1_lng == p2_lng or lng <= xinters:
                        inside = not inside
        p1_lng, p1_lat = p2_lng, p2_lat
    
    return inside


def check_point_in_forbidden_zones(point_coords: List[float], safety_polygons: dict, avoid_risk_levels: List[str]) -> bool:
    """Check if a point is inside any forbidden zone that should be avoided."""
    try:
        for feature in safety_polygons.get("features", []):
            props = feature.get("properties", {})
            risk_level = (props.get("risk_level") or "").lower().strip()
            
            if risk_level in [lvl.lower() for lvl in avoid_risk_levels]:
                geometry = feature.get("geometry", {})
                geom_type = geometry.get("type")
                coords = geometry.get("coordinates")
                
                if not coords:
                    continue
                
                try:
                    if geom_type == "Polygon":
                        # coords[0] is the outer ring
                        if point_in_polygon(point_coords, coords[0]):
                            return True
                    elif geom_type == "MultiPolygon":
                        for poly_coords in coords:
                            # poly_coords[0] is the outer ring of each polygon
                            if point_in_polygon(point_coords, poly_coords[0]):
                                return True
                except Exception:
                    continue
        
        return False
    except Exception:
        return False


@router.post("/safe-route")
async def safe_route(request: SafeRouteRequest):
    start_coords = await resolve_point(request.start, "start")
    end_coords = await resolve_point(request.end, "end")

    if start_coords == end_coords:
        raise HTTPException(status_code=400, detail="start and end cannot be the same point")

    safety_polygons = await get_safety_polygons()
    if not safety_polygons.get("features"):
        raise HTTPException(status_code=503, detail="Safety polygons unavailable")

    # Check if start or end point is in a forbidden zone
    start_in_forbidden = check_point_in_forbidden_zones(start_coords, safety_polygons, request.avoid_risk_levels)
    end_in_forbidden = check_point_in_forbidden_zones(end_coords, safety_polygons, request.avoid_risk_levels)
    
    # If start or end is in forbidden zone, don't avoid those zones (allows routing through them)
    effective_avoid_levels = request.avoid_risk_levels
    if start_in_forbidden or end_in_forbidden:
        LOGGER.warning(
            "Start or end point is in forbidden zone - removing from avoid list to enable routing"
        )
        effective_avoid_levels = []

    # Build MultiPolygon geometry for ORS (NOT FeatureCollection)
    # Returns None if no polygons to avoid
    avoid_multipolygon = build_avoid_multipolygon(safety_polygons, effective_avoid_levels)
    num_avoid_polygons = 0
    if avoid_multipolygon and avoid_multipolygon.get("coordinates"):
        num_avoid_polygons = len(avoid_multipolygon["coordinates"])
    
    LOGGER.info(
        "Safe-route request profile=%s start=%s end=%s avoid_levels=%s avoid_polygons=%d",
        request.profile,
        start_coords,
        end_coords,
        effective_avoid_levels,
        num_avoid_polygons,
    )
    
    ors_payload = build_ors_payload(start_coords, end_coords, avoid_multipolygon, request.profile)

    try:
        ors_response = await call_ors(request.profile, ors_payload)
    except HTTPException as e:
        # Fallback: If routing fails with avoid polygons, try without them
        if num_avoid_polygons > 0 and e.status_code in [400, 404, 413, 504]:
            LOGGER.warning(
                "Routing with avoid polygons failed, retrying without avoidance zones"
            )
            fallback_payload = build_ors_payload(start_coords, end_coords, None, request.profile)
            ors_response = await call_ors(request.profile, fallback_payload)
            ors_response["metadata"] = {
                "profile": request.profile,
                "avoid_risk_levels": [],
                "avoid_polygons_count": 0,
                "fallback_used": True,
                "fallback_reason": "Routing with avoid zones failed"
            }
            return ors_response
        else:
            raise
    
    # Add metadata to response
    ors_response["metadata"] = {
        "profile": request.profile,
        "avoid_risk_levels": effective_avoid_levels,
        "avoid_polygons_count": num_avoid_polygons,
        "fallback_used": False
    }
    return ors_response