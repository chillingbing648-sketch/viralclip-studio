import os
import uuid
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import LiveFeedSession, SourceVideo
from backend.ingestion.live_feed import LiveFeedManager
from backend.ingestion.source_manager import extract_media_metadata, generate_video_thumbnail

router = APIRouter(prefix="/live", tags=["Live Clipping"])

# In-memory dictionary of running live managers
ACTIVE_LIVE_MANAGERS: Dict[str, LiveFeedManager] = {}


class StartLiveSessionRequest(BaseModel):
    feed_name: str
    feed_url: str
    segment_duration: int = 30  # seconds per chunk


class ClipLiveSegmentRequest(BaseModel):
    start_sec: float
    end_sec: float
    title: str = "Live Stream Highlight"


@router.post("/start")
async def start_live_session(
    req: StartLiveSessionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start rolling buffer capture on an authorized RTMP, HLS, or prerecorded stream."""
    session_id = str(uuid.uuid4())
    manager = LiveFeedManager(
        session_id=session_id,
        feed_url=req.feed_url,
        feed_name=req.feed_name,
        segment_duration=req.segment_duration
    )

    res = manager.start_recording()
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=f"Failed to start live stream recording: {res.get('error')}")

    ACTIVE_LIVE_MANAGERS[session_id] = manager

    db_session = LiveFeedSession(
        id=session_id,
        feed_name=req.feed_name,
        feed_url=req.feed_url,
        status="streaming",
        rolling_buffer_minutes=30,
        total_chunks_processed=0,
        detected_moments_count=0
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)

    return {
        "session_id": session_id,
        "feed_name": req.feed_name,
        "status": "streaming",
        "segment_duration": req.segment_duration,
        "message": "Live rolling buffer capture started."
    }


@router.get("/sessions")
async def list_live_sessions(db: AsyncSession = Depends(get_db)):
    """List all live clipping sessions."""
    res = await db.execute(select(LiveFeedSession).order_by(LiveFeedSession.created_at.desc()))
    return res.scalars().all()


@router.get("/sessions/{session_id}/segments")
async def get_live_segments(session_id: str):
    """Scan and retrieve available rolling segments for an active live session."""
    manager = ACTIVE_LIVE_MANAGERS.get(session_id)
    if not manager:
        # Check if dir exists on disk
        from backend.config import LIVE_BUFFER_DIR
        s_dir = LIVE_BUFFER_DIR / session_id
        if not s_dir.exists():
            raise HTTPException(status_code=404, detail="Live session not found")
        manager = LiveFeedManager(session_id, "", "", 30)

    new_segments = manager.scan_new_segments()
    return {
        "session_id": session_id,
        "active": manager.is_active,
        "total_segments": len(manager.segments),
        "segments": manager.segments
    }


@router.post("/sessions/{session_id}/clip")
async def clip_from_live_session(
    session_id: str,
    req: ClipLiveSegmentRequest,
    db: AsyncSession = Depends(get_db)
):
    """Extract a selected timestamp range from the rolling buffer and create a SourceVideo."""
    manager = ACTIVE_LIVE_MANAGERS.get(session_id)
    if not manager:
        manager = LiveFeedManager(session_id, "", "", 30)
        manager.scan_new_segments()

    assembled_path = manager.assemble_range_into_video(req.start_sec, req.end_sec, req.title)
    if not assembled_path or not os.path.exists(assembled_path):
        raise HTTPException(
            status_code=400,
            detail="Could not assemble requested live range. Ensure selected footage is fully buffered."
        )

    meta = extract_media_metadata(assembled_path)
    thumb_path = generate_video_thumbnail(assembled_path, 1.0)
    file_size = os.path.getsize(assembled_path)

    # Register as SourceVideo
    source_obj = SourceVideo(
        source_type="live_feed",
        title=req.title,
        creator_name="Live Streamer",
        file_path=assembled_path,
        thumbnail_path=thumb_path,
        duration_seconds=meta["duration"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        bitrate=meta["bitrate"],
        video_codec=meta["video_codec"],
        audio_codec=meta["audio_codec"],
        file_size_bytes=file_size,
        rights_status="authorized",
        rights_notes="Captured from authorized live stream feed.",
        status="ready"
    )
    db.add(source_obj)
    await db.commit()
    await db.refresh(source_obj)

    return {
        "message": "Live range extracted and registered as source video ready for AI clipping.",
        "source": source_obj
    }


@router.post("/sessions/{session_id}/stop")
async def stop_live_session(session_id: str, db: AsyncSession = Depends(get_db)):
    """Stop active live session."""
    manager = ACTIVE_LIVE_MANAGERS.get(session_id)
    if manager:
        manager.stop_recording()
        del ACTIVE_LIVE_MANAGERS[session_id]

    res = await db.execute(select(LiveFeedSession).where(LiveFeedSession.id == session_id))
    sess = res.scalar_one_or_none()
    if sess:
        sess.status = "stopped"
        await db.commit()

    return {"session_id": session_id, "status": "stopped"}
