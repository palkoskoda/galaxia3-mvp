#!/bin/bash

# Test Before Push - Unix/Linux/Mac Script
# Spusti pred každým pushom na GitHub

echo "🧪 TEST PRED PUSHOM"
echo "===================="

# Farby
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funkcia pre error handling
error_exit() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 1. TypeScript check backend
echo ""
echo -e "${YELLOW}1️⃣ TypeScript check (backend)...${NC}"
cd backend || error_exit "Nepodarilo sa prejsť do backend/"
npx tsc --noEmit 2>&1 > /dev/null
if [ $? -ne 0 ]; then
    error_exit "Backend TypeScript chyby!"
fi
echo -e "${GREEN}   ✅ Backend OK${NC}"
cd ..

# 2. TypeScript check frontend
echo ""
echo -e "${YELLOW}2️⃣ TypeScript check (frontend)...${NC}"
cd frontend || error_exit "Nepodarilo sa prejsť do frontend/"
npx tsc --noEmit 2>&1 > /dev/null
if [ $? -ne 0 ]; then
    error_exit "Frontend TypeScript chyby!"
fi
echo -e "${GREEN}   ✅ Frontend OK${NC}"
cd ..

# 3. Build test
echo ""
echo -e "${YELLOW}3️⃣ Build test...${NC}"
npm run build:backend 2>&1 > /dev/null
if [ $? -ne 0 ]; then
    error_exit "Build zlyhal!"
fi
echo -e "${GREEN}   ✅ Build OK${NC}"

# 4. Docker build test (ak je nainštalovaný)
echo ""
echo -e "${YELLOW}4️⃣ Docker build test (optional)...${NC}"
if command -v docker &> /dev/null; then
    docker build -t galaxia3:test . 2>&1 > /dev/null
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}   ✅ Docker build OK${NC}"
        docker rmi galaxia3:test 2>&1 > /dev/null
    else
        echo -e "${YELLOW}   ⚠️ Docker build zlyhal (nepovinné)${NC}"
    fi
else
    echo -e "${YELLOW}   ⏭️  Docker nie je nainštalovaný, preskočeno${NC}"
fi

echo ""
echo -e "${GREEN}✅ VŠETKY TESTY PREŠLI!${NC}"
echo ""
echo -e "${CYAN}Môžeš pushnúť: git push origin master${NC}"
