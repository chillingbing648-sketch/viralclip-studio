import json
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.db import get_db, SyncSessionLocal
from backend.database.models import SourceVideo, Transcript
from backend.transcription.transcriber import TranscriptionEngine

router = APIRouter(prefix="/transcripts", tags=["Transcription"])
engine = TranscriptionEngine()


def run_transcription_worker(video_id: str, video_path: str):
    """Background execution for faster-whisper transcription."""
    db = SyncSessionLocal()
    try:
        source_obj = db.query(SourceVideo).filter(SourceVideo.id == video_id).first()
        if not source_obj:
            return

        source_obj.status = "transcribing"
        db.commit()

        # Execute transcription
        result = engine.transcribe_video(video_path, video_id)

        # Check existing transcript
        existing = db.query(Transcript).filter(Transcript.source_video_id == video_id).first()
        if existing:
            existing.language = result["language"]
            existing.duration_seconds = result["duration_seconds"]
            existing.raw_text = result["raw_text"]
            existing.segments_json = json.dumps(result["segments"])
            existing.srt_path = result["srt_path"]
            existing.json_path = result["json_path"]
        else:
            t_obj = Transcript(
                source_video_id=video_id,
                language=result["language"],
                duration_seconds=result["duration_seconds"],
                raw_text=result["raw_text"],
                segments_json=json.dumps(result["segments"]),
                srt_path=result["srt_path"],
                json_path=result["json_path"]
            )
            db.add(t_obj)

        source_obj.status = "transcribed"
        db.commit()
    except Exception as e:
        db.rollback()
        source_obj = db.query(SourceVideo).filter(SourceVideo.id == video_id).first()
        if source_obj:
            source_obj.status = "failed"
            source_obj.error_message = f"Transcription error: {str(e)}"
            db.commit()
    finally:
        db.close()


@router.post("/start/{source_id}")
async def start_transcription(
    source_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Trigger faster-whisper AI transcription for a source video."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    source_obj = res.scalar_one_or_none()
    if not source_obj:
        raise HTTPException(status_code=404, detail="Source video not found")

    if not source_obj.file_path or not os.path.exists(source_obj.file_path):
        raise HTTPException(status_code=400, detail="Source media file is not available on disk")

    source_obj.status = "transcribing"
    await db.commit()

    background_tasks.add_task(run_transcription_worker, source_id, source_obj.file_path)

    return {
        "source_id": source_id,
        "status": "transcribing",
        "message": "AI Transcription job initiated in background."
    }


@router.get("/{source_id}")
async def get_transcript(source_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve full transcript segments and word-level timestamps."""
    res = await db.execute(select(Transcript).where(Transcript.source_video_id == source_id))
    transcript_obj = res.scalar_one_or_none()
    if not transcript_obj:
        raise HTTPException(status_code=404, detail="Transcript not found for this video")

    segments = json.loads(transcript_obj.segments_json) if transcript_obj.segments_json else []
    return {
        "id": transcript_obj.id,
        "source_video_id": transcript_obj.source_video_id,
        "language": transcript_obj.language,
        "duration_seconds": transcript_obj.duration_seconds,
        "raw_text": transcript_obj.raw_text,
        "segments": segments,
        "total_segments": len(segments),
        "srt_path": transcript_obj.srt_path,
        "json_path": transcript_obj.json_path
    }


@router.get("/{source_id}/search")
async def search_transcript_endpoint(
    source_id: str,
    q: str = Query(..., min_length=1, description="Phrase or keyword to search"),
    db: AsyncSession = Depends(get_db)
):
    """Search for phrases in transcript to jump directly to exact timestamps."""
    res = await db.execute(select(Transcript).where(Transcript.source_video_id == source_id))
    transcript_obj = res.scalar_one_or_none()
    if not transcript_obj:
        raise HTTPException(status_code=404, detail="Transcript not found")

    segments = json.loads(transcript_obj.segments_json) if transcript_obj.segments_json else []
    matches = engine.search_transcript(segments, q)
    return {
        "query": q,
        "total_matches": len(matches),
        "matches": matches
    }


@router.get("/{source_id}/export/srt")
async def export_srt_file(source_id: str, db: AsyncSession = Depends(get_db)):
    """Download standard SRT subtitle file."""
    res = await db.execute(select(Transcript).where(Transcript.source_video_id == source_id))
    transcript_obj = res.scalar_one_or_none()
    if not transcript_obj or not transcript_obj.srt_path or not os.path.exists(transcript_obj.srt_path):
        raise HTTPException(status_code=404, detail="SRT subtitle file not found")

    return FileResponse(
        path=transcript_obj.srt_path,
        media_type="text/plain",
        filename=f"transcript_{source_id}.srt"
    )
