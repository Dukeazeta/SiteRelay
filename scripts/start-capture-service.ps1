$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$serverEntryPoint = Join-Path $projectDirectory "apps\capture-service\dist\server.js"
$nodeExecutable = "C:\Program Files\nodejs\node.exe"
$logDirectory = Join-Path $projectDirectory ".logs"
$startupLog = Join-Path $logDirectory "capture-service-startup.log"
$serviceLog = Join-Path $logDirectory "capture-service.log"
$serviceErrorLog = Join-Path $logDirectory "capture-service-error.log"

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

function Write-StartupLog {
    param([string]$Message)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -LiteralPath $startupLog -Value "[$timestamp] $Message"
}

Write-StartupLog "Startup check began."

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4319/health" -TimeoutSec 1
    if ($health.ok) {
        Write-StartupLog "Service is already healthy."
        exit 0
    }
} catch {
    Write-StartupLog "Service is not running; attempting to start it."
}

if (-not (Test-Path -LiteralPath $serverEntryPoint)) {
    Write-StartupLog "Server entry point is missing: $serverEntryPoint"
    throw "SiteRelay capture service has not been built: $serverEntryPoint"
}

if (-not (Test-Path -LiteralPath $nodeExecutable)) {
    Write-StartupLog "Node.js executable is missing: $nodeExecutable"
    throw "Node.js was not found: $nodeExecutable"
}

$process = Start-Process `
    -FilePath $nodeExecutable `
    -ArgumentList ('"' + $serverEntryPoint + '"') `
    -WorkingDirectory $projectDirectory `
    -WindowStyle Hidden `
    -RedirectStandardOutput $serviceLog `
    -RedirectStandardError $serviceErrorLog `
    -PassThru

Write-StartupLog "Started service process $($process.Id)."
