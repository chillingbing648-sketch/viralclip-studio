from typing import Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from backend.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])


class UpdateWeightsRequest(BaseModel):
    hook: Optional[float] = None
    emotion: Optional[float] = None
    entertainment: Optional[float] = None
    context: Optional[float] = None
    editing_potential: Optional[float] = None


@router.get("")
async def get_system_settings():
    """Retrieve system configuration, weights, and model settings."""
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ffmpeg_bin": settings.FFMPEG_BIN,
        "ffprobe_bin": settings.FFPROBE_BIN,
        "whisper_model": settings.WHISPER_MODEL_SIZE,
        "whisper_device": settings.WHISPER_DEVICE,
        "llm_provider": settings.LLM_PROVIDER,
        "scoring_weights": {
            "hook": settings.WEIGHT_HOOK,
            "emotion": settings.WEIGHT_EMOTION,
            "entertainment": settings.WEIGHT_ENTERTAINMENT,
            "context": settings.WEIGHT_CONTEXT,
            "editing_potential": settings.WEIGHT_EDITING
        },
        "score_tiers": {
            "priority": settings.SCORE_TIER_PRIORITY,
            "strong": settings.SCORE_TIER_STRONG,
            "possible": settings.SCORE_TIER_POSSIBLE
        },
        "target_specs": {
            "width": settings.TARGET_WIDTH,
            "height": settings.TARGET_HEIGHT,
            "fps": settings.TARGET_FPS,
            "default_preset": settings.DEFAULT_PRESET
        }
    }


@router.patch("/weights")
async def update_scoring_weights(req: UpdateWeightsRequest):
    """Dynamically update viral scoring weights."""
    if req.hook is not None:
        settings.WEIGHT_HOOK = req.hook
    if req.emotion is not None:
        settings.WEIGHT_EMOTION = req.emotion
    if req.entertainment is not None:
        settings.WEIGHT_ENTERTAINMENT = req.entertainment
    if req.context is not None:
        settings.WEIGHT_CONTEXT = req.context
    if req.editing_potential is not None:
        settings.WEIGHT_EDITING = req.editing_potential

    return {
        "message": "Viral scoring weights updated successfully",
        "current_weights": {
            "hook": settings.WEIGHT_HOOK,
            "emotion": settings.WEIGHT_EMOTION,
            "entertainment": settings.WEIGHT_ENTERTAINMENT,
            "context": settings.WEIGHT_CONTEXT,
            "editing_potential": settings.WEIGHT_EDITING
        }
    }
