$ErrorActionPreference = "Stop"

$projectDirectory = Split-Path -Parent $PSScriptRoot
$serverEntryPoint = Join-Path $projectDirectory "apps\capture-service\dist\server.js"

try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:4319/health" -TimeoutSec 1
    if ($health.ok) {
        exit 0
    }
} catch {
    # The service is not running yet.
}

if (-not (Test-Path -LiteralPath $serverEntryPoint)) {
    throw "SiteRelay capture service has not been built: $serverEntryPoint"
}

Start-Process `
    -FilePath "node.exe" `
    -ArgumentList ('"' + $serverEntryPoint + '"') `
    -WorkingDirectory $projectDirectory `
    -WindowStyle Hidden
