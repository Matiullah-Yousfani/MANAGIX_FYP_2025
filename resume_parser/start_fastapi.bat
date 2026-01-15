@echo off
echo ========================================
echo Starting Resume Parser FastAPI Service
echo ========================================
echo.

REM Check if .env file exists
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create a .env file with your GROQ_API_KEY
    echo.
    echo Example:
    echo GROQ_API_KEY=your_api_key_here
    echo.
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo Installing/Updating dependencies...
pip install -r requirements_fastapi.txt

echo.
echo Starting FastAPI service on http://localhost:8000
echo Press Ctrl+C to stop the service
echo.

python fastapi_app.py
