# Start MANAGIX locally: backend + frontend + AI (no ngrok).
# Usage: .\scripts\start-local.ps1
#        .\scripts\start-local.ps1 -SkipAi

param(
    [switch]$SkipAi,
    [switch]$StopFirst = $true
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_managix-common.ps1")
$Root = Get-ManagixRoot
Set-Location $Root

Write-Host ""
Write-Host "=== MANAGIX - local dev ===" -ForegroundColor Cyan
Write-Host ""

$info = Start-ManagixCore -Root $Root -ScriptsDir $PSScriptRoot -SkipAi:$SkipAi -StopFirst:$StopFirst

Write-Host ""
Write-Host "=== Ready (local) ===" -ForegroundColor Green
Write-Host "  App:  http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  API:  http://127.0.0.1:7005" -ForegroundColor White
if (-not $SkipAi) {
    Write-Host "  AI:   http://127.0.0.1:8000 / 8001 / 8002" -ForegroundColor White
}
Write-Host ""
Write-Host "Stop: .\scripts\stop-local.ps1" -ForegroundColor Gray
