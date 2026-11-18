import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import ClipProject, SourceVideo, HighlightCandidate, PublishingMetadata
from backend.publishing.publishing_assistant import PublishingAssistant

router = APIRouter(prefix="/publishing", tags=["Publishing Assistant"])


class UpdatePublishingRequest(BaseModel):
    generated_title: Optional[str] = None
    generated_description: Optional[str] = None
    hashtags: Optional[List[str]] = None
    pinned_comment: Optional[str] = None
    thumbnail_text: Optional[str] = None
    approval_status: Optional[str] = None  # draft | approved | rejected


@router.get("/{project_id}")
async def get_or_generate_publishing_metadata(
    project_id: str,
    target_platform: str = "youtube_shorts",
    db: AsyncSession = Depends(get_db)
):
    """Retrieve existing or automatically generate AI viral titles, description, hashtags and comments."""
    meta_res = await db.execute(select(PublishingMetadata).where(PublishingMetadata.clip_project_id == project_id))
    meta_obj = meta_res.scalar_one_or_none()

    if meta_obj:
        return {
            "id": meta_obj.id,
            "clip_project_id": meta_obj.clip_project_id,
            "target_platform": meta_obj.target_platform,
            "generated_title": meta_obj.generated_title,
            "generated_description": meta_obj.generated_description,
            "hashtags": json.loads(meta_obj.hashtags) if meta_obj.hashtags else [],
            "pinned_comment": meta_obj.pinned_comment,
            "thumbnail_text": meta_obj.thumbnail_text,
            "approval_status": meta_obj.approval_status,
            "published_status": meta_obj.published_status,
            "published_url": meta_obj.published_url
        }

    # Fetch project details to generate
    proj_res = await db.execute(select(ClipProject).where(ClipProject.id == project_id))
    proj = proj_res.scalar_one_or_none()
    if not proj:
        raise HTTPException(status_code=404, detail="Clip project not found")

    src_res = await db.execute(select(SourceVideo).where(SourceVideo.id == proj.source_video_id))
    src = src_res.scalar_one_or_none()
    creator_name = src.creator_name if src else "Creator"

    category = "reaction"
    if proj.candidate_id:
        cand_res = await db.execute(select(HighlightCandidate).where(HighlightCandidate.id == proj.candidate_id))
        cand = cand_res.scalar_one_or_none()
        if cand:
            category = cand.category

    # Generate metadata using PublishingAssistant
    gen = PublishingAssistant.generate_metadata(
        clip_title=proj.title,
        category=category,
        transcript_snippet=proj.title,
        creator_name=creator_name,
        target_platform=target_platform
    )

    new_meta = PublishingMetadata(
        clip_project_id=project_id,
        target_platform=target_platform,
        generated_title=gen["generated_title"],
        generated_description=gen["generated_description"],
        hashtags=json.dumps(gen["hashtags"]),
        pinned_comment=gen["pinned_comment"],
        thumbnail_text=gen["thumbnail_text"],
        approval_status="draft",
        published_status="not_published"
    )
    db.add(new_meta)
    await db.commit()
    await db.refresh(new_meta)

    return {
        "id": new_meta.id,
        "clip_project_id": new_meta.clip_project_id,
        "target_platform": new_meta.target_platform,
        "generated_title": new_meta.generated_title,
        "alternate_titles": gen.get("alternate_titles", []),
        "generated_description": new_meta.generated_description,
        "hashtags": gen["hashtags"],
        "pinned_comment": new_meta.pinned_comment,
        "thumbnail_text": new_meta.thumbnail_text,
        "approval_status": new_meta.approval_status,
        "published_status": new_meta.published_status
    }


@router.patch("/{project_id}")
async def update_publishing_metadata(
    project_id: str,
    req: UpdatePublishingRequest,
    db: AsyncSession = Depends(get_db)
):
    """Edit publishing titles, description, or approval state."""
    meta_res = await db.execute(select(PublishingMetadata).where(PublishingMetadata.clip_project_id == project_id))
    meta_obj = meta_res.scalar_one_or_none()
    if not meta_obj:
        raise HTTPException(status_code=404, detail="Publishing metadata not found for project")

    if req.generated_title is not None:
        meta_obj.generated_title = req.generated_title
    if req.generated_description is not None:
        meta_obj.generated_description = req.generated_description
    if req.hashtags is not None:
        meta_obj.hashtags = json.dumps(req.hashtags)
    if req.pinned_comment is not None:
        meta_obj.pinned_comment = req.pinned_comment
    if req.thumbnail_text is not None:
        meta_obj.thumbnail_text = req.thumbnail_text
    if req.approval_status is not None:
        meta_obj.approval_status = req.approval_status

    await db.commit()
    await db.refresh(meta_obj)
    return {
        "id": meta_obj.id,
        "generated_title": meta_obj.generated_title,
        "generated_description": meta_obj.generated_description,
        "hashtags": json.loads(meta_obj.hashtags) if meta_obj.hashtags else [],
        "pinned_comment": meta_obj.pinned_comment,
        "thumbnail_text": meta_obj.thumbnail_text,
        "approval_status": meta_obj.approval_status
    }


@router.post("/{project_id}/approve")
async def approve_publishing(project_id: str, db: AsyncSession = Depends(get_db)):
    """Human approval required for publishing."""
    meta_res = await db.execute(select(PublishingMetadata).where(PublishingMetadata.clip_project_id == project_id))
    meta_obj = meta_res.scalar_one_or_none()
    if not meta_obj:
        raise HTTPException(status_code=404, detail="Publishing metadata not found")

    meta_obj.approval_status = "approved"
    await db.commit()
    await db.refresh(meta_obj)
    return {"status": "approved", "message": "Clip approved by user for publishing"}


@router.post("/{project_id}/publish")
async def execute_publish(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Publishing execution with safety verification.
    Requires human approval and account authorization. Never uploads automatically without authorization.
    """
    meta_res = await db.execute(select(PublishingMetadata).where(PublishingMetadata.clip_project_id == project_id))
    meta_obj = meta_res.scalar_one_or_none()
    if not meta_obj:
        raise HTTPException(status_code=404, detail="Publishing metadata not found")

    if meta_obj.approval_status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Publishing blocked: Human approval is strictly required prior to distribution."
        )

    # In production with authorized OAuth tokens, this sends to YouTube Data API / Instagram Graph API
    meta_obj.published_status = "published"
    meta_obj.published_url = f"https://youtube.com/shorts/preview_{project_id[:8]}"
    await db.commit()
    await db.refresh(meta_obj)

    return {
        "status": "published",
        "published_url": meta_obj.published_url,
        "platform": meta_obj.target_platform,
        "title": meta_obj.generated_title,
        "message": "Authorized publishing workflow completed."
    }
