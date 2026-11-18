import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings, STORAGE_DIR, PREVIEWS_DIR, EXPORTS_DIR, ORIGINALS_DIR
from backend.database.db import init_db
from backend.api.routes_sources import router as sources_router
from backend.api.routes_transcription import router as transcription_router
from backend.api.routes_highlights import router as highlights_router
from backend.api.routes_editor import router as editor_router
from backend.api.routes_render import router as render_router
from backend.api.routes_rights import router as rights_router
from backend.api.routes_publishing import router as publishing_router
from backend.api.routes_live import router as live_router
from backend.api.routes_analytics import router as analytics_router
from backend.api.routes_settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    await init_db()
    print("✓ ViralClip Studio Database initialized.")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Professional AI YouTube & Livestream Short-Form Video Clipping Platform",
    lifespan=lifespan
)

# CORS configuration for development & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static storage directories for media preview and streaming
app.mount("/storage/previews", StaticFiles(directory=str(PREVIEWS_DIR)), name="previews")
app.mount("/storage/exports", StaticFiles(directory=str(EXPORTS_DIR)), name="exports")
app.mount("/storage/originals", StaticFiles(directory=str(ORIGINALS_DIR)), name="originals")

# Register API Routers under /api/v1
api_prefix = settings.API_V1_STR
app.include_router(sources_router, prefix=api_prefix)
app.include_router(transcription_router, prefix=api_prefix)
app.include_router(highlights_router, prefix=api_prefix)
app.include_router(editor_router, prefix=api_prefix)
app.include_router(render_router, prefix=api_prefix)
app.include_router(rights_router, prefix=api_prefix)
app.include_router(publishing_router, prefix=api_prefix)
app.include_router(live_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)
app.include_router(settings_router, prefix=api_prefix)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ffmpeg": bool(settings.FFMPEG_BIN and os.path.exists(settings.FFMPEG_BIN)),
        "ffprobe": bool(settings.FFPROBE_BIN and os.path.exists(settings.FFPROBE_BIN))
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
