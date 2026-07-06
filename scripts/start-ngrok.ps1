# Start MANAGIX for public access: backend + frontend + AI + ngrok tunnel.
# Usage: .\scripts\start-ngrok.ps1
#        .\scripts\start-ngrok.ps1 -SkipAi

param(
    [switch]$SkipAi,
    [switch]$StopFirst = $true
)

$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "_managix-common.ps1")
$Root = Get-ManagixRoot
Set-Location $Root
Require-Ngrok

Write-Host ""
Write-Host "=== MANAGIX - ngrok (full stack) ===" -ForegroundColor Cyan
Write-Host ""

if ($StopFirst) {
    Write-Host "Stopping stale ngrok..." -ForegroundColor Yellow
    Stop-ManagixNgrok
}

$info = Start-ManagixCore -Root $Root -ScriptsDir $PSScriptRoot -SkipAi:$SkipAi -StopFirst:$StopFirst

Write-Host ""
Write-Host "Starting ngrok tunnel on port 5173..." -ForegroundColor Cyan
& (Join-Path $PSScriptRoot "start-ngrok-tunnel.ps1")

Write-Host ""
Write-Host "=== Ready (ngrok) ===" -ForegroundColor Green
Write-Host "Share the ngrok URL printed above. Keep all windows open." -ForegroundColor Yellow
Write-Host "Stop: .\scripts\stop-ngrok.ps1" -ForegroundColor Gray
