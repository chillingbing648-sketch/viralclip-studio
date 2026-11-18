import os
import shutil
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import SourceVideo
from backend.ingestion.source_manager import process_local_upload, extract_media_metadata, generate_video_thumbnail
from backend.ingestion.youtube_metadata import extract_youtube_metadata_safe
from backend.config import ORIGINALS_DIR

router = APIRouter(prefix="/sources", tags=["Sources"])


class YouTubeImportRequest(BaseModel):
    url: str
    creator_name: Optional[str] = None
    rights_status: Optional[str] = "pending_review"
    rights_notes: Optional[str] = None


@router.post("/upload")
async def upload_local_video(
    file: UploadFile = File(...),
    creator_name: str = Form("Creator"),
    rights_status: str = Form("owner_provided"),
    rights_notes: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
):
    """Upload and ingest local video file (MP4, MOV, MKV, etc.)."""
    temp_dir = ORIGINALS_DIR / "temp"
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"upload_{uuid.uuid4().hex}_{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        proc_data = process_local_upload(
            source_file_path=str(temp_path),
            original_filename=file.filename or "video.mp4",
            creator_name=creator_name,
            rights_status=rights_status,
            rights_notes=rights_notes
        )
        if temp_path.exists():
            os.remove(temp_path)

        source_obj = SourceVideo(**proc_data)
        db.add(source_obj)
        await db.commit()
        await db.refresh(source_obj)
        return source_obj
    except Exception as e:
        if temp_path.exists():
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to process video upload: {str(e)}")


@router.post("/youtube-metadata")
async def import_youtube_url(
    req: YouTubeImportRequest,
    db: AsyncSession = Depends(get_db)
):
    """Import public YouTube video/stream metadata reference."""
    meta = extract_youtube_metadata_safe(req.url)
    if not meta.get("valid"):
        raise HTTPException(status_code=400, detail=meta.get("error", "Invalid YouTube URL"))

    creator = req.creator_name or meta.get("creator_name", "YouTube Creator")
    source_obj = SourceVideo(
        source_type="youtube",
        title=meta.get("title"),
        creator_name=creator,
        channel_name=meta.get("channel_name"),
        source_url=req.url,
        external_id=meta.get("video_id"),
        thumbnail_path=meta.get("thumbnail_url"),
        duration_seconds=meta.get("duration_seconds", 0.0),
        rights_status=req.rights_status or "pending_review",
        rights_notes=req.rights_notes or "YouTube URL reference registered. Awaiting creator media attachment.",
        status="pending"
    )
    db.add(source_obj)
    await db.commit()
    await db.refresh(source_obj)
    return {
        "source": source_obj,
        "source_access_status": meta.get("source_access_status"),
        "message": "YouTube reference imported. Attach authorized creator media file to initiate AI clipping."
    }


@router.post("/{source_id}/attach-media")
async def attach_creator_media(
    source_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Attach creator-provided local video file to an existing YouTube URL record."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    source_obj = res.scalar_one_or_none()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source record not found")

    ext = os.path.splitext(file.filename or ".mp4")[1].lower() or ".mp4"
    dest_path = ORIGINALS_DIR / f"{source_id}{ext}"

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    meta = extract_media_metadata(str(dest_path))
    thumb_path = generate_video_thumbnail(str(dest_path), 1.0)

    source_obj.file_path = str(dest_path)
    source_obj.thumbnail_path = thumb_path or source_obj.thumbnail_path
    source_obj.duration_seconds = meta["duration"] or source_obj.duration_seconds
    source_obj.width = meta["width"]
    source_obj.height = meta["height"]
    source_obj.fps = meta["fps"]
    source_obj.bitrate = meta["bitrate"]
    source_obj.video_codec = meta["video_codec"]
    source_obj.audio_codec = meta["audio_codec"]
    source_obj.file_size_bytes = file_size
    source_obj.rights_status = "authorized"
    source_obj.status = "ready"

    await db.commit()
    await db.refresh(source_obj)
    return source_obj


@router.get("")
async def list_sources(
    source_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all source videos with optional filters."""
    query = select(SourceVideo).order_by(SourceVideo.created_at.desc())
    if source_type:
        query = query.where(SourceVideo.source_type == source_type)
    if status:
        query = query.where(SourceVideo.status == status)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{source_id}")
async def get_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Get single source video details."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    source_obj = res.scalar_one_or_none()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source video not found")
    return source_obj


@router.delete("/{source_id}")
async def delete_source(source_id: str, db: AsyncSession = Depends(get_db)):
    """Delete source video and remove file from disk."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    source_obj = res.scalar_one_or_none()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source video not found")

    if source_obj.file_path and os.path.exists(source_obj.file_path):
        try:
            os.remove(source_obj.file_path)
        except Exception:
            pass

    await db.delete(source_obj)
    await db.commit()
    return {"message": "Source video deleted successfully", "id": source_id}
