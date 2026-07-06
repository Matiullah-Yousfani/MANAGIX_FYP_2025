# Stop MANAGIX local dev: backend (7005), frontend (5173), AI services.
# Usage: .\scripts\stop-local.ps1

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "_managix-common.ps1")

Write-Host "Stopping MANAGIX local stack..." -ForegroundColor Yellow
Stop-ManagixLocalStack -ScriptsDir $PSScriptRoot -IncludeAi
Write-Host "Local stack stopped." -ForegroundColor Green
