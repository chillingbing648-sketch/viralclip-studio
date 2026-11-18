from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from backend.database.db import get_db
from backend.database.models import CreatorRights, SourceVideo
from backend.rights.rights_manager import RightsManager

router = APIRouter(prefix="/rights", tags=["Rights Management"])


class CreateRightsRequest(BaseModel):
    creator_name: str
    channel_id: Optional[str] = None
    authorization_type: str = "streamer_partnership"  # direct_license | streamer_partnership | fair_use_commentary | self_owned
    music_license_status: str = "royalty_free"        # cleared | royalty_free | platform_audio_library | unauthorized
    distribution_rights: bool = True
    monetization_rights: bool = True
    notes: Optional[str] = None


class UpdateRightsRequest(BaseModel):
    authorization_type: Optional[str] = None
    music_license_status: Optional[str] = None
    distribution_rights: Optional[bool] = None
    monetization_rights: Optional[bool] = None
    notes: Optional[str] = None


@router.get("")
async def list_creator_rights(db: AsyncSession = Depends(get_db)):
    """List all creator rights agreements and licenses."""
    res = await db.execute(select(CreatorRights).order_by(CreatorRights.created_at.desc()))
    return res.scalars().all()


@router.post("")
async def create_creator_rights(
    req: CreateRightsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Register or update creator licensing authorization."""
    existing_res = await db.execute(select(CreatorRights).where(CreatorRights.creator_name == req.creator_name))
    existing = existing_res.scalar_one_or_none()
    if existing:
        existing.channel_id = req.channel_id or existing.channel_id
        existing.authorization_type = req.authorization_type
        existing.music_license_status = req.music_license_status
        existing.distribution_rights = req.distribution_rights
        existing.monetization_rights = req.monetization_rights
        existing.notes = req.notes
        await db.commit()
        await db.refresh(existing)
        return existing

    record = CreatorRights(
        creator_name=req.creator_name,
        channel_id=req.channel_id,
        authorization_type=req.authorization_type,
        music_license_status=req.music_license_status,
        distribution_rights=req.distribution_rights,
        monetization_rights=req.monetization_rights,
        notes=req.notes
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.patch("/{rights_id}")
async def update_rights(
    rights_id: str,
    req: UpdateRightsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update permissions, music clearance, or distribution terms."""
    res = await db.execute(select(CreatorRights).where(CreatorRights.id == rights_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Rights record not found")

    if req.authorization_type is not None:
        record.authorization_type = req.authorization_type
    if req.music_license_status is not None:
        record.music_license_status = req.music_license_status
    if req.distribution_rights is not None:
        record.distribution_rights = req.distribution_rights
    if req.monetization_rights is not None:
        record.monetization_rights = req.monetization_rights
    if req.notes is not None:
        record.notes = req.notes

    await db.commit()
    await db.refresh(record)
    return record


@router.post("/verify/{source_id}")
async def verify_rights_clearance(source_id: str, db: AsyncSession = Depends(get_db)):
    """Run rights clearance verification for a specific source video."""
    res = await db.execute(select(SourceVideo).where(SourceVideo.id == source_id))
    src = res.scalar_one_or_none()
    if not src:
        raise HTTPException(status_code=404, detail="Source video not found")

    c_res = await db.execute(select(CreatorRights).where(CreatorRights.creator_name == src.creator_name))
    creator_rights = c_res.scalar_one_or_none()

    clearance = RightsManager.verify_project_clearance(src, creator_rights)
    return clearance
