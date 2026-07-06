# Quick fix for ERR_NGROK_8012 — restarts ngrok after Vite is back up.
# Run from repo root:  .\scripts\restart-ngrok.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$viteUp = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", 5173)
    $tcp.Close()
    $viteUp = $true
}
catch { }

if (-not $viteUp) {
    Write-Host ""
    Write-Host "ERR_NGROK_8012 fix: Vite is NOT running on port 5173." -ForegroundColor Red
    Write-Host ""
    Write-Host "1. Open a terminal and run (keep it open):" -ForegroundColor Yellow
    Write-Host "     cd MANAGIX_FRONTEND\managix" -ForegroundColor White
    Write-Host "     npm run dev" -ForegroundColor White
    Write-Host "2. Wait for 'ready' and http://localhost:5173/" -ForegroundColor Yellow
    Write-Host "3. Run this script again:  .\scripts\restart-ngrok.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "Vite is up on 5173. Restarting ngrok..." -ForegroundColor Green
& (Join-Path $Root "scripts\start-ngrok-tunnel.ps1")
