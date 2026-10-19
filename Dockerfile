FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
RUN npm ci --legacy-peer-deps
COPY frontend ./frontend
RUN npm run build

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=10000
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY server ./server
COPY package.json ./package.json
EXPOSE 10000
CMD ["node", "server/index.cjs"]
