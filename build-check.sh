#!/bin/bash

# Build Check Script - Run BEFORE pushing to GitHub
# This ensures the build will pass on Render

set -e  # Exit on error

echo "🔧 RENDER BUILD CHECK"
echo "====================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo -e "${YELLOW}Node.js: $(node --version)${NC}"
echo ""

# Step 1: Clean install (like Render does)
echo -e "${YELLOW}📦 Step 1: Clean npm install...${NC}"
rm -rf node_modules backend/node_modules frontend/node_modules
npm ci 2>&1 | grep -v "npm WARN" || true
echo -e "${GREEN}   ✅ Root dependencies installed${NC}"

# Step 2: Backend build
echo ""
echo -e "${YELLOW}🔧 Step 2: Backend build...${NC}"
cd backend
npm ci 2>&1 | grep -v "npm WARN" || true
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ Backend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Backend built successfully${NC}"
cd ..

# Step 3: Frontend build
echo ""
echo -e "${YELLOW}🎨 Step 3: Frontend build...${NC}"
cd frontend
npm ci 2>&1 | grep -v "npm WARN" || true
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}   ❌ Frontend build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Frontend built successfully${NC}"
cd ..

# Step 4: Verify dist folders exist
echo ""
echo -e "${YELLOW}📁 Step 4: Verify build outputs...${NC}"
if [ ! -f "backend/dist/index.js" ]; then
    echo -e "${RED}   ❌ backend/dist/index.js not found${NC}"
    exit 1
fi
if [ ! -f "frontend/dist/index.html" ]; then
    echo -e "${RED}   ❌ frontend/dist/index.html not found${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ All build outputs present${NC}"

echo ""
echo -e "${GREEN}✅ BUILD CHECK PASSED!${NC}"
echo -e "You can safely push to GitHub."
echo ""
