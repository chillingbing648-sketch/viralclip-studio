import os
from pathlib import Path
from typing import Dict, Any, List, Optional

from backend.config import PREVIEWS_DIR


def format_ass_time(seconds: float) -> str:
    """Format float seconds to ASS format: H:MM:SS.cc (centiseconds)."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 99
    return f"{hrs:d}:{mins:02d}:{secs:02d}.{cs:02d}"


class CaptionGenerator:
    """
    Generates high-contrast streamer animated captions (.ass)
    with word-by-word highlight effects, safe margin positioning,
    and platform safe areas.
    """

    def __init__(self, style_override: Optional[Dict[str, Any]] = None):
        self.style = {
            "font_name": "Arial Black",
            "font_size": 52,
            "primary_color": "&H00FFFFFF",     # Inactive word color: White
            "highlight_color": "&H0000E5FF",   # Active word color: Neon Yellow
            "outline_color": "&H00000000",     # Black outline
            "outline_width": 6,
            "shadow_offset": 3,
            "alignment": 2,                    # Bottom Center
            "margin_v": 340,                   # Above Reels/Shorts bottom caption UI
            "margin_lr": 60,                   # Safe left/right margins
            "uppercase": True,
            "max_words_per_line": 4
        }
        if style_override:
            self.style.update(style_override)

    def generate_ass_subtitle_file(
        self,
        transcript_segments: List[Dict[str, Any]],
        clip_start_sec: float,
        clip_end_sec: float,
        output_filename: str
    ) -> str:
        """
        Build an .ass subtitle file with word-by-word highlight for the given clip range.
        Timestamps are shifted relative to clip start (0.00).
        """
        output_path = PREVIEWS_DIR / output_filename

        ass_header = f"""[Script Info]
Title: ViralClip Streamer Dynamic Captions
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: StreamerDefault,{self.style['font_name']},{self.style['font_size']},{self.style['primary_color']},{self.style['highlight_color']},{self.style['outline_color']},&H80000000,-1,0,0,0,100,100,0,0,1,{self.style['outline_width']},{self.style['shadow_offset']},{self.style['alignment']},{self.style['margin_lr']},{self.style['margin_lr']},{self.style['margin_v']},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

        events: List[str] = []

        # Filter segments that fall within [clip_start_sec, clip_end_sec]
        for seg in transcript_segments:
            seg_start = seg.get("start", 0.0)
            seg_end = seg.get("end", 0.0)

            # Skip outside range
            if seg_end < clip_start_sec or seg_start > clip_end_sec:
                continue

            words = seg.get("words", [])
            if not words:
                # If word-level is missing, use segment-level fallback
                text = seg.get("text", "").strip()
                if self.style["uppercase"]:
                    text = text.upper()
                rel_start = max(0.0, seg_start - clip_start_sec)
                rel_end = min(clip_end_sec - clip_start_sec, seg_end - clip_start_sec)
                if rel_end > rel_start:
                    start_str = format_ass_time(rel_start)
                    end_str = format_ass_time(rel_end)
                    events.append(f"Dialogue: 0,{start_str},{end_str},StreamerDefault,,0,0,0,,{text}")
                continue

            # Group words into short phrases (max_words_per_line)
            chunk_size = self.style["max_words_per_line"]
            for i in range(0, len(words), chunk_size):
                chunk = words[i:i + chunk_size]
                if not chunk:
                    continue

                phrase_start = max(clip_start_sec, chunk[0]["start"])
                phrase_end = min(clip_end_sec, chunk[-1]["end"])

                # If entire chunk is out of bounds, skip
                if phrase_end <= clip_start_sec or phrase_start >= clip_end_sec:
                    continue

                # Generate word-by-word highlighted lines for this phrase
                for active_idx, target_word in enumerate(chunk):
                    w_start = max(clip_start_sec, target_word["start"])
                    w_end = min(clip_end_sec, target_word["end"])

                    if w_end <= w_start:
                        continue

                    rel_w_start = w_start - clip_start_sec
                    rel_w_end = w_end - clip_start_sec

                    # Build text where target_word is highlighted with yellow and inactive words white
                    line_parts = []
                    for w_idx, w in enumerate(chunk):
                        word_str = w["word"].strip()
                        if self.style["uppercase"]:
                            word_str = word_str.upper()

                        if w_idx == active_idx:
                            # Highlight active word with highlight color and slight scale
                            line_parts.append(f"{{\\c{self.style['highlight_color']}&\\fscx110\\fscy110}}{word_str}{{\\r}}")
                        else:
                            line_parts.append(f"{{\\c{self.style['primary_color']}&}}{word_str}{{\\r}}")

                    formatted_line = " ".join(line_parts)
                    start_str = format_ass_time(rel_w_start)
                    end_str = format_ass_time(rel_w_end)
                    events.append(f"Dialogue: 0,{start_str},{end_str},StreamerDefault,,0,0,0,,{formatted_line}")

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(ass_header)
            f.write("\n".join(events))
            f.write("\n")

        return str(output_path)
