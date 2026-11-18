import re
import urllib.parse
from typing import Dict, Any, Optional
import httpx
import yt_dlp


YOUTUBE_URL_PATTERNS = [
    r"(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})",
    r"(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})",
    r"(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})",
    r"(?:https?:\/\/)?(?:www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]{11})",
]


def extract_youtube_video_id(url: str) -> Optional[str]:
    """Extract 11-character YouTube video ID from various standard YouTube URL formats."""
    for pattern in YOUTUBE_URL_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
            
    # Try parsing query param directly
    parsed = urllib.parse.urlparse(url)
    if "youtube.com" in parsed.netloc:
        qs = urllib.parse.parse_qs(parsed.query)
        if "v" in qs and qs["v"]:
            return qs["v"][0]
            
    return None


async def fetch_youtube_oembed(url: str) -> Dict[str, Any]:
    """Fetch permitted public metadata from YouTube's official oEmbed endpoint."""
    oembed_endpoint = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(oembed_endpoint)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title", "Untitled YouTube Video"),
                    "author_name": data.get("author_name", "YouTube Creator"),
                    "thumbnail_url": data.get("thumbnail_url"),
                    "type": data.get("type", "video"),
                    "status": "permitted"
                }
    except Exception as e:
        print(f"oEmbed lookup notice: {e}")
    return {}


def extract_youtube_metadata_safe(url: str) -> Dict[str, Any]:
    """
    Extract public metadata (title, channel, duration, thumbnail) without downloading
    or bypassing DRM / platform access restrictions.
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return {
            "valid": False,
            "error": "Invalid YouTube URL format. Please provide a standard watch or share link."
        }

    ydl_opts = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            title = info.get("title") or f"YouTube Video ({video_id})"
            channel = info.get("channel") or info.get("uploader") or "YouTube Creator"
            duration = float(info.get("duration") or 0.0)
            thumbnails = info.get("thumbnails", [])
            thumbnail_url = thumbnails[-1].get("url") if thumbnails else f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"
            is_live = info.get("is_live", False)
            view_count = info.get("view_count")

            return {
                "valid": True,
                "video_id": video_id,
                "title": title,
                "creator_name": channel,
                "channel_name": channel,
                "duration_seconds": duration,
                "thumbnail_url": thumbnail_url,
                "source_url": url,
                "is_live": is_live,
                "view_count": view_count,
                "source_access_status": "Metadata Verified (Requires authorized creator media attachment)",
                "rights_status": "pending_review",
            }
    except Exception as e:
        # Fallback to standard oEmbed / video ID defaults
        return {
            "valid": True,
            "video_id": video_id,
            "title": f"YouTube Video ({video_id})",
            "creator_name": "YouTube Creator",
            "channel_name": "YouTube Creator",
            "duration_seconds": 0.0,
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
            "source_url": url,
            "is_live": False,
            "source_access_status": f"Public Reference Recorded ({str(e)[:100]})",
            "rights_status": "pending_review",
        }
