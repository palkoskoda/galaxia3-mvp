#!/usr/bin/env pwsh
# Lokálny test - Kontrola pred pushom
# Tento skript odhalí chyby SKÔR ako pushneš na GitHub

$ErrorActionPreference = "Stop"

Write-Host "🧪 LOKÁLNY TEST - Kontrola pred pushom" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Farby
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"

# Funkcia pre error
function Test-Fail($message) {
    Write-Host "❌ $message" -ForegroundColor $Red
    exit 1
}

# 1. Kontrola Node verzie
Write-Host "1️⃣  Kontrola Node.js verzie..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "   Lokálne: $nodeVersion" -ForegroundColor Gray
Write-Host "   Render:  v20.11.0" -ForegroundColor Gray
if ($nodeVersion -ne "v20.11.0") {
    Write-Host "   ⚠️  Rozdielna verzia! Odporúčam použiť nvm/nvm-windows" -ForegroundColor Yellow
}
Write-Host ""

# 2. TypeScript check (strict ako na Render)
Write-Host "2️⃣  TypeScript check (strict mode)..." -ForegroundColor Yellow
Set-Location backend
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ TypeScript chyby v backend:" -ForegroundColor $Red
    Write-Host $tscOutput -ForegroundColor $Red
    Set-Location ..
    exit 1
}
Write-Host "   ✅ Backend TypeScript OK" -ForegroundColor $Green
Set-Location ..

Set-Location frontend
$tscOutput = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ TypeScript chyby vo frontend:" -ForegroundColor $Red
    Write-Host $tscOutput -ForegroundColor $Red
    Set-Location ..
    exit 1
}
Write-Host "   ✅ Frontend TypeScript OK" -ForegroundColor $Green
Set-Location ..

# 3. Build test
Write-Host ""
Write-Host "3️⃣  Build test..." -ForegroundColor Yellow
Set-Location backend
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Test-Fail "Backend build zlyhal!"
}
Write-Host "   ✅ Backend build OK" -ForegroundColor $Green
Set-Location ..

Set-Location frontend
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Test-Fail "Frontend build zlyhal!"
}
Write-Host "   ✅ Frontend build OK" -ForegroundColor $Green
Set-Location ..

# 4. Docker test (ak je nainštalovaný)
Write-Host ""
Write-Host "4️⃣  Docker test (rovnaké prostredie ako Render)..." -ForegroundColor Yellow
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    Write-Host "   Building Docker image..." -ForegroundColor Gray
    $dockerBuild = docker build -f Dockerfile.test -t galaxia3-test . 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker build OK" -ForegroundColor $Green
        docker rmi galaxia3-test 2>&1 | Out-Null
    } else {
        Write-Host "   ❌ Docker build zlyhal:" -ForegroundColor $Red
        Write-Host $dockerBuild -ForegroundColor $Red
        Write-Host ""
        Write-Host "💡 TIP: Docker simuluje presné prostredie ako Render" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   ⏭️  Docker nie je nainštalovaný - preskočené" -ForegroundColor Gray
    Write-Host "   💡 Odporúčam nainštalovať Docker pre 100% istotu" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ VŠETKY TESTY PREŠLI!" -ForegroundColor Green
Write-Host "Môžeš bezpečne pushnúť: git push origin master" -ForegroundColor Cyan
Write-Host ""
