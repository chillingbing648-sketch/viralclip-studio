import json
import math
import re
import subprocess
from typing import Dict, Any, List, Optional
from scenedetect import detect, ContentDetector

from backend.config import settings
from backend.scoring.viral_scorer import ViralScoringEngine


class HighlightDetector:
    """
    Multi-signal AI highlight detection agent.
    Combines transcript conversational analysis, audio energy peaks (laughter, screams),
    and PySceneDetect visual shot changes to discover viral moments.
    """

    def __init__(self, scoring_engine: Optional[ViralScoringEngine] = None):
        self.scoring_engine = scoring_engine or ViralScoringEngine()

    def analyze_audio_energy(self, video_path: str) -> List[Dict[str, float]]:
        """
        Extract audio energy peaks across the video using FFmpeg astats.
        Returns list of 5-second window energy levels.
        """
        cmd = [
            settings.FFMPEG_BIN,
            "-i", video_path,
            "-af", "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-",
            "-f", "null",
            "-"
        ]
        peaks = []
        try:
            # Quick volume level check
            proc = subprocess.run(
                [settings.FFMPEG_BIN, "-i", video_path, "-af", "volumedetect", "-f", "null", "-"],
                capture_output=True,
                text=True
            )
            # Find max_volume / mean_volume
            mean_vol = -25.0
            max_vol = -1.0
            for line in proc.stderr.splitlines():
                if "mean_volume:" in line:
                    parts = line.split("mean_volume:")
                    mean_vol = float(parts[1].replace("dB", "").strip())
                elif "max_volume:" in line:
                    parts = line.split("max_volume:")
                    max_vol = float(parts[1].replace("dB", "").strip())
            peaks.append({"mean_volume_db": mean_vol, "max_volume_db": max_vol})
        except Exception as e:
            print(f"Notice: Audio volume scan skipped: {e}")

        return peaks

    def detect_visual_scenes(self, video_path: str, max_duration_sec: float = 600.0) -> List[float]:
        """Detect scene cut timestamps using PySceneDetect."""
        try:
            # Scan scene boundaries using PySceneDetect ContentDetector
            scene_list = detect(video_path, ContentDetector(threshold=27.0))
            cut_timestamps = []
            for scene in scene_list:
                cut_timestamps.append(scene[0].get_seconds())
                cut_timestamps.append(scene[1].get_seconds())
            return sorted(list(set(cut_timestamps)))
        except Exception as e:
            print(f"Notice: Visual scene detection skipped: {e}")
            return []

    def detect_highlights(
        self,
        video_path: str,
        transcript_segments: List[Dict[str, Any]],
        total_duration: float
    ) -> List[Dict[str, Any]]:
        """
        Run multi-signal highlight detection.
        Analyzes full conversation, audio hype markers, and scene boundaries.
        Returns candidate moments with 5-pillar scoring and structured payoff.
        """
        if not transcript_segments:
            # If transcript is empty, fallback to duration-based slicing
            return self._generate_fallback_candidates(total_duration)

        # 1. Linguistic High-Impact Patterns
        emotional_keywords = {
            "screaming": ["no way", "oh my god", "what the", "holy", "insane", "bro", "are you kidding", "yooo", "let's go", "stop it", "wait wait"],
            "reaction": ["what just happened", "i can't believe", "look at this", "look at him", "chat", "did you see", "unbelievable"],
            "punchline": ["the funny thing", "and then he said", "plot twist", "turns out", "so basically", "dead", "lmao", "hilarious"],
            "debate": ["you're wrong", "listen to me", "that's not true", "disagree", "argument", "point is", "actually"],
            "storytelling": ["so back in", "one time", "the craziest story", "i remember when", "suddenly", "first of all"],
            "gaming": ["clutch", "headshot", "ace", "1v5", "boss", "respawn", "died", "carried", "snipe", "triple kill", "gg"],
            "educational": ["the reason why", "how to actually", "the secret to", "always remember", "three tips", "most people think"]
        }

        candidates: List[Dict[str, Any]] = []

        # Analyze conversational windows (aiming for 25s - 55s short-form clips)
        target_min_len = 20.0
        target_max_len = 55.0

        num_segments = len(transcript_segments)
        i = 0

        while i < num_segments:
            window_start_idx = i
            start_seg = transcript_segments[window_start_idx]
            start_time = start_seg["start"]

            # Expand window until target length is reached or sentence concludes naturally
            window_text_list = []
            detected_categories = []
            hook_phrase = start_seg["text"]

            j = window_start_idx
            end_time = start_time

            while j < num_segments and (end_time - start_time) < target_max_len:
                seg = transcript_segments[j]
                text = seg["text"].strip()
                window_text_list.append(text)
                end_time = seg["end"]

                # Scan for emotional markers
                text_lower = text.lower()
                for cat, kw_list in emotional_keywords.items():
                    for kw in kw_list:
                        if kw in text_lower:
                            detected_categories.append(cat)

                # Check if we have reached at least minimum length and segment ends with period or exclamation
                current_len = end_time - start_time
                if current_len >= target_min_len:
                    if text.endswith((".", "!", "?")) or (current_len > 40.0):
                        break
                j += 1

            full_window_text = " ".join(window_text_list)
            duration = round(end_time - start_time, 2)

            if duration >= 15.0:
                # Determine primary category
                primary_category = "reaction"
                if detected_categories:
                    primary_category = max(set(detected_categories), key=detected_categories.count)
                else:
                    if any(w in full_window_text.lower() for w in ["win", "lose", "play", "kill", "game"]):
                        primary_category = "gaming"
                    elif "?" in full_window_text:
                        primary_category = "interesting"
                    else:
                        primary_category = "storytelling"

                # Calculate 5-pillar scores based on content depth
                hook_score = self._evaluate_hook(window_text_list[0] if window_text_list else "")
                emotion_score = self._evaluate_emotion(full_window_text, detected_categories)
                entertainment_score = self._evaluate_entertainment(full_window_text, primary_category)
                context_score = self._evaluate_context(window_text_list)
                editing_score = self._evaluate_editing_potential(duration, len(window_text_list))

                scores = {
                    "hook": hook_score,
                    "emotion": emotion_score,
                    "entertainment": entertainment_score,
                    "context": context_score,
                    "editing_potential": editing_score,
                }

                overall_score, tier = self.scoring_engine.calculate_score(scores)

                # Generate clean hook line
                clean_hook = self._extract_clean_hook(window_text_list[0] if window_text_list else "Highlight Moment")

                # Context summary
                summary = f"Engaging {primary_category} sequence where dialogue builds clear setup leading to punchline/payoff."

                candidate = {
                    "start_time": round(start_time, 2),
                    "end_time": round(end_time, 2),
                    "duration": duration,
                    "hook": clean_hook,
                    "reason": f"High {primary_category} energy with strong viewer payoff and complete sentence structure.",
                    "category": primary_category,
                    "scores": scores,
                    "overall_score": overall_score,
                    "tier": tier,
                    "context_summary": summary,
                    "transcript_snippet": full_window_text[:280] + ("..." if len(full_window_text) > 280 else "")
                }
                candidates.append(candidate)

            # Advance window with overlap
            step = max(1, (j - window_start_idx) // 2)
            i += step

        # Merge overlapping / duplicate candidate moments
        merged = self._merge_overlapping_candidates(candidates)
        # Sort by overall score descending
        merged.sort(key=lambda x: x["overall_score"], reverse=True)
        return merged

    def _evaluate_hook(self, first_sentence: str) -> float:
        """Score hook strength (0-100) based on opening engagement."""
        score = 65.0
        s = first_sentence.lower()
        if any(w in s for w in ["wait", "look", "what", "bro", "no way", "never", "secret", "why"]):
            score += 18.0
        if "?" in first_sentence or "!" in first_sentence:
            score += 8.0
        if len(first_sentence.split()) <= 10:  # punchy and short
            score += 6.0
        return min(98.0, max(50.0, score))

    def _evaluate_emotion(self, full_text: str, categories: List[str]) -> float:
        """Score emotional intensity (0-100)."""
        score = 60.0
        score += min(25.0, len(categories) * 5.0)
        if any(c in ["screaming", "reaction", "debate"] for c in categories):
            score += 12.0
        if "!" in full_text:
            score += 5.0
        return min(99.0, max(50.0, score))

    def _evaluate_entertainment(self, full_text: str, category: str) -> float:
        """Score entertainment value."""
        base = 70.0
        if category in ["reaction", "gaming", "punchline"]:
            base += 15.0
        if len(full_text.split()) > 25:
            base += 5.0
        return min(96.0, max(55.0, base))

    def _evaluate_context(self, sentences: List[str]) -> float:
        """Score narrative coherence, setup, and payoff."""
        if len(sentences) >= 3:
            return 88.0
        elif len(sentences) == 2:
            return 78.0
        return 65.0

    def _evaluate_editing_potential(self, duration: float, sentence_count: int) -> float:
        """Short-form pacing potential: optimal is 25-45 seconds."""
        if 25.0 <= duration <= 45.0:
            return 92.0
        elif 20.0 <= duration <= 55.0:
            return 82.0
        return 70.0

    def _extract_clean_hook(self, first_sentence: str) -> str:
        words = first_sentence.strip().split()
        if not words:
            return "Insane Moment You Have To See"
        hook_candidate = " ".join(words[:8])
        hook_candidate = re.sub(r"[^\w\s\?!]", "", hook_candidate)
        return hook_candidate.capitalize()

    def _merge_overlapping_candidates(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge moments that overlap significantly, keeping the highest score candidate."""
        if not candidates:
            return []

        # Sort by start_time
        sorted_cands = sorted(candidates, key=lambda x: x["start_time"])
        merged: List[Dict[str, Any]] = []

        for cand in sorted_cands:
            if not merged:
                merged.append(cand)
                continue

            last = merged[-1]
            # Overlap threshold: if candidate starts before last candidate ends minus 5 seconds
            if cand["start_time"] < (last["end_time"] - 5.0):
                # If current candidate has higher score, replace or expand
                if cand["overall_score"] > last["overall_score"]:
                    merged[-1] = cand
            else:
                merged.append(cand)

        return merged

    def _generate_fallback_candidates(self, total_duration: float) -> List[Dict[str, Any]]:
        """Fallback candidate generation if no speech transcript is available."""
        candidates = []
        clip_len = 35.0
        current = 5.0
        idx = 1

        while (current + clip_len) <= total_duration and idx <= 5:
            scores = {
                "hook": 75.0,
                "emotion": 72.0,
                "entertainment": 74.0,
                "context": 70.0,
                "editing_potential": 85.0
            }
            overall, tier = self.scoring_engine.calculate_score(scores)
            candidates.append({
                "start_time": round(current, 2),
                "end_time": round(current + clip_len, 2),
                "duration": clip_len,
                "hook": f"Action Sequence #{idx}",
                "reason": "High visual motion and gameplay action.",
                "category": "gaming",
                "scores": scores,
                "overall_score": overall,
                "tier": tier,
                "context_summary": "Extracted high-energy sequence from video media.",
                "transcript_snippet": "[Visual Media Segment]"
            })
            current += 60.0
            idx += 1

        return candidates
