import asyncio
import os
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from backend.config import settings, ORIGINALS_DIR, EXPORTS_DIR, PREVIEWS_DIR
from backend.database.db import init_db_sync, get_sync_db
from backend.database.models import SourceVideo, HighlightCandidate, ClipProject, RenderJob, CreatorRights
from backend.ingestion.source_manager import process_local_upload, extract_media_metadata, generate_video_thumbnail
from backend.detection.highlight_detector import HighlightDetector
from backend.scoring.viral_scorer import ViralScoringEngine
from backend.rendering.render_engine import RenderEngine
from backend.rights.rights_manager import RightsManager
from backend.publishing.publishing_assistant import PublishingAssistant


def test_full_pipeline():
    print("=" * 60)
    print("VIRALCLIP STUDIO — END-TO-END PIPELINE VERIFICATION")
    print("=" * 60)

    # 1. Initialize Database
    print("\n[Step 1] Initializing SQLite database schema...")
    init_db_sync()
    db = get_sync_db()
    print("✓ Database ready.")

    # 2. Ingest Sample Video
    sample_video = ORIGINALS_DIR / "sample_stream_clutch.mp4"
    if not sample_video.exists():
        raise FileNotFoundError(f"Sample video not found at {sample_video}")

    print(f"\n[Step 2] Ingesting sample source video: {sample_video.name}")
    meta = extract_media_metadata(str(sample_video))
    print(f"  Duration: {meta['duration']}s | Resolution: {meta['width']}x{meta['height']} | FPS: {meta['fps']}")
    thumb = generate_video_thumbnail(str(sample_video), 1.0)
    print(f"  Generated Thumbnail: {thumb}")

    source_obj = SourceVideo(
        source_type="upload",
        title="Epic Stream Clutch Play",
        creator_name="StreamHypeGaming",
        channel_name="HypeStreamerTV",
        file_path=str(sample_video),
        thumbnail_path=thumb,
        duration_seconds=meta["duration"],
        width=meta["width"],
        height=meta["height"],
        fps=meta["fps"],
        bitrate=meta["bitrate"],
        video_codec=meta["video_codec"],
        audio_codec=meta["audio_codec"],
        file_size_bytes=os.path.getsize(sample_video),
        rights_status="authorized",
        rights_notes="Authorized creator gameplay footage",
        status="ready"
    )
    db.add(source_obj)
    db.commit()
    db.refresh(source_obj)
    print(f"✓ Source Video persisted in DB. ID: {source_obj.id}")

    # 3. Simulate High-Energy Transcript Segments
    mock_segments = [
        {
            "id": 0,
            "start": 2.0,
            "end": 8.5,
            "text": "Bro wait wait wait, look at this insane positioning right now!",
            "speaker": "Speaker 1",
            "words": [
                {"word": "Bro", "start": 2.0, "end": 2.4},
                {"word": "wait", "start": 2.5, "end": 2.9},
                {"word": "look", "start": 3.0, "end": 3.5},
                {"word": "insane", "start": 4.0, "end": 4.8},
                {"word": "positioning", "start": 5.0, "end": 6.2}
            ]
        },
        {
            "id": 1,
            "start": 8.8,
            "end": 17.5,
            "text": "No way he actually pulls off the 1v3 clutch with one HP left!",
            "speaker": "Speaker 1",
            "words": [
                {"word": "No", "start": 8.8, "end": 9.2},
                {"word": "way", "start": 9.3, "end": 9.7},
                {"word": "actually", "start": 10.0, "end": 10.8},
                {"word": "clutch", "start": 12.0, "end": 13.0},
                {"word": "one", "start": 14.0, "end": 14.5},
                {"word": "HP", "start": 14.6, "end": 15.2}
            ]
        },
        {
            "id": 2,
            "start": 18.0,
            "end": 26.5,
            "text": "Chat is going absolutely crazy right now, let's go boys!",
            "speaker": "Speaker 1",
            "words": [
                {"word": "Chat", "start": 18.0, "end": 18.5},
                {"word": "crazy", "start": 19.5, "end": 20.5},
                {"word": "let's", "start": 22.0, "end": 22.6},
                {"word": "go", "start": 22.7, "end": 23.5}
            ]
        }
    ]

    # 4. Highlight Detection & Viral Scoring
    print("\n[Step 3] Executing AI Highlight Detection & 5-Pillar Viral Scoring...")
    detector = HighlightDetector()
    candidates = detector.detect_highlights(str(sample_video), mock_segments, meta["duration"])
    print(f"  Detected candidates: {len(candidates)}")
    top_cand = candidates[0]
    print(f"  Top Candidate Hook: '{top_cand['hook']}'")
    print(f"  Category: {top_cand['category']} | Overall Score: {top_cand['overall_score']} ({top_cand['tier'].upper()})")
    print(f"  Score Breakdown: {top_cand['scores']}")
    print(f"  Time Window: {top_cand['start_time']}s -> {top_cand['end_time']}s (Duration: {top_cand['duration']}s)")

    cand_obj = HighlightCandidate(
        source_video_id=source_obj.id,
        start_time=top_cand["start_time"],
        end_time=top_cand["end_time"],
        duration=top_cand["duration"],
        hook=top_cand["hook"],
        reason=top_cand["reason"],
        category=top_cand["category"],
        hook_score=top_cand["scores"]["hook"],
        emotion_score=top_cand["scores"]["emotion"],
        entertainment_score=top_cand["scores"]["entertainment"],
        context_score=top_cand["scores"]["context"],
        editing_potential_score=top_cand["scores"]["editing_potential"],
        overall_score=top_cand["overall_score"],
        tier=top_cand["tier"],
        context_summary=top_cand["context_summary"],
        transcript_snippet=top_cand["transcript_snippet"],
        status="approved"
    )
    db.add(cand_obj)
    db.commit()
    db.refresh(cand_obj)
    print("✓ Top candidate approved and stored.")

    # 5. Create ClipProject with STREAMER_HYPE preset
    print("\n[Step 4] Creating Clip Project with STREAMER_HYPE preset...")
    project_obj = ClipProject(
        source_video_id=source_obj.id,
        candidate_id=cand_obj.id,
        title=top_cand["hook"],
        preset_name="STREAMER_HYPE",
        start_time=top_cand["start_time"],
        end_time=top_cand["end_time"],
        crop_x_offset_pct=50.0,
        tracking_mode="face_tracker",
        enable_zooms=True,
        zoom_intensity=1.20,
        enable_captions=True,
        status="draft"
    )
    db.add(project_obj)
    db.commit()
    db.refresh(project_obj)
    print(f"✓ Project created. ID: {project_obj.id}")

    # 6. Rights Clearance Check
    print("\n[Step 5] Checking Rights & Licensing Clearance...")
    clearance = RightsManager.verify_project_clearance(source_obj)
    print(f"  Clearance Result: {clearance['cleared']} | Reason: {clearance['reason']}")
    assert clearance["cleared"] is True, "Clearance check must pass for authorized video"
    print("✓ Rights clearance verified. Approved for export.")

    # 7. Render 9:16 Vertical Video (1080x1920)
    print("\n[Step 6] Rendering 1080x1920 9:16 Vertical Short with Animated Captions...")
    render_engine = RenderEngine(1080, 1920)

    def log_progress(pct, stage):
        print(f"  [{pct}%] {stage}")

    render_result = render_engine.render_clip(
        source_video_path=str(sample_video),
        start_time_sec=project_obj.start_time,
        end_time_sec=project_obj.end_time,
        preset_name="STREAMER_HYPE",
        target_platform="youtube_shorts",
        tracking_mode="face_tracker",
        crop_offset_pct=project_obj.crop_x_offset_pct,
        enable_captions=True,
        transcript_segments=mock_segments,
        enable_zooms=True,
        source_width=meta["width"],
        source_height=meta["height"],
        progress_callback=log_progress
    )

    print("\n✓ Render completed successfully!")
    print(f"  Output Path: {render_result['output_path']}")
    print(f"  File Size: {render_result['file_size_bytes']} bytes")
    print(f"  Duration: {render_result['duration_seconds']}s")
    print(f"  QC Status: {render_result['qc_status'].upper()}")
    print(f"  QC Summary: {render_result['qc_notes']}")

    # 8. Publishing Assistant
    print("\n[Step 7] Generating AI Publishing Package...")
    pub_pkg = PublishingAssistant.generate_metadata(
        clip_title=project_obj.title,
        category=top_cand["category"],
        transcript_snippet=top_cand["transcript_snippet"],
        creator_name=source_obj.creator_name,
        target_platform="youtube_shorts"
    )
    print(f"  Title: {pub_pkg['generated_title']}")
    print(f"  Hashtags: {' '.join(pub_pkg['hashtags'][:6])}")
    print(f"  Pinned Comment: {pub_pkg['pinned_comment']}")
    print(f"  Suggested Thumbnail Text: {pub_pkg['thumbnail_text']}")
    print("✓ Publishing package generated.")

    print("\n" + "=" * 60)
    print("ALL CORE BACKEND ENGINE MODULES VERIFIED SUCCESSFULLY!")
    print("=" * 60)
    db.close()


if __name__ == "__main__":
    test_full_pipeline()
