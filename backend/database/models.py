import datetime
import uuid
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


class SourceVideo(Base):
    __tablename__ = "source_videos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_type = Column(String(30), nullable=False, default="upload")  # upload | youtube | live_feed
    title = Column(String(255), nullable=False)
    creator_name = Column(String(150), nullable=False, default="Unknown Creator")
    channel_name = Column(String(150), nullable=True)
    source_url = Column(String(500), nullable=True)
    external_id = Column(String(100), nullable=True)  # e.g., YouTube video ID
    file_path = Column(String(500), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    duration_seconds = Column(Float, default=0.0)
    width = Column(Integer, default=0)
    height = Column(Integer, default=0)
    fps = Column(Float, default=30.0)
    bitrate = Column(Integer, nullable=True)
    video_codec = Column(String(50), nullable=True)
    audio_codec = Column(String(50), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    
    # Rights & Clearance
    rights_status = Column(String(50), default="owner_provided")  # authorized | owner_provided | pending_review | restricted
    rights_notes = Column(Text, nullable=True)
    
    # Lifecycle
    status = Column(String(50), default="ready")  # pending | ready | transcribing | transcribed | analyzing | analyzed | failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    transcript = relationship("Transcript", back_populates="source_video", uselist=False, cascade="all, delete-orphan")
    highlights = relationship("HighlightCandidate", back_populates="source_video", cascade="all, delete-orphan")
    projects = relationship("ClipProject", back_populates="source_video", cascade="all, delete-orphan")


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_video_id = Column(String(36), ForeignKey("source_videos.id", ondelete="CASCADE"), nullable=False, unique=True)
    language = Column(String(10), default="en")
    duration_seconds = Column(Float, default=0.0)
    raw_text = Column(Text, nullable=False, default="")
    segments_json = Column(Text, nullable=False, default="[]")  # List of segment dictionaries with word-level timestamps
    srt_path = Column(String(500), nullable=True)
    json_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    source_video = relationship("SourceVideo", back_populates="transcript")


class HighlightCandidate(Base):
    __tablename__ = "highlight_candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_video_id = Column(String(36), ForeignKey("source_videos.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    hook = Column(String(255), nullable=False)
    reason = Column(Text, nullable=False)
    category = Column(String(50), default="reaction")  # reaction | gaming | punchline | screaming | debate | storytelling | educational | surprising
    
    # 5-Pillar Scores (0-100)
    hook_score = Column(Float, default=80.0)
    emotion_score = Column(Float, default=80.0)
    entertainment_score = Column(Float, default=80.0)
    context_score = Column(Float, default=80.0)
    editing_potential_score = Column(Float, default=80.0)
    overall_score = Column(Float, default=80.0)
    tier = Column(String(30), default="strong")  # priority (90-100) | strong (75-89) | possible (60-74) | low (<60)
    
    context_summary = Column(Text, nullable=True)
    transcript_snippet = Column(Text, nullable=True)
    status = Column(String(30), default="candidate")  # candidate | approved | rejected | edited | rendered
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    source_video = relationship("SourceVideo", back_populates="highlights")
    projects = relationship("ClipProject", back_populates="candidate")


class ClipProject(Base):
    __tablename__ = "clip_projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_video_id = Column(String(36), ForeignKey("source_videos.id", ondelete="CASCADE"), nullable=False)
    candidate_id = Column(String(36), ForeignKey("highlight_candidates.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    preset_name = Column(String(50), default="STREAMER_HYPE")  # STREAMER_HYPE | PODCAST_CLEAN | GAMING_REACTION | CINEMATIC_STORY | EDUCATIONAL_SHORT
    start_time = Column(Float, nullable=False)
    end_time = Column(Float, nullable=False)
    
    # Reframing & Zoom controls
    crop_x_offset_pct = Column(Float, default=50.0)  # 0 to 100% horizontal crop anchor
    tracking_mode = Column(String(50), default="face_tracker")  # face_tracker | center_anchor | manual_crop | split_screen
    enable_zooms = Column(Boolean, default=True)
    zoom_intensity = Column(Float, default=1.15)
    
    # Caption options
    enable_captions = Column(Boolean, default=True)
    caption_style_json = Column(Text, nullable=True)  # font, colors, positioning, safe margins
    
    # Dynamic sound effects and dead air
    dead_air_removal_enabled = Column(Boolean, default=False)
    sound_effects_enabled = Column(Boolean, default=True)
    sound_effects_json = Column(Text, nullable=True)
    
    status = Column(String(30), default="draft")  # draft | rendering | rendered | failed
    preview_path = Column(String(500), nullable=True)
    rendered_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    source_video = relationship("SourceVideo", back_populates="projects")
    candidate = relationship("HighlightCandidate", back_populates="projects")
    render_jobs = relationship("RenderJob", back_populates="project", cascade="all, delete-orphan")
    publishing_metadata = relationship("PublishingMetadata", back_populates="project", uselist=False, cascade="all, delete-orphan")


class RenderJob(Base):
    __tablename__ = "render_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clip_project_id = Column(String(36), ForeignKey("clip_projects.id", ondelete="CASCADE"), nullable=False)
    target_platform = Column(String(50), default="youtube_shorts")  # youtube_shorts | instagram_reels
    preset_name = Column(String(50), default="STREAMER_HYPE")
    status = Column(String(30), default="queued")  # queued | processing | completed | failed
    progress_pct = Column(Integer, default=0)
    stage_description = Column(String(255), default="Initialized")
    
    output_path = Column(String(500), nullable=True)
    output_thumbnail_path = Column(String(500), nullable=True)
    duration_seconds = Column(Float, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    
    # Automated Quality Control
    qc_status = Column(String(30), default="pending")  # pending | passed | warning | failed
    qc_notes = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("ClipProject", back_populates="render_jobs")


class CreatorRights(Base):
    __tablename__ = "creator_rights"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    creator_name = Column(String(150), nullable=False, unique=True)
    channel_id = Column(String(150), nullable=True)
    authorization_type = Column(String(50), default="streamer_partnership")  # direct_license | streamer_partnership | fair_use_commentary | self_owned
    music_license_status = Column(String(50), default="royalty_free")  # cleared | royalty_free | platform_audio_library | unauthorized
    distribution_rights = Column(Boolean, default=True)
    monetization_rights = Column(Boolean, default=True)
    expiry_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class PublishingMetadata(Base):
    __tablename__ = "publishing_metadata"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    clip_project_id = Column(String(36), ForeignKey("clip_projects.id", ondelete="CASCADE"), nullable=False, unique=True)
    target_platform = Column(String(50), default="youtube_shorts")
    generated_title = Column(String(255), nullable=False)
    generated_description = Column(Text, nullable=True)
    hashtags = Column(Text, default="[]")  # JSON string of hashtags
    pinned_comment = Column(Text, nullable=True)
    thumbnail_text = Column(String(150), nullable=True)
    approval_status = Column(String(30), default="draft")  # draft | approved | rejected
    published_status = Column(String(30), default="not_published")  # not_published | published
    published_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    project = relationship("ClipProject", back_populates="publishing_metadata")


class LiveFeedSession(Base):
    __tablename__ = "live_feed_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    feed_name = Column(String(150), nullable=False)
    feed_url = Column(String(500), nullable=False)
    status = Column(String(30), default="idle")  # idle | streaming | stopped | error
    rolling_buffer_minutes = Column(Integer, default=30)
    total_chunks_processed = Column(Integer, default=0)
    detected_moments_count = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# Indexes for rapid queries
Index("idx_source_status", SourceVideo.status)
Index("idx_candidate_score", HighlightCandidate.overall_score)
Index("idx_candidate_tier", HighlightCandidate.tier)
Index("idx_project_status", ClipProject.status)
Index("idx_render_status", RenderJob.status)
