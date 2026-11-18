from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.db import get_db
from backend.analytics.analytics_service import AnalyticsService
from backend.editing.presets import PRESET_DEFINITIONS

router = APIRouter(prefix="/analytics", tags=["Analytics & Presets"])


@router.get("/dashboard")
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve real-time database dashboard statistics."""
    return await AnalyticsService.get_dashboard_metrics(db)


@router.get("/presets")
async def get_available_presets():
    """Retrieve all editing preset configurations."""
    return PRESET_DEFINITIONS
