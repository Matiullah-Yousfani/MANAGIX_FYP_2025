# Stop Managix Python AI services (resume parser, project planner, allocation).
$ports = 8000, 8001, 8002
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        if ($procId -and $procId -ne 0) {
            Write-Host "Stopping PID $procId on port $port..."
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}
Write-Host "Ports 8000, 8001, 8002 cleared."
