@echo off
REM Launcher script for PlantGuard AI Full-Stack Platform (FastAPI + React)
cd /d "%~dp0"

echo ========================================================
echo  Starting PlantGuard AI Full-Stack Application
echo  Backend: FastAPI (Port 8000)
echo  Frontend: React SPA (Served at http://127.0.0.1:8000)
echo ========================================================

IF EXIST "venv\Scripts\python.exe" (
    set PYTHONPATH=.
    "venv\Scripts\python.exe" -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
) ELSE (
    set PYTHONPATH=.
    python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
)
pause
