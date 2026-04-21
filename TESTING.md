# 🧪 Testovací Systém - Galaxia3

> **Cieľ:** Odhaliť chyby LOKÁLNE, nie až na Render.

---

## 🎯 Nový workflow (efektívny)

```
Napíš kód
    ↓
Spusti: ./test-local.ps1
    ↓
Ak prejde → git commit → git push
    ↓
GitHub Actions overí
    ↓
Deploy na Render
    ↓
✅ Hotovo (bez prekvapení)
```

---

## 🛠️ Inštalácia

### Windows:
```powershell
# Nainštaluj Docker Desktop
# https://www.docker.com/products/docker-desktop

# Nainštaluj PowerShell 7+
# https://github.com/PowerShell/PowerShell/releases
```

### Linux/Mac:
```bash
# Nainštaluj Docker
sudo apt-get install docker.io  # Ubuntu/Debian
brew install docker             # Mac
```

---

## 🧪 Použitie

### **Pred každým pushom (POVINNÉ):**

```powershell
# Windows
.\test-local.ps1

# Linux/Mac
./test-local.sh
```

**Čo to robí:**
1. ✅ Kontroluje Node.js verziu (20.11.0)
2. ✅ TypeScript check (strict mode)
3. ✅ Build test (backend + frontend)
4. ✅ Docker build test (rovnaké ako Render)

---

## 🚨 Čo robiť keď test zlyhá

### Chyba: "TypeScript errors"
```
Riešenie:
1. Pozri červený výstup
2. Oprav chybu v kóde
3. Spusti test znova
```

### Chyba: "Docker build failed"
```
Riešenie:
1. Skontroluj či Docker beží
2. Pozri chybu v logu
3. Oprav a skús znova
```

### Chyba: "Node version mismatch"
```
Riešenie:
# Nainštaluj správnu verziu cez nvm
nvm install 20.11.0
nvm use 20.11.0
```

---

## 📊 Porovnanie (pred vs teraz)

| | Predtým | Teraz |
|---|---|---|
| **Čas odhalenia chyby** | 5-10 minút na Render | 30 sekúnd lokálne |
| **Počet pokusov** | 15+ neúspešných deployov | 1 pokus, istota |
| **Efektivita** | Nízka | Vysoká |
| **Stres** | Vysoký | Nulový |

---

## 🔧 Automatické testy

### Lokálne (pre-commit):
- Spustí sa automaticky pri `git commit`
- Zabráni commitu ak testy neprejdú

### GitHub (CI/CD):
- Spustí sa pri PR
- Musí prejsť pred mergom

### Render:
- Až po úspešnom GitHub CI
- Žiadne prekvapenia

---

## 💡 Tipy

1. **VŽDY** spusti test pred pushom
2. **Nikdy** neignoruj TypeScript chyby
3. **Používaj** rovnakú Node verziu ako Render (20.11.0)
4. **Testuj** v Dockeri pre 100% istotu

---

**Pamätaj: Test lokálne = Žiadne prekvapenia na Render!** 🎯
