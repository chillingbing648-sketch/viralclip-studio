import os
import shutil
from pathlib import Path
from typing import Dict, Any
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
ORIGINALS_DIR = STORAGE_DIR / "originals"
TRANSCRIPTS_DIR = STORAGE_DIR / "transcripts"
CANDIDATES_DIR = STORAGE_DIR / "candidates"
PREVIEWS_DIR = STORAGE_DIR / "previews"
EXPORTS_DIR = STORAGE_DIR / "exports"
LIVE_BUFFER_DIR = STORAGE_DIR / "live_buffer"
ASSETS_DIR = BASE_DIR / "assets"
PRESETS_DIR = ASSETS_DIR / "presets"
SOUND_EFFECTS_DIR = ASSETS_DIR / "sound_effects"
OVERLAYS_DIR = ASSETS_DIR / "overlays"
FONTS_DIR = ASSETS_DIR / "fonts"

# Ensure all primary storage directories exist
for directory in [
    STORAGE_DIR, ORIGINALS_DIR, TRANSCRIPTS_DIR, CANDIDATES_DIR,
    PREVIEWS_DIR, EXPORTS_DIR, LIVE_BUFFER_DIR, ASSETS_DIR,
    PRESETS_DIR, SOUND_EFFECTS_DIR, OVERLAYS_DIR, FONTS_DIR
]:
    directory.mkdir(parents=True, exist_ok=True)


def find_binary(binary_name: str) -> str:
    """Find binary in PATH, WinGet, or common Windows locations."""
    # 1. Direct which lookup
    found = shutil.which(binary_name)
    if found:
        return found

    # 2. Check WinGet Packages
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        winget_pattern = Path(local_app_data) / "Microsoft" / "WinGet" / "Packages"
        if winget_pattern.exists():
            matches = list(winget_pattern.glob(f"**/{binary_name}.exe"))
            if matches:
                return str(matches[0])

    # 3. Check Program Files / Common paths
    candidates = [
        f"C:\\ffmpeg\\bin\\{binary_name}.exe",
        f"C:\\Program Files\\ffmpeg\\bin\\{binary_name}.exe",
        f"C:\\ProgramData\\chocolatey\\bin\\{binary_name}.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c

    return binary_name  # fallback to name if not resolved directly


FFMPEG_PATH = os.environ.get("FFMPEG_PATH") or find_binary("ffmpeg")
FFPROBE_PATH = os.environ.get("FFPROBE_PATH") or find_binary("ffprobe")


class Settings(BaseSettings):
    PROJECT_NAME: str = "ViralClip Studio"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{STORAGE_DIR / 'viralclip.db'}"
    SYNC_DATABASE_URL: str = f"sqlite:///{STORAGE_DIR / 'viralclip.db'}"

    # Video Binaries
    FFMPEG_BIN: str = FFMPEG_PATH
    FFPROBE_BIN: str = FFPROBE_PATH

    # AI Whisper Config
    WHISPER_MODEL_SIZE: str = os.environ.get("WHISPER_MODEL_SIZE", "base")
    WHISPER_DEVICE: str = os.environ.get("WHISPER_DEVICE", "cpu")
    WHISPER_COMPUTE_TYPE: str = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

    # LLM Config
    LLM_PROVIDER: str = os.environ.get("LLM_PROVIDER", "heuristic")  # heuristic | openai | gemini | local
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

    # Viral Scoring Engine Default Weights (Sum = 1.0)
    WEIGHT_HOOK: float = 0.25
    WEIGHT_EMOTION: float = 0.25
    WEIGHT_ENTERTAINMENT: float = 0.20
    WEIGHT_CONTEXT: float = 0.20
    WEIGHT_EDITING: float = 0.10

    # Classification Tiers
    SCORE_TIER_PRIORITY: int = 90
    SCORE_TIER_STRONG: int = 75
    SCORE_TIER_POSSIBLE: int = 60

    # Target Rendering Defaults
    TARGET_WIDTH: int = 1080
    TARGET_HEIGHT: int = 1920
    TARGET_FPS: int = 30
    DEFAULT_PRESET: str = "STREAMER_HYPE"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
