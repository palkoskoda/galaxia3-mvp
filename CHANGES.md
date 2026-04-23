# Zmeny pripravené na commit

## 🆕 Nové súbory

### 1. `backend/src/routes/admin-customer-service.ts`
**Zákaznícka podpora pre admina/staff:**
- `GET /api/admin/customer-service/search?query=...` — vyhľadávanie zákazníkov
- `GET /api/admin/customer-service/user/:userId` — detail zákazníka s objednávkami
- `PUT /api/admin/customer-service/user/:userId/reset-password` — reset hesla
- `PUT /api/admin/customer-service/plan/:planId` — úprava objednávky
- `DELETE /api/admin/customer-service/plan/:planId` — zrušenie objednávky
- `POST /api/admin/customer-service/user/:userId/create-order` — vytvorenie objednávky
- `GET /api/admin/customer-service/today-orders` — dnešné objednávky

### 2. `backend/src/scripts/sync-menu-data.ts`
**Synchronizácia menu-dát:**
- Načíta `menu-data.json`
- Transformuje do `menu_items` + `daily_menu`
- Posúva dátumy na aktuálny týždeň

### 3. `ADMIN-GUIDE.md`
**Dokumentácia pre admina:**
- Postupy pre typické scenáre
- Príklady API volaní
- Bezpečnostné pravidlá

---

## ✏️ Upravené súbory

### 1. `Dockerfile`
- Pridaný `ENV MENU_DATA_PATH=/app/backend/menu-data.json`
- Pridaný `COPY` pre `menu-data.json` do production stage

### 2. `backend/src/scripts/import-render-menu-data.ts`
- Vylepšené hľadanie `menu-data.json` — skúša viacero ciest
- Lepšie error hlášky s návrhom riešenia

### 3. `backend/src/index.ts`
- Pridaný import `adminCustomerServiceRoutes`
- Pridaný `app.use('/api/admin', adminCustomerServiceRoutes)`

### 4. `backend/package.json`
- Pridaný script `"db:sync-menu": "tsx src/scripts/sync-menu-data.ts"`

---

## 🧪 Otestované funkcie

### Lokálne (Docker):
- ✅ Docker build úspešný
- ✅ Aplikácia beží na porte 3000
- ✅ Health check: `GET /health` → 200 OK
- ✅ Login: `POST /api/auth/login` → 200 OK
- ✅ Menu plan: `GET /api/menu/plan` → 200 OK (14 dní)
- ✅ Seed: `node backend/dist/scripts/seed.js` → 8 users, 22 menu items, 46 daily menu
- ✅ Customer search: `GET /api/admin/customer-service/search?query=klient` → 5 výsledkov
- ✅ Customer detail: `GET /api/admin/customer-service/user/user-003` → detail + plány
- ✅ Today orders: `GET /api/admin/customer-service/today-orders` → 0 (žiadne dnešné)

---

## 🚀 Deploy na Render

### Postup:
1. Commit + push na GitHub
2. Render automaticky deployne
3. Po deployi spustiť cez Render Shell:
   ```bash
   npm run db:seed        # Testovacie dáta
   npm run db:sync-menu   # Menu dáta z menu-data.json
   ```

### Env variables:
- `JWT_SECRET` — náhodný string (min. 32 znakov)
- `DATABASE_URL` — `/tmp/galaxia3.db`
- `CORS_ORIGIN` — URL frontendu

---

## 📋 Pre admina

### Aktualizácia menu-dát:
1. Upraviť `backend/menu-data.json`
2. Commit + push
3. Re-deploy
4. Spustiť `npm run db:sync-menu`

### Zákaznícka podpora:
- Vyhľadávanie podľa mena/emailu/telefónu
- Reset hesla pre zákazníkov
- Úprava/zrušenie objednávok (s kontrolou uzávierok)
- Vytvorenie objednávky za zákazníka
