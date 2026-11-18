import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import ClipProject, SourceVideo, Transcript, HighlightCandidate

router = APIRouter(prefix="/projects", tags=["Editor Projects"])


class UpdateProjectRequest(BaseModel):
    title: Optional[str] = None
    preset_name: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    crop_x_offset_pct: Optional[float] = None
    tracking_mode: Optional[str] = None
    enable_zooms: Optional[bool] = None
    zoom_intensity: Optional[float] = None
    enable_captions: Optional[bool] = None
    caption_style_json: Optional[str] = None
    sound_effects_enabled: Optional[bool] = None
    dead_air_removal_enabled: Optional[bool] = None


class CreateCustomProjectRequest(BaseModel):
    source_video_id: str
    title: str
    start_time: float
    end_time: float
    preset_name: str = "STREAMER_HYPE"
    tracking_mode: str = "face_tracker"
    crop_x_offset_pct: float = 50.0


@router.post("")
async def create_project(
    req: CreateCustomProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a new custom clip project directly from a source video."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == req.source_video_id))
    src = res.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Source video not found")

    if req.end_time <= req.start_time:
        raise HTTPException(status_code=400, detail="end_time must be greater than start_time")

    project = ClipProject(
        source_video_id=req.source_video_id,
        title=req.title,
        preset_name=req.preset_name,
        start_time=round(req.start_time, 2),
        end_time=round(req.end_time, 2),
        crop_x_offset_pct=req.crop_x_offset_pct,
        tracking_mode=req.tracking_mode,
        enable_zooms=True,
        enable_captions=True,
        status="draft"
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("")
async def list_projects(
    source_video_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all clip projects."""
    query = select(ClipProject).order_by(ClipProject.created_at.desc())
    if source_video_id:
        query = query.where(ClipProject.source_video_id == source_video_id)
    if status:
        query = query.where(ClipProject.status == status)

    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{project_id}")
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Get project details including source video and transcript synchronization data."""
    res = await db.execute(select(ClipProject).where(ClipProject.id == project_id))
    proj = res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    src_res = await db.execute(select(SourceVideo).where(SourceVideo.id == proj.source_video_id))
    src = src_res.scalar_one_or_none()

    tr_res = await db.execute(select(Transcript).where(Transcript.source_video_id == proj.source_video_id))
    transcript_obj = tr_res.scalar_one_or_none()

    segments = []
    if transcript_obj and transcript_obj.segments_json:
        segments = json.loads(transcript_obj.segments_json)

    # Filter segments within project start & end
    in_range_segments = [
        s for s in segments
        if s.get("end", 0.0) >= proj.start_time and s.get("start", 0.0) <= proj.end_time
    ]

    return {
        "project": proj,
        "source_video": src,
        "sync_transcript": in_range_segments,
        "full_transcript_count": len(segments)
    }


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    req: UpdateProjectRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update project editing properties (crop, zoom, captions, preset, timestamps)."""
    res = await db.execute(select(ClipProject).where(ClipProject.id == project_id))
    proj = res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    if req.title is not None:
        proj.title = req.title
    if req.preset_name is not None:
        proj.preset_name = req.preset_name
    if req.start_time is not None:
        proj.start_time = round(req.start_time, 2)
    if req.end_time is not None:
        proj.end_time = round(req.end_time, 2)
    if req.crop_x_offset_pct is not None:
        proj.crop_x_offset_pct = max(0.0, min(100.0, req.crop_x_offset_pct))
    if req.tracking_mode is not None:
        proj.tracking_mode = req.tracking_mode
    if req.enable_zooms is not None:
        proj.enable_zooms = req.enable_zooms
    if req.zoom_intensity is not None:
        proj.zoom_intensity = req.zoom_intensity
    if req.enable_captions is not None:
        proj.enable_captions = req.enable_captions
    if req.caption_style_json is not None:
        proj.caption_style_json = req.caption_style_json
    if req.sound_effects_enabled is not None:
        proj.sound_effects_enabled = req.sound_effects_enabled
    if req.dead_air_removal_enabled is not None:
        proj.dead_air_removal_enabled = req.dead_air_removal_enabled

    await db.commit()
    await db.refresh(proj)
    return proj


@router.post("/{project_id}/duplicate")
async def duplicate_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Duplicate an existing clip project."""
    res = await db.execute(select(ClipProject).where(ClipProject.id == project_id))
    orig = res.scalar_one_or_none()
    if not orig:
        raise HTTPException(status_code=404, detail="Original project not found")

    dup = ClipProject(
        source_video_id=orig.source_video_id,
        candidate_id=orig.candidate_id,
        title=f"{orig.title} (Copy)",
        preset_name=orig.preset_name,
        start_time=orig.start_time,
        end_time=orig.end_time,
        crop_x_offset_pct=orig.crop_x_offset_pct,
        tracking_mode=orig.tracking_mode,
        enable_zooms=orig.enable_zooms,
        zoom_intensity=orig.zoom_intensity,
        enable_captions=orig.enable_captions,
        caption_style_json=orig.caption_style_json,
        sound_effects_enabled=orig.sound_effects_enabled,
        dead_air_removal_enabled=orig.dead_air_removal_enabled,
        status="draft"
    )
    db.add(dup)
    await db.commit()
    await db.refresh(dup)
    return dup
