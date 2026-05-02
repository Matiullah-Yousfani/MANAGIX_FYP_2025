# Start Resume Parser (FastAPI) on http://127.0.0.1:8000
# Usage: .\dev-start.ps1           # foreground
#        .\dev-start.ps1 -Detached # new window (keep running after closing this terminal)
param(
    [switch]$Detached
)

$root = $PSScriptRoot
Set-Location $root

$py = if (Test-Path "$root\venv\Scripts\python.exe") {
    "$root\venv\Scripts\python.exe"
} else {
    "python"
}

Write-Host "Using Python: $py"
& $py -c "import uvicorn" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Install deps: pip install -r requirements_fastapi.txt"
    exit 1
}

if (-not (Test-Path "$root\.env")) {
    Write-Host "Warning: no .env in resume_parser — set GROQ_API_KEY for parsing to work."
}

$args = @("-m", "uvicorn", "fastapi_app:app", "--host", "127.0.0.1", "--port", "8000")
if ($Detached) {
    $cmd = "Set-Location '$root'; & '$py' -m uvicorn fastapi_app:app --host 127.0.0.1 --port 8000"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
    Write-Host "Started in a new window. Health: http://127.0.0.1:8000/"
} else {
    Write-Host "Resume Parser: http://127.0.0.1:8000/ (Ctrl+C to stop)"
    & $py @args
}
