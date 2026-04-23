# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Fix package.json - remove workspaces array properly
RUN node -e "const fs = require('fs'); const files = ['package.json', 'backend/package.json', 'frontend/package.json']; files.forEach(f => { if (fs.existsSync(f)) { const pkg = JSON.parse(fs.readFileSync(f, 'utf8')); delete pkg.workspaces; fs.writeFileSync(f, JSON.stringify(pkg, null, 2)); } });"

# Install dependencies separately (no workspaces) - use npm install instead of ci
RUN npm install --legacy-peer-deps
RUN cd backend && npm install --legacy-peer-deps
RUN cd frontend && npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Production stage  
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV DATABASE_URL=/tmp/galaxia3.db

# Copy built backend and its node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/

# Copy built frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Copy root package.json for start script
COPY --from=builder /app/package*.json ./

EXPOSE 10000

CMD ["node", "backend/dist/index.js"]
