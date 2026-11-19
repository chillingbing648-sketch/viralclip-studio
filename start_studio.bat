@echo off
title ViralClip Studio Launcher
echo ============================================================
echo Starting ViralClip Studio (FastAPI Backend + Vite Frontend)
echo ============================================================

start "ViralClip Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"
start "ViralClip Frontend" cmd /k "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"

echo.
echo Services launched!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://127.0.0.1:5173
echo.
pause
