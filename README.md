# Galaxia Obedy 3.0

Inteligentný systém pre plánovanie dodávok obedov so **stavovým modelom**.

## 🎯 Kľúčové vlastnosti

- **Žiadny košík** - Priame plánovanie v jedálnom lístku
- **Živý plán** - Každá zmena sa okamžite ukladá
- **Uzávierky** - Automatické uzamykanie po deadlinoch
- **Denná súpiska** - Prehľad pre kuchyňu a rozvoz

## 🏗️ Architektúra

### Stavový model (State Model)

Namiesto klasického e-commerce flow (košík → checkout → objednávka) používame priamy stavový model:

```
Zákazník ↔ Databáza (DeliveryPlanItems)
     ↑
   +/- (okamžitý zápis)
```

### Tech Stack

- **Backend**: Node.js + Express + TypeScript + PostgreSQL
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **State Management**: Zustand
- **API**: REST s JWT autentifikáciou

## 🚀 Inštalácia

### 1. Klonovanie a inštalácia

```bash
git clone <repo-url>
cd galaxia3
npm run install:all
```

### 2. Databáza

```bash
# Vytvorte PostgreSQL databázu
createdb galaxia3

# Nastavte .env
cp .env.example .env
# Upravte DATABASE_URL

# Spustite migrácie
npm run db:migrate

# Naplňte dáta
npm run db:seed
```

### 3. Spustenie

```bash
# Vývojový režim (backend + frontend)
npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

## 📋 Testovacie účty

Po seed-e sú k dispozícii:

| Email | Heslo | Rola |
|-------|-------|------|
| admin@galaxia.sk | password123 | Admin |
| kuchar@galaxia.sk | password123 | Staff |
| rozvoz@galaxia.sk | password123 | Staff |
| klient1@example.com | password123 | Customer |
| klient2@example.com | password123 | Customer |
| klient3@example.com | password123 | Customer |

## 📁 Štruktúra projektu

```
galaxia3/
├── backend/              # Node.js API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, error handling
│   │   ├── types/        # TypeScript types
│   │   └── db/           # Database connection
│   └── package.json
├── frontend/             # React aplikácia
│   ├── src/
│   │   ├── pages/        # Stránky
│   │   ├── components/   # Komponenty
│   │   ├── stores/       # Zustand stores
│   │   └── services/     # API calls
│   └── package.json
├── database/
│   ├── schema.sql        # Databázová schéma
│   └── seed.sql          # Testovacie dáta
└── package.json
```

## 🔌 API Endpoints

### Auth
- `POST /api/auth/login` - Prihlásenie
- `POST /api/auth/register` - Registrácia
- `GET /api/auth/me` - Aktuálny používateľ

### Menu
- `GET /api/menu/plan` - Živý jedálny lístok s výbermi
- `GET /api/menu/items` - Knižnica jedál
- `GET /api/menu/daily` - Denná ponuka (admin)

### Plan (HLAVNÉ)
- `PUT /api/plan/selection` - **Nastaviť počet kusov**
- `GET /api/plan/my` - Môj plán

### Admin
- `GET /api/admin/dashboard` - Štatistiky
- `GET /api/admin/daily-summary/:date` - Denná súpiska
- `POST /api/admin/archive-day/:date` - Archivovať deň

## 🗄️ Dátový model

### Kľúčové tabuľky

1. **users** - Používatelia
2. **menu_items** - Knižnica jedál
3. **daily_menu** - Denná ponuka s uzávierkami
4. **delivery_plan_items** - **Živý plán** (užívateľ × deň × jedlo)
5. **order_history** - Archív dodávok

## 📝 Licencia

MIT
