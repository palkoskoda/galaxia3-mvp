# 👨‍💻 Developer Guide - Galaxia3

> **DÔLEŽITÉ:** Predtým ako napíšeš akýkoľvek kód, prečítaj si `DEVELOPMENT_RULES.md` a `ERRORS_FIXED.md`.

---

## 🚀 Rýchly štart

### 1. Inštalácia
```bash
git clone https://github.com/palkoskoda/galaxia3-mvp.git
cd galaxia3-mvp
npm run install:all
```

### 2. Lokálny vývoj
```bash
npm run dev
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

### 3. Pred každým pushom (POVINNÉ)
```powershell
# Windows
.\build-check.ps1

# Linux/Mac
./build-check.sh
```

**Ak skript zlyhá, NEpushuj!** Oprav chyby najprv.

---

## 📚 Kde nájsť informácie

| Súbor | Čo obsahuje |
|-------|-------------|
| `DEVELOPMENT_RULES.md` | **Pravidlá vývoja** - Čo robiť a nerobiť |
| `ERRORS_FIXED.md` | **Chyby ktoré sa nesmú opakovať** |
| `DEPLOY.md` | **Deployment guide** |
| `README.md` | **Užívateľská dokumentácia** |

---

## ⚠️ Najčastejšie chyby (a ako ich neopakovať)

### Chyba #1: Push bez build check
**Následok:** 15+ neúspešných deployov, strata času  
**Riešenie:** VŽDY spusti `./build-check.ps1` pred pushom

### Chyba #2: TypeScript "any" type
**Následok:** Chyby na Render ktoré lokálne nevidíš  
**Riešenie:** Použi strict typovanie, nikdy `any`

### Chyba #3: Zmena verzie balíka
**Následok:** Náhodné chyby v produkcii  
**Riešenie:** Používaj presné verzie (bez `^`)

---

## 🔄 Workflow

```
Napíš kód
    ↓
Testuj lokálne (npm run dev)
    ↓
Spusti build-check.ps1
    ↓
Ak prejde → Push
    ↓
GitHub Actions otestuje
    ↓
Ak prejde → Deploy na Render
    ↓
✅ Hotovo
```

---

## 🛠️ Technický stack

- **Backend:** Node.js 20.11.0 + Express + TypeScript
- **Frontend:** React + Vite + TypeScript
- **Database:** SQLite
- **Hosting:** Render (Web Service)
- **CI/CD:** GitHub Actions

---

## 🧪 Testovanie

### Lokálne:
```bash
# TypeScript check
npx tsc --noEmit

# Build
npm run build

# Full check
./build-check.ps1
```

### CI/CD:
Automaticky pri push na GitHub. Pozri:  
https://github.com/palkoskoda/galaxia3-mvp/actions

---

## 🚨 Keď niečo zlyhá

1. **Prečítaj chybu** - prvá chyba je podstatná
2. **Pozri logy** - GitHub Actions alebo Render Dashboard
3. **Skontroluj** či si dodržal pravidlá v `DEVELOPMENT_RULES.md`
4. **Oprav lokálne** - nie na produkcii
5. **Spusti build-check** pred ďalším pushom

---

## 💡 Tipy

- **Node version:** Používaj presne 20.11.0 (definované v `.node-version`)
- **Package manager:** Iba npm, žiadny yarn
- **Environment:** Používaj `.env` lokálne, env vars na Render
- **Database:** SQLite cesta cez `DATABASE_URL` env var

---

## 📞 Podpora

- **GitHub Issues:** https://github.com/palkoskoda/galaxia3-mvp/issues
- **Render Docs:** https://render.com/docs
- **Express Docs:** https://expressjs.com

---

**Pamätaj: Ak to neprejde build-check.ps1, NEpushuj to!**

*Za dodržiavanie pravidiel zodpovedá vývojár.*
