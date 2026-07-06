# Stop MANAGIX ngrok stack: ngrok + backend + frontend + AI.
# Usage: .\scripts\stop-ngrok.ps1

$ErrorActionPreference = "SilentlyContinue"
. (Join-Path $PSScriptRoot "_managix-common.ps1")

Write-Host "Stopping MANAGIX ngrok stack..." -ForegroundColor Yellow
Stop-ManagixNgrok
Stop-ManagixLocalStack -ScriptsDir $PSScriptRoot -IncludeAi
Write-Host "Ngrok stack stopped." -ForegroundColor Green
