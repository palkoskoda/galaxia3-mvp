# Galaxia Obedy 3.0 — Project Context

## Overview
Lunch delivery planning system for Galaxia Krupina. React + Vite frontend, Express + SQLite/PostgreSQL backend, Docker deployment.

## Last Major Changes (commit ce84d1a)
- Integrated design from https://www.galaxia-krupina.sk/ (hero, contact info, weekly menu preview)
- Made `/menu` publicly viewable without login via `optionalAuthenticate` middleware
- Added automatic soup inclusion (+0.50 €) and optional extra/compote (+0.50 €)
- Added `senior_price` column to `menu_items` and `is_senior` flag to users
- Senior users see different prices in menu and plan calculations
- Contact banner shown for non-authenticated users on menu page

## Tech Stack
- Frontend: React 18, Vite, Tailwind CSS, Zustand, react-hot-toast, react-router-dom
- Backend: Express, TypeScript, better-sqlite3 (local) / pg (Render)
- Deployment: Docker (port 10000 inside, mapped to 3010 locally)

## Project Structure
```
galaxia3-mvp/
├── backend/src/
│   ├── db/index.ts          # SQLite/PostgreSQL query helper
│   ├── middleware/auth.ts   # authenticate, optionalAuthenticate, authorize
│   ├── routes/
│   │   ├── menu.ts          # Public + admin menu endpoints
│   │   ├── plan.ts          # User plan (selection, options, address)
│   │   ├── auth.ts          # Login/register/me
│   │   ├── admin.ts         # Admin dashboard, users
│   │   └── admin-customer-service.ts
│   └── scripts/sync-menu-data.ts  # Auto-sync menu-data.json on startup
├── frontend/src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── MenuPage.tsx     # Public menu (handles auth + guest)
│   │   ├── MyPlanPage.tsx   # User's ordered plan with soup/extra toggles
│   │   └── admin/AdminMenu.tsx, AdminUsers.tsx, ...
│   ├── stores/authStore.ts, planStore.ts
│   └── services/api.ts
├── menu-data.json           # Weekly menu seed data
├── Dockerfile
└── docker-compose.yml       # Maps 3000:10000
```

## How to Run
**Local dev:**
```bash
npm run dev          # starts backend + frontend concurrently
```

**Docker (test before push):**
```bash
docker build --no-cache -t galaxia3-mvp:test .
docker run -d -p 3010:10000 --name galaxia3-mvp galaxia3-mvp:test
# open http://localhost:3010
```

**Build check:**
```bash
npm run build        # backend tsc + frontend vite build
```

## Database Notes
- **Local:** SQLite (`galaxia3.db` or `/tmp/galaxia3.db` in Docker)
- **Production:** PostgreSQL on Render
- Auto-sync `menu-data.json` runs on startup if `DATABASE_URL` is set
- `daily_menu.menu_slot` values: `MenuA`, `MenuB`, `Soup`, `Special`, `Extra`
- Menu items default price: meals 5.00 €, soup/extra 0.50 €

## Important Implementation Details
- CORS: `backend/src/index.ts` allows `http://localhost:3010` and `http://127.0.0.1:3010`
- SQLite query helper in `db/index.ts` replaces `$1,$2...` with `?` and handles `RETURNING`
- When modifying SQL with repeated placeholders, be careful — `$1` repeated becomes two `?` but params array must match
- `optionalAuthenticate` tries auth but doesn't fail if no token (sets `req.user = undefined`)
- Types: `frontend/src/types/index.ts` — `menuSlot` includes `'Extra'`

## Deployment
- GitHub: https://github.com/palkoskoda/galaxia3-mvp
- Render backend + static frontend (or Docker on Render)
- Do NOT push without local Docker test first
