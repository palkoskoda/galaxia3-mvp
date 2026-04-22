#!/bin/bash
set -e

echo "🧪 GALAXIA3 - Lokálny test pred pushom"
echo "========================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

error_exit() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 1. Node version
echo "1️⃣  Kontrola Node.js verzie..."
NODE_VERSION=$(node -v)
REQUIRED_VERSION=$(cat .node-version)
echo "   Lokálne: $NODE_VERSION"
echo "   Render:  v$REQUIRED_VERSION"
if [ "$NODE_VERSION" != "v$REQUIRED_VERSION" ]; then
    warn "Rozdielna verzia! Render používa v$REQUIRED_VERSION"
fi
echo ""

# 2. Dependencies
echo "2️⃣  Kontrola dependencies..."
if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
    info "Installing dependencies..."
    npm install --ignore-scripts
fi
success "Dependencies OK"
echo ""

# 3. TypeScript check - Backend
echo "3️⃣  TypeScript check (backend)..."
cd backend
if npx tsc --noEmit 2>&1; then
    success "Backend TypeScript OK"
else
    error_exit "Backend TypeScript chyby!"
fi
cd ..

# 4. TypeScript check - Frontend
echo ""
echo "4️⃣  TypeScript check (frontend)..."
cd frontend
if npx tsc --noEmit 2>&1; then
    success "Frontend TypeScript OK"
else
    error_exit "Frontend TypeScript chyby!"
fi
cd ..

# 5. Build test
echo ""
echo "5️⃣  Build test..."
if npm run build 2>&1 | tail -5; then
    success "Build OK"
else
    error_exit "Build zlyhal!"
fi

# 6. Docker build test (optional)
echo ""
echo "6️⃣  Docker build test (optional)..."
if command -v docker &> /dev/null; then
    if docker build -f Dockerfile.test -t galaxia3-test . 2>&1 | tail -3; then
        success "Docker build OK"
        docker rmi galaxia3-test 2>/dev/null || true
    else
        warn "Docker build zlyhal (nepovinné)"
    fi
else
    info "Docker nie je nainštalovaný - preskočené"
fi

# 7. Verify dist exists
echo ""
echo "7️⃣  Kontrola build outputs..."
if [ -f "backend/dist/index.js" ] && [ -f "frontend/dist/index.html" ]; then
    success "Build outputs existujú"
else
    error_exit "Chýbajú build outputs!"
fi

echo ""
echo "========================================"
success "VŠETKY TESTY PREŠLI!"
echo "========================================"
echo ""
echo -e "${CYAN}Môžeš pushnúť: git push origin main${NC}"
echo ""
