# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

RUN npm ci
RUN cd backend && npm ci
RUN cd frontend && npm ci

COPY . .
RUN npm run build

# Production stage  
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
ENV DATABASE_URL=/tmp/galaxia3.db

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/package*.json ./

EXPOSE 10000

CMD ["node", "backend/dist/index.js"]
