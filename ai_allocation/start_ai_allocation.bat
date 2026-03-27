@echo off
echo ========================================
echo   AI Allocation Service - Starting...
echo ========================================

cd /d "%~dp0"

if exist "venv\Scripts\activate.bat" (
    echo [INFO] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [INFO] No virtual environment found. Installing dependencies globally...
    pip install -r requirements.txt
)

echo [INFO] Starting AI Allocation FastAPI service on port 8002...
py ai_allocation_app.py

pause
