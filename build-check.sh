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

# Step 1: Run the same command Render runs, with Render's production env.
echo -e "${YELLOW}📦 Step 1: Render-equivalent build...${NC}"
echo "Command: NODE_ENV=production npm install --legacy-peer-deps && NODE_ENV=production npm run build"
NODE_ENV=production npm install --legacy-peer-deps
NODE_ENV=production npm run build
echo -e "${GREEN}   ✅ Render-equivalent build passed${NC}"

# Step 2: Verify dist folders exist
echo ""
echo -e "${YELLOW}📁 Step 2: Verify build outputs...${NC}"
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
