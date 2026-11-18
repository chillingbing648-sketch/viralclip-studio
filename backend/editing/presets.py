from typing import Dict, Any

PRESET_DEFINITIONS: Dict[str, Dict[str, Any]] = {
    "STREAMER_HYPE": {
        "name": "STREAMER_HYPE",
        "description": "High-energy streamer style with dynamic punch-in zooms, neon word-by-word highlighted captions, and fast-paced reaction emphasis.",
        "aspect_ratio": "9:16",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "zoom_intensity": 1.20,
        "enable_zooms": True,
        "enable_captions": True,
        "dead_air_removal": True,
        "silence_thresh_db": -35.0,
        "min_silence_duration_sec": 0.6,
        "caption_style": {
            "font_name": "Arial Black",
            "font_size": 24,
            "primary_color": "&H00FFFFFF",      # Crisp White
            "highlight_color": "&H0000E5FF",    # Streamer Yellow / Cyan
            "outline_color": "&H00000000",      # Solid Black Outline
            "outline_width": 3.5,
            "shadow_offset": 2.0,
            "alignment": 2,                     # Bottom-Center safe area
            "margin_v": 240,                    # Above platform UI buttons
            "uppercase": True,
            "max_words_per_line": 4
        },
        "sound_effects_enabled": True
    },
    "PODCAST_CLEAN": {
        "name": "PODCAST_CLEAN",
        "description": "Sophisticated, centered framing for dialogue and podcast interviews with clean minimalist typography and natural conversational rhythm.",
        "aspect_ratio": "9:16",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "zoom_intensity": 1.05,
        "enable_zooms": False,
        "enable_captions": True,
        "dead_air_removal": False,
        "caption_style": {
            "font_name": "Montserrat",
            "font_size": 20,
            "primary_color": "&H00FFFFFF",
            "highlight_color": "&H0050C878",    # Emerald Green highlight
            "outline_color": "&H00111111",
            "outline_width": 2.0,
            "shadow_offset": 1.0,
            "alignment": 2,
            "margin_v": 260,
            "uppercase": False,
            "max_words_per_line": 5
        },
        "sound_effects_enabled": False
    },
    "GAMING_REACTION": {
        "name": "GAMING_REACTION",
        "description": "Optimized for gaming clips with facecam focus, high-impact punch zooms on clutches, and high-contrast bold subtitles.",
        "aspect_ratio": "9:16",
        "width": 1080,
        "height": 1920,
        "fps": 60,
        "zoom_intensity": 1.25,
        "enable_zooms": True,
        "enable_captions": True,
        "dead_air_removal": True,
        "caption_style": {
            "font_name": "Impact",
            "font_size": 26,
            "primary_color": "&H00FFFFFF",
            "highlight_color": "&H000055FF",    # Neon Orange
            "outline_color": "&H00000000",
            "outline_width": 4.0,
            "shadow_offset": 2.5,
            "alignment": 2,
            "margin_v": 230,
            "uppercase": True,
            "max_words_per_line": 3
        },
        "sound_effects_enabled": True
    },
    "CINEMATIC_STORY": {
        "name": "CINEMATIC_STORY",
        "description": "Narrative pacing with smooth subtle pans, letterbox-free vertical composition, and elegant subtitles.",
        "aspect_ratio": "9:16",
        "width": 1080,
        "height": 1920,
        "fps": 24,
        "zoom_intensity": 1.08,
        "enable_zooms": True,
        "enable_captions": True,
        "dead_air_removal": False,
        "caption_style": {
            "font_name": "Georgia",
            "font_size": 21,
            "primary_color": "&H00FFFFFF",
            "highlight_color": "&H00FFD700",    # Gold highlight
            "outline_color": "&H00000000",
            "outline_width": 2.5,
            "shadow_offset": 1.5,
            "alignment": 2,
            "margin_v": 280,
            "uppercase": False,
            "max_words_per_line": 5
        },
        "sound_effects_enabled": False
    },
    "EDUCATIONAL_SHORT": {
        "name": "EDUCATIONAL_SHORT",
        "description": "Crisp upper/lower third placement with key term highlight cards, clear articulation pacing, and zero clutter.",
        "aspect_ratio": "9:16",
        "width": 1080,
        "height": 1920,
        "fps": 30,
        "zoom_intensity": 1.05,
        "enable_zooms": False,
        "enable_captions": True,
        "dead_air_removal": False,
        "caption_style": {
            "font_name": "Arial",
            "font_size": 22,
            "primary_color": "&H00FFFFFF",
            "highlight_color": "&H00FF9900",    # Bright Azure / Amber
            "outline_color": "&H00222222",
            "outline_width": 3.0,
            "shadow_offset": 1.5,
            "alignment": 2,
            "margin_v": 260,
            "uppercase": False,
            "max_words_per_line": 5
        },
        "sound_effects_enabled": False
    }
}


def get_preset(name: str) -> Dict[str, Any]:
    """Get preset configuration with fallback to STREAMER_HYPE."""
    return PRESET_DEFINITIONS.get(name, PRESET_DEFINITIONS["STREAMER_HYPE"])
