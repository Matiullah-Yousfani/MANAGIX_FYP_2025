# Start all Managix Python AI services (requires GROQ_API_KEY in .env under each app or shared).
#   8000 — Resume CV parse (resume_parser/fastapi_app)
#   8001 — Project plan (resume_parser/ai_planner)
#   8002 — Team & task allocation (ai_allocation/ai_allocation_app)
#
# Usage: .\start-ai-services.ps1              # 3 new PowerShell windows
#        .\start-ai-services.ps1 -StopFirst   # stop ports 8000-8002 then start (default with new windows)

param(
    [switch]$Foreground,
    [switch]$StopFirst = $true
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$resumeRoot = Join-Path $root "resume_parser"
$allocRoot = Join-Path $root "ai_allocation"

function Get-Python([string]$dir) {
    $venv = Join-Path $dir "venv\Scripts\python.exe"
    if (Test-Path $venv) { return $venv }
    return "python"
}

$pyResume = Get-Python $resumeRoot
$pyAlloc = Get-Python $allocRoot

if (-not $Foreground -and $StopFirst) {
    & "$PSScriptRoot\stop-ai-services.ps1"
    Start-Sleep -Seconds 1
}

function Start-AiWindow([string]$title, [string]$workDir, [string]$command) {
    if ($Foreground) {
        Set-Location $workDir
        Write-Host "`n=== $title ===" -ForegroundColor Cyan
        Invoke-Expression $command
    } else {
        $c = "Set-Location `"$workDir`"; Write-Host `"$title`" -ForegroundColor Cyan; $command"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $c
    }
}

# 8000 — resume parser
Start-AiWindow "Resume Parser :8000" $resumeRoot "& `"$pyResume`" -m uvicorn fastapi_app:app --host 127.0.0.1 --port 8000"

if (-not $Foreground) { Start-Sleep -Milliseconds 600 }

# 8001 — planner (script entrypoint)
Start-AiWindow "AI Planner :8001" $resumeRoot "& `"$pyResume`" `"$resumeRoot\ai_planner.py`""

if (-not $Foreground) { Start-Sleep -Milliseconds 600 }

# 8002 — allocation
Start-AiWindow "AI Allocation :8002" $allocRoot "& `"$pyAlloc`" -m uvicorn ai_allocation_app:app --host 127.0.0.1 --port 8002"

if (-not $Foreground) {
    Write-Host "`nStarted 3 windows. URLs:" -ForegroundColor Green
    Write-Host "  http://127.0.0.1:8000/       Resume Parser"
    Write-Host "  http://127.0.0.1:8001/docs    AI Planner"
    Write-Host "  http://127.0.0.1:8002/docs    AI Allocation"
}
