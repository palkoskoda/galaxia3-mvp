# Test Before Push - Windows PowerShell Script
# Spusti pred každým pushom na GitHub

Write-Host "🧪 TEST PRED PUSHOM" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan

# 1. TypeScript check backend
Write-Host "`n1️⃣ TypeScript check (backend)..." -ForegroundColor Yellow
Set-Location backend
$ErrorActionPreference = "Stop"
try {
    npx tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "TypeScript chyby" }
    Write-Host "   ✅ Backend OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Backend TypeScript chyby!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 2. TypeScript check frontend
Write-Host "`n2️⃣ TypeScript check (frontend)..." -ForegroundColor Yellow
Set-Location frontend
try {
    npx tsc --noEmit 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "TypeScript chyby" }
    Write-Host "   ✅ Frontend OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend TypeScript chyby!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# 3. Build test
Write-Host "`n3️⃣ Build test..." -ForegroundColor Yellow
try {
    npm run build:backend 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Build zlyhal" }
    Write-Host "   ✅ Build OK" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Build zlyhal!" -ForegroundColor Red
    exit 1
}

# 4. Docker build test (ak je nainštalovaný)
Write-Host "`n4️⃣ Docker build test (optional)..." -ForegroundColor Yellow
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    try {
        docker build -t galaxia3-test . 2>&1 | Out-Null
        Write-Host "   ✅ Docker build OK" -ForegroundColor Green
        docker rmi galaxia3-test 2>&1 | Out-Null
    } catch {
        Write-Host "   ⚠️  Docker build zlyhal (nepovinné)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Docker nie je nainštalovaný, preskočeno" -ForegroundColor Gray
}

Write-Host "`n✅ VŠETKY TESTY PREŠLI!`n" -ForegroundColor Green
Write-Host "Môžeš pushnúť: git push origin master" -ForegroundColor Cyan
