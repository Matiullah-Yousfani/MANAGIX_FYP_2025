# Shared helpers for MANAGIX dev scripts (dot-source from start/stop scripts).

function Get-ManagixRoot {
    Split-Path -Parent $PSScriptRoot
}

function Test-PortListening([int]$Port, [string]$HostName = "127.0.0.1") {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $tcp.Connect($HostName, $Port)
        $tcp.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForPort([int]$Port, [string]$Name, [int]$TimeoutSec = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening $Port) {
            Write-Host "  OK  $Name listening on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
        Write-Host "  ... waiting for $Name (port $Port)" -ForegroundColor DarkGray
    }
    Write-Host "  FAIL $Name did not start on port $Port within ${TimeoutSec}s" -ForegroundColor Red
    return $false
}

function Stop-PortListeners([int[]]$Ports) {
    foreach ($port in $Ports) {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $conns) {
            $procId = $c.OwningProcess
            if ($procId -and $procId -ne 0) {
                Write-Host "Stopping PID $procId on port $port..." -ForegroundColor Yellow
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

function Resolve-FrontendDir([string]$Root) {
    $candidates = @(
        (Join-Path $Root "MANAGIX_FRONTEND\managix"),
        (Join-Path $Root "MANAGIX_Frontend\managix")
    )
    foreach ($dir in $candidates) {
        if (Test-Path (Join-Path $dir "package.json")) { return $dir }
    }
    throw "Frontend not found. Expected MANAGIX_FRONTEND\managix\package.json"
}

function Resolve-FuncExe {
    $cmd = Get-Command func -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $npmFunc = Join-Path $env:APPDATA "npm\func.cmd"
    if (Test-Path $npmFunc) { return $npmFunc }

    $releasesRoot = Join-Path $env:LOCALAPPDATA "AzureFunctionsTools\Releases"
    if (Test-Path $releasesRoot) {
        $dirs = Get-ChildItem $releasesRoot -Directory -ErrorAction SilentlyContinue |
            Sort-Object { try { [version]($_.Name -replace '^(\d+\.\d+).*', '$1') } catch { [version]'0.0' } } -Descending
        foreach ($d in $dirs) {
            $exe = Join-Path $d.FullName "cli_x64\func.exe"
            if (Test-Path $exe) { return $exe }
        }
    }

    return $null
}

function Require-FuncExe {
    $funcExe = Resolve-FuncExe
    if (-not $funcExe) {
        Write-Host "ERROR: Azure Functions Core Tools (func) not found." -ForegroundColor Red
        Write-Host "Install one of:" -ForegroundColor Yellow
        Write-Host "  winget install Microsoft.Azure.FunctionsCoreTools" -ForegroundColor White
        Write-Host "  npm install -g azure-functions-core-tools@4 --unsafe-perm true" -ForegroundColor White
        Write-Host "  https://github.com/Azure/azure-functions-core-tools" -ForegroundColor White
        exit 1
    }
    return $funcExe
}

function Require-Npm {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: npm not found. Install Node.js." -ForegroundColor Red
        exit 1
    }
}

function Require-Ngrok {
    if (-not (Get-Command ngrok -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: ngrok not found. Install: winget install ngrok.ngrok" -ForegroundColor Red
        exit 1
    }
}

function Start-ManagixBackend([string]$Root, [string]$FuncExe) {
    $backendDir = Join-Path $Root "MANAGIX_BACKEND\MANAGIX_FYP_2025"
    if (-not (Test-Path (Join-Path $backendDir "host.json"))) {
        throw "Backend not found at $backendDir"
    }
    $funcQuoted = "'$FuncExe'"
    $backendCmd = "Set-Location '$backendDir'; Write-Host 'MANAGIX Backend - building...' -ForegroundColor Cyan; dotnet build -v q; if (`$LASTEXITCODE -ne 0) { Write-Host 'Build failed.' -ForegroundColor Red; exit `$LASTEXITCODE }; Write-Host 'MANAGIX Backend - port 7005 (func start)' -ForegroundColor Cyan; & $funcQuoted start"
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $backendCmd)
    return $backendDir
}

function Start-ManagixFrontend([string]$FrontendDir) {
    $frontendCmd = "Set-Location '$FrontendDir'; Write-Host 'MANAGIX Frontend - port 5173' -ForegroundColor Cyan; npm run dev"
    Start-Process -FilePath "powershell.exe" -ArgumentList @("-NoExit", "-Command", $frontendCmd)
}

function Start-ManagixAi([string]$ScriptsDir, [switch]$StopFirst) {
    & (Join-Path $ScriptsDir "start-ai-services.ps1") -StopFirst:$StopFirst
}

function Stop-ManagixAi([string]$ScriptsDir) {
    & (Join-Path $ScriptsDir "stop-ai-services.ps1")
}

function Stop-ManagixNgrok {
    Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
}

function Stop-ManagixLocalStack([string]$ScriptsDir, [switch]$IncludeAi) {
    if ($IncludeAi) {
        Stop-ManagixAi $ScriptsDir
    }
    Stop-PortListeners @(7005, 5173)
}

function Start-ManagixCore(
    [string]$Root,
    [string]$ScriptsDir,
    [switch]$SkipAi,
    [switch]$StopFirst
) {
    $funcExe = Require-FuncExe
    Require-Npm
    $frontendDir = Resolve-FrontendDir $Root

    if ($StopFirst) {
        Write-Host "Stopping stale local processes..." -ForegroundColor Yellow
        if (-not $SkipAi) { Stop-ManagixAi $ScriptsDir }
        Stop-PortListeners @(7005, 5173)
        Start-Sleep -Seconds 2
    }

    Write-Host "Starting backend..." -ForegroundColor Cyan
    $backendDir = Start-ManagixBackend $Root $funcExe

    if (-not $SkipAi) {
        Write-Host "Starting AI services (8000, 8001, 8002)..." -ForegroundColor Cyan
        Start-ManagixAi $ScriptsDir -StopFirst:$false
    }
    else {
        Write-Host "Skipping AI services." -ForegroundColor DarkGray
    }

    Write-Host "Starting frontend..." -ForegroundColor Cyan
    Start-ManagixFrontend $frontendDir

    Write-Host ""
    Write-Host "Waiting for services..." -ForegroundColor Yellow
    $backendOk = Wait-ForPort 7005 "Backend"
    $frontendOk = Wait-ForPort 5173 "Frontend"

    if (-not $SkipAi) {
        foreach ($p in @(8000, 8001, 8002)) {
            $null = Wait-ForPort $p "AI service" 90
        }
    }

    if (-not $backendOk -or -not $frontendOk) {
        Write-Host "Required services failed to start. Check the PowerShell windows." -ForegroundColor Red
        exit 1
    }

    return @{
        BackendDir  = $backendDir
        FrontendDir = $frontendDir
    }
}
