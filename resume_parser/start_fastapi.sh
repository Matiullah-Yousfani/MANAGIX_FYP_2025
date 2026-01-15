#!/bin/bash

echo "========================================"
echo "Starting Resume Parser FastAPI Service"
echo "========================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "ERROR: .env file not found!"
    echo "Please create a .env file with your GROQ_API_KEY"
    echo ""
    echo "Example:"
    echo "GROQ_API_KEY=your_api_key_here"
    echo ""
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

echo "Installing/Updating dependencies..."
pip3 install -r requirements_fastapi.txt

echo ""
echo "Starting FastAPI service on http://localhost:8000"
echo "Press Ctrl+C to stop the service"
echo ""

python3 fastapi_app.py
