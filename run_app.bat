@echo off
REM Launcher script for Plant Disease Detection Streamlit App
cd /d "%~dp0"

IF EXIST "venv\Scripts\streamlit.exe" (
    echo Starting Plant Disease Detection with virtual environment...
    "venv\Scripts\streamlit.exe" run app.py
) ELSE (
    echo Virtual environment not detected at default path. Using system streamlit...
    streamlit run app.py
)
pause
