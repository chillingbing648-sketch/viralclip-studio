import json
import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable
from faster_whisper import WhisperModel

from backend.config import settings, TRANSCRIPTS_DIR


def format_timestamp_srt(seconds: float) -> str:
    """Convert float seconds to SRT time string (HH:MM:SS,mmm)."""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


def export_to_srt(segments: List[Dict[str, Any]], output_path: str):
    """Write list of segment dictionaries into standard SRT subtitle format."""
    with open(output_path, "w", encoding="utf-8") as f:
        for idx, seg in enumerate(segments, start=1):
            start_str = format_timestamp_srt(seg["start"])
            end_str = format_timestamp_srt(seg["end"])
            text = seg["text"].strip()
            f.write(f"{idx}\n{start_str} --> {end_str}\n{text}\n\n")


class TranscriptionEngine:
    """
    AI Transcription engine powered by faster-whisper with word-level timestamps,
    language detection, speaker shift detection, JSON & SRT exports, and phrase search.
    """

    def __init__(self, model_size: Optional[str] = None, device: Optional[str] = None):
        self.model_size = model_size or settings.WHISPER_MODEL_SIZE
        self.device = device or settings.WHISPER_DEVICE
        self.compute_type = settings.WHISPER_COMPUTE_TYPE
        self._model: Optional[WhisperModel] = None

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
                cpu_threads=4
            )
        return self._model

    def transcribe_video(
        self,
        video_path: str,
        video_id: str,
        progress_callback: Optional[Callable[[int, str], None]] = None
    ) -> Dict[str, Any]:
        """
        Transcribe audio track of video file, returning structured segments with word-level timestamps,
        language info, raw text, and written JSON/SRT files.
        """
        if progress_callback:
            progress_callback(10, f"Loading Whisper model ({self.model_size})...")

        model = self._get_model()

        if progress_callback:
            progress_callback(25, "Running speech recognition & word alignment...")

        # faster-whisper transcribe with word timestamps
        segments_gen, info = model.transcribe(
            video_path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        detected_language = info.language
        language_probability = round(info.language_probability, 3)

        segments_list: List[Dict[str, Any]] = []
        raw_text_pieces: List[str] = []

        current_speaker_id = 1
        last_seg_end = 0.0

        for seg_idx, segment in enumerate(segments_gen):
            # Speaker change heuristic: a silence/pause > 1.2s suggests speaker alternation or new topic
            if last_seg_end > 0 and (segment.start - last_seg_end) > 1.2:
                current_speaker_id = 2 if current_speaker_id == 1 else 1

            words_data = []
            if segment.words:
                for w in segment.words:
                    words_data.append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "probability": round(w.probability, 3)
                    })

            seg_dict = {
                "id": seg_idx,
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
                "speaker": f"Speaker {current_speaker_id}",
                "words": words_data
            }
            segments_list.append(seg_dict)
            raw_text_pieces.append(segment.text.strip())
            last_seg_end = segment.end

        raw_text = " ".join(raw_text_pieces)

        if progress_callback:
            progress_callback(85, "Exporting SRT and JSON transcripts...")

        # Save artifacts to storage/transcripts
        json_filename = f"transcript_{video_id}.json"
        srt_filename = f"transcript_{video_id}.srt"

        json_path = TRANSCRIPTS_DIR / json_filename
        srt_path = TRANSCRIPTS_DIR / srt_filename

        output_data = {
            "source_video_id": video_id,
            "language": detected_language,
            "language_probability": language_probability,
            "duration_seconds": round(info.duration, 2),
            "raw_text": raw_text,
            "segments": segments_list
        }

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        export_to_srt(segments_list, str(srt_path))

        if progress_callback:
            progress_callback(100, "Transcription completed successfully.")

        return {
            "language": detected_language,
            "language_probability": language_probability,
            "duration_seconds": round(info.duration, 2),
            "raw_text": raw_text,
            "segments": segments_list,
            "json_path": str(json_path),
            "srt_path": str(srt_path),
        }

    @staticmethod
    def search_transcript(segments: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """
        Search through segments and individual word timestamps for matching phrases.
        Allows users to jump directly to the exact timestamp.
        """
        if not query or not query.strip():
            return []

        clean_query = query.strip().lower()
        results = []

        for seg in segments:
            seg_text = seg.get("text", "").lower()
            if clean_query in seg_text:
                # Find matching word in segment
                matched_word_time = seg.get("start", 0.0)
                for w in seg.get("words", []):
                    if clean_query in w.get("word", "").lower():
                        matched_word_time = w.get("start", seg.get("start", 0.0))
                        break

                results.append({
                    "segment_id": seg.get("id"),
                    "start_time": seg.get("start"),
                    "end_time": seg.get("end"),
                    "matched_timestamp": matched_word_time,
                    "speaker": seg.get("speaker"),
                    "text": seg.get("text"),
                    "matched_substring": query
                })

        return results
