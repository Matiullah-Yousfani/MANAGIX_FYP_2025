# Export MANAGIX UML diagrams (neutral / textbook style)
# Uses a local npm install so puppeteer is available (npx --version alone often fails on Node 24).
param(
    [int]$Scale = 3,
    [string]$Width = "2400"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root "Documentation\diagrams\source"
$outDir = Join-Path $root "Documentation\diagrams\uml"
$config = Join-Path $root "Documentation\diagrams\mermaid-config.json"
$toolsDir = Join-Path $root "Documentation\diagrams\.mermaid-tools"

if (-not (Test-Path $srcDir)) {
    Write-Host "Source folder not found: $srcDir" -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$pkgJson = Join-Path $toolsDir "package.json"
if (-not (Test-Path $pkgJson)) {
    @'
{
  "name": "managix-diagram-export",
  "private": true,
  "dependencies": {
    "@mermaid-js/mermaid-cli": "11.4.0",
    "puppeteer": "23.11.1"
  }
}
'@ | Set-Content -Path $pkgJson -Encoding UTF8
}

Push-Location $toolsDir
try {
    if (-not (Test-Path "node_modules\@mermaid-js\mermaid-cli")) {
        Write-Host "Installing Mermaid CLI + puppeteer (one-time)..." -ForegroundColor Cyan
        npm install --no-fund --no-audit 2>&1 | Write-Host
        if ($LASTEXITCODE -ne 0) {
            Write-Host "npm install failed. Use Mermaid Live instead: https://mermaid.live" -ForegroundColor Yellow
            exit 1
        }
    }

    $mmdc = Join-Path $toolsDir "node_modules\.bin\mmdc.cmd"
    if (-not (Test-Path $mmdc)) {
        Write-Host "mmdc not found after install." -ForegroundColor Red
        exit 1
    }

    $files = Get-ChildItem $srcDir -Filter "*.mmd"
    foreach ($f in $files) {
        $outName = [System.IO.Path]::GetFileNameWithoutExtension($f.Name) + ".png"
        $outPath = Join-Path $outDir $outName
        Write-Host "Rendering $($f.Name) -> uml\$outName (${Scale}x)" -ForegroundColor Yellow
        & $mmdc -i $f.FullName -o $outPath -c $config -b white -s $Scale -w $Width
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    }

    Write-Host "`nDone. PNGs:" -ForegroundColor Green
    Get-ChildItem $outDir -Filter "*.png" | Format-Table Name, Length -AutoSize
}
finally {
    Pop-Location
}
