import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.database.models import CreatorRights, SourceVideo


class RightsManager:
    """
    Copyright and Rights Management Module.
    Tracks creator licensing, source ownership, music clearance, distribution & monetization constraints,
    and enforces export gating when required permissions are missing.
    """

    @staticmethod
    def verify_project_clearance(
        source_video: SourceVideo,
        creator_rights: Optional[CreatorRights] = None
    ) -> Dict[str, Any]:
        """
        Check whether video has verified rights clearance to proceed to export/publishing.
        Blocks workflow if rights are restricted or unauthorized.
        """
        status = source_video.rights_status or "owner_provided"
        notes = source_video.rights_notes or ""

        # Gating check: restricted or unauthorized
        if status == "restricted":
            return {
                "cleared": False,
                "reason": "Source video is marked as restricted by rights holder.",
                "details": {"rights_status": status, "notes": notes}
            }

        if status == "pending_review":
            return {
                "cleared": False,
                "reason": "Source video has pending rights review. Creator authorization must be approved before export.",
                "details": {"rights_status": status, "notes": notes}
            }

        # If creator rights record exists, check distribution and expiry
        if creator_rights:
            if not creator_rights.distribution_rights:
                return {
                    "cleared": False,
                    "reason": f"Distribution rights disabled for creator '{creator_rights.creator_name}'.",
                    "details": {"creator": creator_rights.creator_name}
                }

            if creator_rights.expiry_date and creator_rights.expiry_date < datetime.datetime.utcnow():
                return {
                    "cleared": False,
                    "reason": f"Creator license expired on {creator_rights.expiry_date.strftime('%Y-%m-%d')}.",
                    "details": {"expiry_date": str(creator_rights.expiry_date)}
                }

            if creator_rights.music_license_status == "unauthorized":
                return {
                    "cleared": False,
                    "reason": "Music license is unauthorized. Commercial audio clearance required.",
                    "details": {"music_license": creator_rights.music_license_status}
                }

        # Approved
        return {
            "cleared": True,
            "reason": "All rights checks passed. Authorized for production rendering & short-form distribution.",
            "details": {
                "rights_status": status,
                "creator": source_video.creator_name,
                "distribution_rights": True,
                "monetization_rights": creator_rights.monetization_rights if creator_rights else True,
            }
        }
