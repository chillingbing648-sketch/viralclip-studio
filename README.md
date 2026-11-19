# ⚡ ViralClip Studio
### Professional AI YouTube & Livestream Short-Form Video Clipping Platform
> **Target Platforms:** YouTube Shorts & Instagram Reels (1080 × 1920, 9:16 vertical)  
> **Editing Identity:** High-energy streamer editing inspired by top gaming creators and viral livestream highlights.  
> **Live Demo (GitHub Pages):** [https://chillingbing648-sketch.github.io/viralclip-studio/](https://chillingbing648-sketch.github.io/viralclip-studio/)

---

## 🚀 Overview

**ViralClip Studio** is a production-grade, full-stack video clipping and editing workstation that automates the transformation of long-form videos, podcasts, and live streams into viral, platform-optimized short-form videos.

Instead of relying on simplistic keyword searches, ViralClip Studio employs a **multi-signal AI detection pipeline** that correlates:
1. **Linguistic Excitement Markers & Dialogue Hooks** via `faster-whisper` word-level timestamps.
2. **Audio Energy & Screaming Peaks** via FFmpeg `volumedetect` and RMS variance.
3. **Visual Shot Transitions & Clutches** via `PySceneDetect`.
4. **Context Preservation**: Guarantees complete conversational setups and punchline payoffs without sentence truncation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, SQLite (production-switchable to PostgreSQL), Pydantic v2 |
| **Video Engine** | FFmpeg 9.0+, FFprobe, OpenCV, PySceneDetect |
| **AI & Transcription** | faster-whisper (CTranslate2), Whisper-base/large-v3, word-level timestamp alignment |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide React |
| **Architecture** | Asynchronous background rendering worker, rolling buffer live segmentation, automated QC pipeline |

---

## 🎯 12 Core Application Workspaces

1. **Dashboard**
   - Displays real-time database metrics: Total Sources, Highlights Detected, Awaiting Review, Approved Clips, Completed Exports, Average Viral Score, and Publishing Status.
   - Quick workflow launcher cards and recent activity tables.
2. **YouTube URL Import**
   - Ingests verified metadata references (via YouTube oEmbed & yt-dlp metadata) for YouTube videos and livestreams.
   - *Platform Compliance:* Respects YouTube Terms of Service by never bypassing DRM, authentication, or access controls. Creators attach authorized source video files to the URL record.
3. **Video Upload**
   - Drag-and-drop ingestion of MP4, MOV, MKV files.
   - Automatically probes audio/video streams, frame rates, resolutions, and extracts a representative thumbnail at the 10% timestamp.
4. **Live Clipping Studio**
   - Ingests authorized RTMP and HLS live media feeds into a 30-second segmented rolling buffer.
   - Enables live timestamp clipping while the live stream is in progress.
5. **AI Highlight Detector**
   - Scans full transcripts and audio tracks to extract top viral candidate moments.
   - Displays 5-pillar viral score breakdowns, category tags (`reaction`, `gaming`, `screaming`, `punchline`, `storytelling`, `educational`), and context summaries.
6. **Clip Review**
   - Classification tier filtering (`Priority 90-100`, `Strong 75-89`, `Possible 60-74`, `Low <60`).
   - One-click approval/rejection and start/end timestamp nudging.
7. **Video Editor**
   - Interactive 9:16 vertical video player with timeline scrub handles.
   - Smart Reframing with face tracking and horizontal crop anchor slider (`0%` left to `100%` right).
   - Dynamic punch-in zoom toggle (1.15x to 1.35x scale keyframing).
   - Word-by-word animated SubStation Alpha (`.ass`) karaoke captions with safe area placement.
   - 5 editing presets: `STREAMER_HYPE`, `PODCAST_CLEAN`, `GAMING_REACTION`, `CINEMATIC_STORY`, `EDUCATIONAL_SHORT`.
8. **Rendering Queue**
   - Real-time rendering progress tracking (1080x1920 H.264/AAC MP4).
   - Detailed stage logs and automated QC status indicators.
9. **Export Library**
   - 9:16 vertical video cards with direct preview modal and download links.
   - Automated QC report badges (`PASSED`, `WARNING`, `FAILED`).
   - Integrated Publishing Drawer with AI-generated metadata.
10. **Creator Rights Management**
    - Tracks creator authorizations, music licensing, distribution rights, and monetization clearance.
    - Export Gating: Automatically blocks rendering if rights clearance is missing or unauthorized.
11. **Analytics**
    - Complete conversion funnel (Source Videos → Highlights → Approved → Rendered → Published).
    - Score distribution charts and average duration tracking.
12. **Settings**
    - Configurable 5-pillar viral scoring weights (Hook, Emotion, Entertainment, Context, Editing).
    - Score classification thresholds and binary diagnostic paths.

---

## 🏆 Automated Quality Control (QC) Engine

Before any export is marked as `PASSED`, the rendering engine executes an automated multi-point audit:
- **Aspect Ratio Verification:** Validates that dimensions match exactly 1080 × 1920 (aspect ratio = 0.5625).
- **Audio Stream Verification:** Checks for valid AAC audio stream presence and audio level integrity.
- **Black Frame Detection:** Scans the rendered video via FFmpeg `blackdetect` to flag freeze frames or black screen glitches.
- **Platform Duration Gating:** Validates duration against YouTube Shorts (<60s) and Instagram Reels (<90s).

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.11+**
- **Node.js 18+ & npm**
- **FFmpeg & FFprobe 6.0+** (Available in PATH or installed via winget: `winget install Gyan.FFmpeg`)

### 2. Install Dependencies

**Backend:**
```bash
pip install fastapi uvicorn pydantic pydantic-settings sqlalchemy aiosqlite greenlet numpy opencv-python yt-dlp faster-whisper ctranslate2 onnxruntime scipy scenedetect
```

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
```

### 3. Start Backend Server
```bash
# From workspace root:
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Backend will be live at: `http://127.0.0.1:8000`  
Interactive Swagger API documentation: `http://127.0.0.1:8000/docs`

### 4. Start Frontend Studio
```bash
# In a separate terminal:
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
Frontend will be accessible at: `http://127.0.0.1:5173`

---

## 🧪 Automated Test Suites

### Run End-to-End Video Processing Pipeline Test
Synthesizes 1080p footage, runs transcription, multi-signal highlight detection, smart reframing, animated karaoke caption generation, 1080x1920 vertical video rendering, and automated QC verification:
```bash
python tests/test_pipeline.py
```

### Run API Verification Test Suite
Validates all 10 core API route modules against the live server:
```bash
python tests/test_api_endpoints.py
```

---

## 📂 Project Architecture

```
CLIPS/
├── backend/
│   ├── config.py                 # Binary auto-discovery, paths, default weights
│   ├── main.py                   # FastAPI application, CORS, static mounts
│   ├── database/
│   │   ├── models.py             # SQLAlchemy relational schema
│   │   └── db.py                 # Async and sync database session managers
│   ├── ingestion/
│   │   ├── source_manager.py     # FFprobe metadata extraction, thumbnailing
│   │   ├── youtube_metadata.py   # Compliant YouTube URL reference importer
│   │   └── live_feed.py          # RTMP/HLS segmented rolling buffer manager
│   ├── transcription/
│   │   └── transcriber.py        # faster-whisper word-level transcription engine
│   ├── detection/
│   │   └── highlight_detector.py # Multi-signal viral moment analyzer
│   ├── scoring/
│   │   └── viral_scorer.py       # 5-pillar weighted scoring & classification
│   ├── editing/
│   │   ├── presets.py            # STREAMER_HYPE and 4 other preset configs
│   │   └── dynamic_editor.py     # Punch-in zooms & silence removal
│   ├── reframing/
│   │   └── smart_reframe.py      # Face tracking & 9:16 vertical reframer
│   ├── captions/
│   │   └── caption_generator.py  # Advanced SubStation Alpha (.ass) generator
│   ├── rendering/
│   │   └── render_engine.py      # FFmpeg 1080x1920 pipeline & automated QC
│   ├── rights/
│   │   └── rights_manager.py     # Rights clearance verification & export gating
│   ├── publishing/
│   │   └── publishing_assistant.py # AI viral titles, hashtags & pinned comments
│   ├── analytics/
│   │   └── analytics_service.py  # Real database metrics & funnel aggregation
│   └── api/                      # 10 modular REST API route controllers
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Root component with dynamic view router
│   │   ├── components/Sidebar.tsx# Navigation sidebar with real-time badges
│   │   ├── services/api.ts       # Typed REST API client
│   │   └── pages/                # 12 workstation UI views
│   └── index.html                # Dark streamer theme & Tailwind CSS setup
│
├── storage/                      # Persistent database & media storage
│   ├── originals/                # Ingested long-form footage
│   ├── transcripts/              # SRT and JSON transcript files
│   ├── previews/                 # Thumbnails and ASS subtitle files
│   ├── exports/                  # Completed 1080x1920 vertical Short/Reel MP4s
│   └── viralclip.db              # SQLite relational database
│
└── tests/
    ├── test_pipeline.py          # End-to-end rendering pipeline integration test
    └── test_api_endpoints.py     # Automated API verification test suite
```

---

## 🔒 Rights Management & Compliance Notice
- **YouTube Terms of Service:** ViralClip Studio does not perform unauthorized stream ripping or DRM circumvention. YouTube URLs are ingested for permitted metadata cataloging; users attach authorized media files.
- **Publishing Gate:** In strict adherence to creator ownership policies, publishing requires human approval and cannot be executed automatically without authorization.
