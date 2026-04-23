# 🚀 Deployment Guide - Galaxia3

## Architektúra

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  TypeScript │→ │ Docker Build│→ │   Deploy to Render  │  │
│  │    Check    │  │    & Test   │  │   (Manual/Auto)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Render (Docker)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Container: node:20-alpine                           │   │
│  │  ├── Backend API (Express + SQLite)                  │   │
│  │  ├── Frontend Static Files (React)                   │   │
│  │  └── SQLite Database (/tmp/galaxia3.db)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Lokálny vývoj

### Požiadavky
- Node.js 20+
- Docker Desktop (pre testovanie)

### Inštalácia

```bash
# 1. Clone repo
git clone https://github.com/palkoskoda/galaxia3-mvp.git
cd galaxia3-mvp

# 2. Inštalácia závislostí
npm run install:all

# 3. Lokálny vývoj
npm run dev
```

### Docker testovanie (pred pushom)

```bash
# Build a spustenie v Docker
docker-compose up --build

# Test v prehliadači
open http://localhost:3000

# Stop
Ctrl+C
docker-compose down
```

## Deployment proces

### 1. Lokálny pre-flight check (Windows)

```powershell
.\test-before-push.ps1
```

Tento skript:
- ✅ Skontroluje TypeScript (backend aj frontend)
- ✅ Vyskúša build
- ✅ Otestuje Docker build

### 2. Push na GitHub

```bash
git add .
git commit -m "feat: popis zmien"
git push origin master
```

### 3. GitHub Actions (automaticky)

GitHub spustí 3 joby:

| Job | Účel | Trvanie |
|-----|------|---------|
| `typecheck` | TypeScript + Build | ~2 min |
| `docker` | Docker build + test | ~3 min |
| `deploy` | Deploy na Render | ~1 min |

### 4. Render Deploy

**Možnosť A: Automatický deploy (po nastavení)**
- CI musí prejsť
- Render dostane webhook
- Automatický deploy

**Možnosť B: Manuálny deploy**
- GitHub Actions → klikni "Run workflow"
- Alebo Render Dashboard → "Manual Deploy"

## Environment Variables

### Lokálne (.env v backend/)
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=tvoj-tajny-kluc
DATABASE_URL=./galaxia3.db
CORS_ORIGIN=http://localhost:5173
```

### Produkcia (Render)
```env
NODE_ENV=production
PORT=10000
JWT_SECRET=(auto-generated)
DATABASE_URL=/tmp/galaxia3.db
CORS_ORIGIN=https://galaxia3-mvp.onrender.com
```

## Troubleshooting

### Docker build zlyháva
```bash
# Clear Docker cache
docker builder prune -f

# Rebuild
docker-compose up --build
```

### SQLite chyby na Render
- Databáza je v `/tmp/` (read-write)
- Pri redeploy sa vymaže (ephemeral)
- Pre trvalé dáta treba PostgreSQL

### TypeScript chyby
```bash
# Lokálny check
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

## URL

| Prostredie | URL |
|------------|-----|
| Lokálny dev | http://localhost:5173 |
| Lokálny Docker | http://localhost:3000 |
| Produkcia | https://galaxia3-mvp.onrender.com |

## Testovacie účty

| Email | Heslo | Rola |
|-------|-------|------|
| admin@galaxia.sk | password123 | Admin |
| kuchar@galaxia.sk | password123 | Staff |
| klient1@example.com | password123 | Customer |

---

**Posledná aktualizácia:** 2024-04-21
