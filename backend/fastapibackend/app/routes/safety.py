"""Safety area endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from ..services.safety_area_service import get_safety_polygons

LOGGER = logging.getLogger(__name__)

router = APIRouter(tags=["safety"])


@router.get("/safety-areas")
async def safety_areas(
    month: int | None = None,
    day: int | None = None,
    use_current_conditions: bool = True,
):
    try:
        data = await get_safety_polygons(month, day, use_current_conditions)
        if data.get("type") != "FeatureCollection":
            raise HTTPException(status_code=500, detail="Invalid safety polygon format")
        return data
    except HTTPException:
        raise
    except Exception as exc:
        LOGGER.error("Failed to load safety areas: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to load safety polygons") from exc
