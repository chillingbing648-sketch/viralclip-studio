import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, Optional

from backend.config import settings, ORIGINALS_DIR, PREVIEWS_DIR


def extract_media_metadata(file_path: str) -> Dict[str, Any]:
    """Run ffprobe on the video file and extract stream/format details."""
    cmd = [
        settings.FFPROBE_BIN,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        file_path
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
    except Exception as e:
        return {
            "duration": 0.0,
            "width": 1920,
            "height": 1080,
            "fps": 30.0,
            "bitrate": 0,
            "video_codec": "unknown",
            "audio_codec": "unknown",
            "error": str(e)
        }

    format_info = data.get("format", {})
    streams = data.get("streams", [])

    duration = float(format_info.get("duration", 0.0))
    bitrate = int(format_info.get("bit_rate", 0)) if format_info.get("bit_rate") else None

    width = 1920
    height = 1080
    fps = 30.0
    video_codec = None
    audio_codec = None

    for stream in streams:
        codec_type = stream.get("codec_type")
        if codec_type == "video" and not video_codec:
            video_codec = stream.get("codec_name")
            width = int(stream.get("width", 1920))
            height = int(stream.get("height", 1080))
            
            # Extract FPS
            r_frame_rate = stream.get("r_frame_rate", "30/1")
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                if float(den) > 0:
                    fps = round(float(num) / float(den), 2)
            else:
                try:
                    fps = float(r_frame_rate)
                except ValueError:
                    fps = 30.0

        elif codec_type == "audio" and not audio_codec:
            audio_codec = stream.get("codec_name")

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "bitrate": bitrate,
        "video_codec": video_codec or "unknown",
        "audio_codec": audio_codec or "unknown",
    }


def generate_video_thumbnail(file_path: str, timestamp_sec: float = 1.0) -> Optional[str]:
    """Generate a clean JPG thumbnail from the video using FFmpeg."""
    thumb_id = str(uuid.uuid4())
    thumb_filename = f"thumb_{thumb_id}.jpg"
    thumb_path = PREVIEWS_DIR / thumb_filename

    cmd = [
        settings.FFMPEG_BIN,
        "-y",
        "-ss", str(max(0.1, timestamp_sec)),
        "-i", file_path,
        "-vframes", "1",
        "-q:v", "2",
        str(thumb_path)
    ]
    try:
        subprocess.run(cmd, capture_output=True, check=True)
        if thumb_path.exists():
            return str(thumb_path)
    except Exception as e:
        print(f"Failed to generate thumbnail: {e}")
    return None


def process_local_upload(
    source_file_path: str,
    original_filename: str,
    creator_name: str = "Creator",
    rights_status: str = "owner_provided",
    rights_notes: Optional[str] = None
) -> Dict[str, Any]:
    """Store local uploaded video in originals storage and inspect metadata."""
    file_id = str(uuid.uuid4())
    ext = Path(original_filename).suffix.lower() or ".mp4"
    dest_filename = f"{file_id}{ext}"
    dest_path = ORIGINALS_DIR / dest_filename

    # Move or copy file
    if source_file_path != str(dest_path):
        shutil.copy2(source_file_path, dest_path)

    file_size = os.path.getsize(dest_path)
    meta = extract_media_metadata(str(dest_path))

    # Pick a thumbnail at 10% or 1s
    thumb_pos = min(1.0, meta["duration"] * 0.1) if meta["duration"] > 0 else 0.5
    thumb_path = generate_video_thumbnail(str(dest_path), thumb_pos)

    # Derive clean title from filename
    title = Path(original_filename).stem.replace("_", " ").title()

    return {
        "id": file_id,
        "title": title,
        "creator_name": creator_name,
        "source_type": "upload",
        "file_path": str(dest_path),
        "thumbnail_path": thumb_path,
        "duration_seconds": meta["duration"],
        "width": meta["width"],
        "height": meta["height"],
        "fps": meta["fps"],
        "bitrate": meta["bitrate"],
        "video_codec": meta["video_codec"],
        "audio_codec": meta["audio_codec"],
        "file_size_bytes": file_size,
        "rights_status": rights_status,
        "rights_notes": rights_notes or "Uploaded by authorized user",
        "status": "ready"
    }
