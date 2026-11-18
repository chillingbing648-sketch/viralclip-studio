import asyncio
import datetime
import os
import subprocess
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.config import settings, LIVE_BUFFER_DIR, ORIGINALS_DIR
from backend.ingestion.source_manager import extract_media_metadata


class LiveFeedManager:
    """
    Manages authorized livestream sessions (RTMP / HLS / prerecorded streams).
    Segments the incoming stream into rolling chunks (e.g. 30s segments),
    tracks timestamps relative to stream origin, and manages rolling buffer storage.
    """

    def __init__(self, session_id: str, feed_url: str, feed_name: str, segment_duration: int = 30):
        self.session_id = session_id
        self.feed_url = feed_url
        self.feed_name = feed_name
        self.segment_duration = segment_duration
        self.session_dir = LIVE_BUFFER_DIR / session_id
        self.session_dir.mkdir(parents=True, exist_ok=True)
        self.is_active = False
        self.process: Optional[subprocess.Popen] = None
        self.segments: List[Dict[str, Any]] = []
        self.start_timestamp = datetime.datetime.utcnow()

    def start_recording(self) -> Dict[str, Any]:
        """Start capturing segments from authorized feed using FFmpeg."""
        segment_pattern = str(self.session_dir / "chunk_%05d.mp4")
        
        # FFmpeg command to segment live stream or prerecorded video into 30s MP4 chunks
        cmd = [
            settings.FFMPEG_BIN,
            "-y",
            "-i", self.feed_url,
            "-c:v", "copy",
            "-c:a", "copy",
            "-f", "segment",
            "-segment_time", str(self.segment_duration),
            "-reset_timestamps", "1",
            segment_pattern
        ]

        try:
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            self.is_active = True
            return {
                "status": "recording",
                "session_id": self.session_id,
                "feed_name": self.feed_name,
                "session_dir": str(self.session_dir)
            }
        except Exception as e:
            self.is_active = False
            return {
                "status": "error",
                "error": str(e)
            }

    def scan_new_segments(self) -> List[Dict[str, Any]]:
        """Scan session directory for newly finalized segments."""
        if not self.session_dir.exists():
            return []

        files = sorted(list(self.session_dir.glob("chunk_*.mp4")))
        current_segments = []

        for idx, file_path in enumerate(files):
            # Check if file has data and is at least 1 second old or not the very latest being written
            if file_path.stat().st_size > 1024:
                seg_id = f"{self.session_id}_seg_{idx}"
                start_rel_sec = idx * self.segment_duration
                end_rel_sec = (idx + 1) * self.segment_duration

                # Check if already indexed
                already_indexed = any(s["file_path"] == str(file_path) for s in self.segments)
                if not already_indexed:
                    seg_info = {
                        "segment_id": seg_id,
                        "chunk_index": idx,
                        "file_path": str(file_path),
                        "start_time_sec": start_rel_sec,
                        "end_time_sec": end_rel_sec,
                        "created_at": datetime.datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    }
                    self.segments.append(seg_info)
                    current_segments.append(seg_info)

        return current_segments

    def stop_recording(self) -> Dict[str, Any]:
        """Stop FFmpeg process gracefully."""
        self.is_active = False
        if self.process and self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()

        return {
            "status": "stopped",
            "session_id": self.session_id,
            "total_segments": len(self.segments)
        }

    def assemble_range_into_video(self, start_sec: float, end_sec: float, title: str) -> Optional[str]:
        """Extract a clip range from live stream buffer and save into originals storage."""
        if not self.segments:
            return None

        # Identify which segments overlap with [start_sec, end_sec]
        overlapping_segments = [
            s for s in self.segments
            if s["end_time_sec"] >= start_sec and s["start_time_sec"] <= end_sec
        ]

        if not overlapping_segments:
            return None

        # Write concat demuxer file
        concat_txt = self.session_dir / "concat_list.txt"
        with open(concat_txt, "w", encoding="utf-8") as f:
            for s in overlapping_segments:
                # FFmpeg requires forward slashes or escaped backslashes in concat file
                clean_path = s["file_path"].replace("\\", "/")
                f.write(f"file '{clean_path}'\n")

        output_filename = f"live_clip_{uuid.uuid4().hex[:8]}.mp4"
        dest_path = ORIGINALS_DIR / output_filename

        # Concat and slice
        offset_in_first = max(0.0, start_sec - overlapping_segments[0]["start_time_sec"])
        duration = end_sec - start_sec

        cmd = [
            settings.FFMPEG_BIN,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_txt),
            "-ss", str(offset_in_first),
            "-t", str(duration),
            "-c:v", "libx264",
            "-c:a", "aac",
            str(dest_path)
        ]

        try:
            subprocess.run(cmd, capture_output=True, check=True)
            if dest_path.exists():
                return str(dest_path)
        except Exception as e:
            print(f"Error assembling live range: {e}")

        return None
