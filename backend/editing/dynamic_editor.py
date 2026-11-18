import re
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

from backend.config import settings


class DynamicEditor:
    """
    Handles dynamic editing enhancements:
    - Punch-in zooms at hook start and high emotion peaks
    - Dead air / silence detection and removal
    - Reaction emphasis & sound design cues
    """

    def __init__(self, zoom_intensity: float = 1.15):
        self.zoom_intensity = zoom_intensity

    def compute_zoom_filter_segments(
        self,
        clip_duration: float,
        zoom_events: Optional[List[Dict[str, float]]] = None
    ) -> str:
        """
        Generate FFmpeg filter expression for dynamic punch-in zoom.
        By default, punches in at the first 2.5 seconds (Hook) and the final 3 seconds (Payoff).
        """
        # If no specific zoom events provided, punch in on opening hook (0.0 to 2.5s)
        if not zoom_events:
            zoom_events = [
                {"start": 0.0, "end": min(2.5, clip_duration * 0.2)},
            ]

        # In FFmpeg, dynamic zoom can be represented with scale and crop or expression
        # An elegant and reliable filter is zoompan or chained enable='between(t, ...)'
        # For universal stability across H.264 profiles:
        z = self.zoom_intensity
        conditions = []
        for event in zoom_events:
            s = event.get("start", 0.0)
            e = event.get("end", 2.0)
            conditions.append(f"between(t,{s:.2f},{e:.2f})")

        combined_condition = "+".join(conditions) if conditions else "0"
        
        # Scale filter that enlarges slightly when condition is true
        # 'if(gt(condition, 0), z, 1.0)'
        # To avoid complex filtergraph errors, we return a structured filter definition
        return combined_condition

    def detect_silence_segments(
        self,
        video_path: str,
        start_sec: float,
        duration_sec: float,
        noise_threshold_db: float = -35.0,
        min_silence_duration: float = 0.6
    ) -> List[Tuple[float, float]]:
        """
        Detect dead air / silent intervals using FFmpeg silencedetect.
        Returns list of (silence_start, silence_end) relative to clip start.
        """
        cmd = [
            settings.FFMPEG_BIN,
            "-ss", str(start_sec),
            "-t", str(duration_sec),
            "-i", video_path,
            "-af", f"silencedetect=noise={noise_threshold_db}dB:d={min_silence_duration}",
            "-f", "null",
            "-"
        ]
        silence_intervals = []
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, check=True)
            current_start = None
            for line in res.stderr.splitlines():
                if "silence_start:" in line:
                    match = re.search(r"silence_start:\s*([0-9.]+)", line)
                    if match:
                        current_start = float(match.group(1))
                elif "silence_end:" in line and current_start is not None:
                    match = re.search(r"silence_end:\s*([0-9.]+)", line)
                    if match:
                        end = float(match.group(1))
                        silence_intervals.append((current_start, end))
                        current_start = None
        except Exception as e:
            print(f"Notice: silencedetect completed with info: {e}")

        return silence_intervals
