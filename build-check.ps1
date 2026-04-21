#!/usr/bin/env pwsh
# Build Check Script - Run BEFORE pushing to GitHub
# This ensures the build will pass on Render

$ErrorActionPreference = "Stop"

Write-Host "🔧 RENDER BUILD CHECK" -ForegroundColor Cyan
Write-Host "=====================" -ForegroundColor Cyan
Write-Host ""

# Check Node version
$nodeVersion = node --version
Write-Host "Node.js: $nodeVersion" -ForegroundColor Gray
Write-Host ""

# Step 1: Clean install (like Render does)
Write-Host "📦 Step 1: Clean npm install..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force backend/node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/node_modules -ErrorAction SilentlyContinue
npm install 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Write-Host "   ✅ Root dependencies installed" -ForegroundColor Green

# Step 2: Backend build
Write-Host ""
Write-Host "🔧 Step 2: Backend build..." -ForegroundColor Yellow
Set-Location backend
npm install 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { 
    Write-Host "   ❌ Backend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "   ✅ Backend built successfully" -ForegroundColor Green
Set-Location ..

# Step 3: Frontend build
Write-Host ""
Write-Host "🎨 Step 3: Frontend build..." -ForegroundColor Yellow
Set-Location frontend
npm install 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { 
    Write-Host "   ❌ Frontend build failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "   ✅ Frontend built successfully" -ForegroundColor Green
Set-Location ..

# Step 4: Verify dist folders exist
Write-Host ""
Write-Host "📁 Step 4: Verify build outputs..." -ForegroundColor Yellow
if (-not (Test-Path "backend/dist/index.js")) {
    throw "backend/dist/index.js not found"
}
if (-not (Test-Path "frontend/dist/index.html")) {
    throw "frontend/dist/index.html not found"
}
Write-Host "   ✅ All build outputs present" -ForegroundColor Green

Write-Host ""
Write-Host "✅ BUILD CHECK PASSED!" -ForegroundColor Green
Write-Host "You can safely push to GitHub." -ForegroundColor Cyan
Write-Host ""
