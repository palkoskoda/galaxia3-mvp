$ErrorActionPreference = 'Stop'
$galaxiaRepoRoot = $PSScriptRoot
Push-Location -LiteralPath $galaxiaRepoRoot
try {
    $galaxiaNpmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
    & $galaxiaNpmPath ci --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) { throw 'Root installation failed.' }
    & $galaxiaNpmPath run build
    if ($LASTEXITCODE -ne 0) { throw 'Personal app build failed.' }
    & $galaxiaNpmPath run menu:validate
    if ($LASTEXITCODE -ne 0) { throw 'Published menu validation failed.' }
    & $galaxiaNpmPath test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    if (-not (Test-Path -LiteralPath 'frontend/dist/index.html')) { throw 'Frontend build missing.' }
    if (-not (Test-Path -LiteralPath 'server/index.cjs')) { throw 'Server entry missing.' }
    Write-Output 'Build check passed: personal frontend, server, and tests.'
} finally { Pop-Location }
