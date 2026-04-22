# 🧪 Testovací Systém - Galaxia3

> **Cieľ:** Odhaliť chyby LOKÁLNE, nie až na Render.

---

## 🎯 Rýchly štart

```bash
# Pred každým pushom (POVINNÉ):
./test-local.sh
```

Ak prejde → `git push origin main`

---

## 📋 Čo test kontroluje

1. ✅ **Node.js verzia** — upozorní ak nesedí s Render
2. ✅ **Dependencies** — nainštaluje ak chýbajú
3. ✅ **TypeScript check (backend)** — `tsc --noEmit`
4. ✅ **TypeScript check (frontend)** — `tsc --noEmit`
5. ✅ **Build test** — `npm run build` (backend + frontend)
6. ✅ **Docker build** — ak je Docker nainštalovaný
7. ✅ **Build outputs** — overí že `dist/` existuje

---

## 🛠️ Inštalácia

### Požiadavky
- Node.js (odporúčané 20.11.0, funguje aj ≥18)
- npm ≥ 9.0.0
- Git
- Docker (voliteľné, pre 100% istotu)

### Inštalácia Docker (voliteľné)
```bash
# Ubuntu/Debian/WSL
sudo apt-get update
sudo apt-get install docker.io

# Alebo cez Docker Desktop pre Windows/WSL
```

---

## 🧪 Použitie

### Hlavný test script

```bash
# WSL / Linux / Mac
./test-local.sh

# Windows (PowerShell 7+)
./test-local.ps1
```

### Vývojový server

```bash
# Spusti backend + frontend naraz
npm run dev

# Backend: http://localhost:3000
# Frontend: http://localhost:5173
# Health:   http://localhost:3000/health
```

### Docker (produkčné prostredie)

```bash
# Spusti celú app lokálne
docker-compose up --build

# App beží na: http://localhost:3000
```

---

## 🚨 Riešenie problémov

### "Node version mismatch"
```bash
# Nainštaluj správnu verziu cez nvm
nvm install 20.11.0
nvm use 20.11.0
```

### "TypeScript errors"
```bash
# Pozri červený výstup
# Oprav chybu v kóde
# Spusti test znova
./test-local.sh
```

### "Docker build failed"
```bash
# Skontroluj či Docker beží
sudo systemctl start docker

# Pozri chybu v logu
# Oprav a skús znova
```

### "Build failed"
```bash
# Vymaž node_modules a znova
rm -rf node_modules backend/node_modules frontend/node_modules
npm install
./test-local.sh
```

---

## 📊 Workflow

```
Napíš kód
    ↓
./test-local.sh
    ↓
Ak prejde → git add . → git commit → git push origin main
    ↓
GitHub Actions overí
    ↓
Render deploy automaticky
    ↓
✅ Hotovo (bez prekvapení)
```

---

## 🔧 GitHub Actions

Automaticky spustené pri push do `main`:
- TypeScript check
- Build test
- Render deploy (ak CI prejde)

---

## 💡 Tipy

1. **VŽDY** spusti `./test-local.sh` pred pushom
2. **Nikdy** neignoruj TypeScript chyby
3. **Používaj** rovnakú Node verziu ako Render (20.11.0)
4. **Testuj** v Dockeri pre 100% istotu

---

**Pamätaj: Test lokálne = Žiadne prekvapenia na Render!** 🎯
