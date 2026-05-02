# Stop whatever is listening on port 8000 (Resume Parser FastAPI).
$ErrorActionPreference = "SilentlyContinue"
$conns = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
foreach ($c in $conns) {
    $procId = $c.OwningProcess
    if ($procId -and $procId -ne 0) {
        Write-Host "Stopping PID $procId on port 8000..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
# Fallback if Get-NetTCPConnection unavailable
if (-not $conns) {
    netstat -ano | Select-String ":8000.*LISTENING" | ForEach-Object {
        $parts = ($_ -split '\s+') | Where-Object { $_ }
        $p = $parts[-1]
        if ($p -match '^\d+$' -and [int]$p -gt 0) {
            Write-Host "Stopping PID $p (netstat fallback)..."
            taskkill /PID $p /F 2>$null
        }
    }
}
Write-Host "Port 8000 should be free. Done."
