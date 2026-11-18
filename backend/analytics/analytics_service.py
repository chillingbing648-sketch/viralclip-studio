from typing import Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from backend.database.models import (
    SourceVideo, HighlightCandidate, ClipProject, RenderJob, CreatorRights, PublishingMetadata
)


class AnalyticsService:
    """
    Real-time analytics and telemetry aggregation from database tables.
    Returns authentic system metrics: sources, candidate highlights, approvals,
    rendering jobs, exports, and publishing status.
    """

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> Dict[str, Any]:
        """Aggregate real database statistics."""
        # Total Source Videos
        src_res = await db.execute(select(func.count(SourceVideo.id)))
        total_source_videos = src_res.scalar() or 0

        # Highlights count & breakdowns
        hl_res = await db.execute(select(func.count(HighlightCandidate.id)))
        total_detected_highlights = hl_res.scalar() or 0

        # Awaiting review
        pending_res = await db.execute(
            select(func.count(HighlightCandidate.id)).where(HighlightCandidate.status == "candidate")
        )
        clips_awaiting_review = pending_res.scalar() or 0

        # Approved clips
        app_res = await db.execute(
            select(func.count(HighlightCandidate.id)).where(HighlightCandidate.status == "approved")
        )
        approved_clips = app_res.scalar() or 0

        # Rejected clips
        rej_res = await db.execute(
            select(func.count(HighlightCandidate.id)).where(HighlightCandidate.status == "rejected")
        )
        rejected_clips = rej_res.scalar() or 0

        # Completed exports
        comp_res = await db.execute(
            select(func.count(RenderJob.id)).where(RenderJob.status == "completed")
        )
        completed_exports = comp_res.scalar() or 0

        # Active Rendering jobs
        rend_res = await db.execute(
            select(func.count(RenderJob.id)).where(RenderJob.status.in_(["queued", "processing"]))
        )
        rendering_jobs = rend_res.scalar() or 0

        # Publishing status counts
        pub_ready_res = await db.execute(
            select(func.count(PublishingMetadata.id)).where(PublishingMetadata.approval_status == "approved")
        )
        ready_to_publish = pub_ready_res.scalar() or 0

        pub_done_res = await db.execute(
            select(func.count(PublishingMetadata.id)).where(PublishingMetadata.published_status == "published")
        )
        published_count = pub_done_res.scalar() or 0

        # Average candidate viral score
        avg_score_res = await db.execute(select(func.avg(HighlightCandidate.overall_score)))
        avg_score = avg_score_res.scalar()
        average_viral_score = round(float(avg_score), 1) if avg_score else 0.0

        return {
            "total_source_videos": total_source_videos,
            "total_detected_highlights": total_detected_highlights,
            "clips_awaiting_review": clips_awaiting_review,
            "approved_clips": approved_clips,
            "rejected_clips": rejected_clips,
            "completed_exports": completed_exports,
            "rendering_jobs": rendering_jobs,
            "ready_to_publish": ready_to_publish,
            "published_count": published_count,
            "average_viral_score": average_viral_score,
            "approval_rate_pct": round((approved_clips / max(1, total_detected_highlights)) * 100, 1)
        }
