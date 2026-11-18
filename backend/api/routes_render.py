import datetime
import json
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.db import get_db, SyncSessionLocal
from backend.database.models import ClipProject, RenderJob, SourceVideo, Transcript, CreatorRights
from backend.rendering.render_engine import RenderEngine
from backend.rights.rights_manager import RightsManager

router = APIRouter(prefix="/render", tags=["Rendering & Export"])
render_engine = RenderEngine()


class StartRenderRequest(BaseModel):
    target_platform: str = "youtube_shorts"  # youtube_shorts | instagram_reels


def run_render_worker(job_id: str, project_id: str, target_platform: str):
    """Synchronous background worker that executes the FFmpeg render and updates job state."""
    db = SyncSessionLocal()
    try:
        job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
        proj = db.query(ClipProject).filter(ClipProject.id == project_id).first()
        if not job or not proj:
            return

        source_video = db.query(SourceVideo).filter(SourceVideo.id == proj.source_video_id).first()
        if not source_video or not source_video.file_path or not os.path.exists(source_video.file_path):
            job.status = "failed"
            job.error_message = "Source video file missing from disk"
            db.commit()
            return

        # Fetch transcript segments if captions enabled
        transcript_obj = db.query(Transcript).filter(Transcript.source_video_id == proj.source_video_id).first()
        segments = []
        if transcript_obj and transcript_obj.segments_json:
            segments = json.loads(transcript_obj.segments_json)

        job.status = "processing"
        job.progress_pct = 5
        job.stage_description = "Starting render pipeline"
        job.started_at = datetime.datetime.utcnow()
        proj.status = "rendering"
        db.commit()

        def update_progress(pct: int, stage_desc: str):
            sub_db = SyncSessionLocal()
            try:
                j = sub_db.query(RenderJob).filter(RenderJob.id == job_id).first()
                if j:
                    j.progress_pct = pct
                    j.stage_description = stage_desc
                    sub_db.commit()
            finally:
                sub_db.close()

        # Render clip through RenderEngine
        result = render_engine.render_clip(
            source_video_path=source_video.file_path,
            start_time_sec=proj.start_time,
            end_time_sec=proj.end_time,
            preset_name=proj.preset_name,
            target_platform=target_platform,
            tracking_mode=proj.tracking_mode,
            crop_offset_pct=proj.crop_x_offset_pct,
            enable_captions=proj.enable_captions,
            transcript_segments=segments,
            enable_zooms=proj.enable_zooms,
            source_width=source_video.width or 1920,
            source_height=source_video.height or 1080,
            progress_callback=update_progress
        )

        job.status = "completed"
        job.progress_pct = 100
        job.stage_description = "Render completed and QC verified"
        job.output_path = result["output_path"]
        job.output_thumbnail_path = result["thumbnail_path"]
        job.duration_seconds = result["duration_seconds"]
        job.file_size_bytes = result["file_size_bytes"]
        job.qc_status = result["qc_status"]
        job.qc_notes = result["qc_notes"]
        job.completed_at = datetime.datetime.utcnow()

        proj.status = "rendered"
        proj.rendered_path = result["output_path"]
        proj.preview_path = result["thumbnail_path"]
        db.commit()

    except Exception as e:
        db.rollback()
        job = db.query(RenderJob).filter(RenderJob.id == job_id).first()
        proj = db.query(ClipProject).filter(ClipProject.id == project_id).first()
        if job:
            job.status = "failed"
            job.error_message = str(e)
            job.stage_description = "Render failed"
            db.commit()
        if proj:
            proj.status = "failed"
            db.commit()
    finally:
        db.close()


@router.post("/start/{project_id}")
async def start_render_job(
    project_id: str,
    req: StartRenderRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Initiate vertical 9:16 video render.
    Verifies rights clearance before queueing.
    """
    res = await db.execute(select(ClipProject).where(ClipProject.id == project_id))
    proj = res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    src_res = await db.execute(select(SourceVideo).where(SourceVideo.id == proj.source_video_id))
    src = src_res.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Associated source video not found")

    # Rights Clearance Verification
    rights_res = await db.execute(select(CreatorRights).where(CreatorRights.creator_name == src.creator_name))
    creator_rights = rights_res.scalar_one_or_none()

    clearance = RightsManager.verify_project_clearance(src, creator_rights)
    if not clearance["cleared"]:
        raise HTTPException(
            status_code=403,
            detail=f"Rendering Blocked by Rights Management: {clearance['reason']}"
        )

    # Create Render Job
    job = RenderJob(
        clip_project_id=project_id,
        target_platform=req.target_platform,
        preset_name=proj.preset_name,
        status="queued",
        progress_pct=0,
        stage_description="Queued for rendering"
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Queue background task
    background_tasks.add_task(run_render_worker, job.id, project_id, req.target_platform)

    return {
        "job_id": job.id,
        "project_id": project_id,
        "status": "queued",
        "preset": proj.preset_name,
        "target_platform": req.target_platform,
        "message": "Render job queued successfully."
    }


@router.get("/jobs")
async def list_render_jobs(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List rendering queue and historical render jobs."""
    query = select(RenderJob).order_by(RenderJob.created_at.desc())
    if status:
        query = query.where(RenderJob.status == status)

    res = await db.execute(query)
    return res.scalars().all()


@router.get("/jobs/{job_id}")
async def get_render_job(job_id: str, db: AsyncSession = Depends(get_db)):
    """Get single render job progress, QC status, and output path."""
    res = await db.execute(select(RenderJob).where(RenderJob.id == job_id))
    job = res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job


@router.get("/exports")
async def list_export_library(db: AsyncSession = Depends(get_db)):
    """Retrieve all successfully rendered and QC-passed clips in the Export Library."""
    query = (
        select(RenderJob, ClipProject)
        .join(ClipProject, RenderJob.clip_project_id == ClipProject.id)
        .where(RenderJob.status == "completed")
        .order_by(RenderJob.completed_at.desc())
    )
    res = await db.execute(query)
    items = []
    for job, proj in res.all():
        items.append({
            "job_id": job.id,
            "project_id": proj.id,
            "title": proj.title,
            "preset_name": job.preset_name,
            "target_platform": job.target_platform,
            "duration_seconds": job.duration_seconds,
            "file_size_bytes": job.file_size_bytes,
            "output_path": job.output_path,
            "thumbnail_path": job.output_thumbnail_path,
            "qc_status": job.qc_status,
            "qc_notes": job.qc_notes,
            "completed_at": job.completed_at
        })
    return items


@router.get("/exports/{job_id}/download")
async def download_rendered_export(job_id: str, db: AsyncSession = Depends(get_db)):
    """Download the completed vertical 1080x1920 MP4 file."""
    res = await db.execute(select(RenderJob).where(RenderJob.id == job_id))
    job = res.scalar_one_or_none()
    if not job or not job.output_path or not os.path.exists(job.output_path):
        raise HTTPException(status_code=404, detail="Export video file not found on disk")

    filename = os.path.basename(job.output_path)
    return FileResponse(
        path=job.output_path,
        media_type="video/mp4",
        filename=filename
    )
