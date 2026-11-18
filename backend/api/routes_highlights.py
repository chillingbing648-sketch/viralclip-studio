import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import SourceVideo, Transcript, HighlightCandidate, ClipProject
from backend.detection.highlight_detector import HighlightDetector
from backend.config import settings

router = APIRouter(prefix="/highlights", tags=["Highlights"])
detector = HighlightDetector()


class AdjustCandidateRequest(BaseModel):
    start_time: float
    end_time: float
    hook: Optional[str] = None


class CandidateStatusRequest(BaseModel):
    status: str  # approved | rejected | candidate


@router.post("/detect/{source_id}")
async def detect_highlights_endpoint(
    source_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Run AI viral highlight detection across dialogue, emotion peaks, and scene changes."""
    src_res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    source_obj = src_res.scalar_one_or_none()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source video not found")

    tr_res = await db.execute(select(Transcript).where(Transcript.source_video_id == source_id))
    transcript_obj = tr_res.scalar_one_or_none()
    
    segments = []
    if transcript_obj and transcript_obj.segments_json:
        segments = json.loads(transcript_obj.segments_json)

    source_obj.status = "analyzing"
    await db.commit()

    try:
        # Detect candidate moments
        candidates_data = detector.detect_highlights(
            video_path=source_obj.file_path or "",
            transcript_segments=segments,
            total_duration=source_obj.duration_seconds
        )

        # Remove previous candidates for clean regeneration
        await db.execute(delete(HighlightCandidate).where(HighlightCandidate.source_video_id == source_id))

        saved_candidates = []
        for cand in candidates_data:
            c_obj = HighlightCandidate(
                source_video_id=source_id,
                start_time=cand["start_time"],
                end_time=cand["end_time"],
                duration=cand["duration"],
                hook=cand["hook"],
                reason=cand["reason"],
                category=cand["category"],
                hook_score=cand["scores"]["hook"],
                emotion_score=cand["scores"]["emotion"],
                entertainment_score=cand["scores"]["entertainment"],
                context_score=cand["scores"]["context"],
                editing_potential_score=cand["scores"]["editing_potential"],
                overall_score=cand["overall_score"],
                tier=cand["tier"],
                context_summary=cand["context_summary"],
                transcript_snippet=cand.get("transcript_snippet", ""),
                status="candidate"
            )
            db.add(c_obj)
            saved_candidates.append(c_obj)

        source_obj.status = "analyzed"
        await db.commit()

        # Refresh
        for c in saved_candidates:
            await db.refresh(c)

        return {
            "source_id": source_id,
            "total_candidates": len(saved_candidates),
            "candidates": saved_candidates
        }
    except Exception as e:
        source_obj.status = "ready"
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Highlight detection failed: {str(e)}")


@router.get("/{source_id}")
async def get_highlights_for_video(
    source_id: str,
    status: Optional[str] = None,
    tier: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve detected highlight candidates for a video."""
    query = select(HighlightCandidate).where(HighlightCandidate.source_video_id == source_id)
    if status:
        query = query.where(HighlightCandidate.status == status)
    if tier:
        query = query.where(HighlightCandidate.tier == tier)

    query = query.order_by(HighlightCandidate.overall_score.desc())
    res = await db.execute(query)
    return res.scalars().all()


@router.patch("/{candidate_id}/status")
async def update_candidate_status(
    candidate_id: str,
    req: CandidateStatusRequest,
    db: AsyncSession = Depends(get_db)
):
    """Approve or reject a highlight candidate."""
    res = await db.execute(select(HighlightCandidate).where(HighlightCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    cand.status = req.status
    await db.commit()
    await db.refresh(cand)
    return cand


@router.patch("/{candidate_id}/adjust")
async def adjust_candidate_timestamps(
    candidate_id: str,
    req: AdjustCandidateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Allow human adjustment of start_time and end_time."""
    res = await db.execute(select(HighlightCandidate).where(HighlightCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if req.end_time <= req.start_time:
        raise HTTPException(status_code=400, detail="end_time must be greater than start_time")

    cand.start_time = round(req.start_time, 2)
    cand.end_time = round(req.end_time, 2)
    cand.duration = round(req.end_time - req.start_time, 2)
    if req.hook:
        cand.hook = req.hook

    cand.status = "edited"
    await db.commit()
    await db.refresh(cand)
    return cand


@router.post("/{candidate_id}/create-project")
async def create_project_from_candidate(
    candidate_id: str,
    preset_name: str = Body("STREAMER_HYPE", embed=True),
    db: AsyncSession = Depends(get_db)
):
    """Convert approved candidate highlight into an interactive Clip Project."""
    res = await db.execute(select(HighlightCandidate).where(HighlightCandidate.id == candidate_id))
    cand = res.scalar_one_or_none()
    if not cand:
        raise HTTPException(status_code=404, detail="Candidate not found")

    # Mark candidate approved
    cand.status = "approved"

    project = ClipProject(
        source_video_id=cand.source_video_id,
        candidate_id=cand.id,
        title=cand.hook,
        preset_name=preset_name,
        start_time=cand.start_time,
        end_time=cand.end_time,
        crop_x_offset_pct=50.0,
        tracking_mode="face_tracker",
        enable_zooms=True,
        enable_captions=True,
        status="draft"
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project
