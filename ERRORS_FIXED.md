# ✅ Opravené chyby - Ako sa im vyhnúť

> Dokumentácia chýb ktoré sa už NESMÚ opakovať.

---

## Chyba #1: express-rate-limit TypeScript

**Problém:**
```typescript
// ❌ ZLYHALO na Render
const limiter = rateLimit({...})
app.use('/api/', limiter)
// Error: TS2769: No overload matches this call
```

**Prečo:** Type incompatibility medzi `express-rate-limit` verziami a `@types/express`

**Riešenie:**
```typescript
// ✅ Použiť priamo bez premennej
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests' }
}))
```

**Ako sa tomu vyhnúť:**
- Nikdy neukladaj middleware do premennej
- Ak potrebuješ reuse, vytvor factory funkciu

---

## Chyba #2: Rôzne Node.js verzie

**Problém:**
- Lokálne: Node.js 22.x
- Render: Node.js 20.x  
- Výsledok: `EBADENGINE Unsupported engine`

**Riešenie:**
```
# .node-version súbor
20.11.0
```

```json
// package.json
{
  "engines": {
    "node": "20.11.0"
  }
}
```

**Ako sa tomu vyhnúť:**
- VŽDY mať `.node-version` súbor
- Použiť `engines` v package.json
- Lokalne testovať na rovnakej verzii (nvm)

---

## Chyba #3: Mix package manažérov

**Problém:**
- Lokálne: npm (package-lock.json)
- Render: yarn (použil yarn keď videl package.json)
- Výsledok: Iné verzie balíkov, chyby

**Riešenie:**
```yaml
# render.yaml - explicitne použiť npm
buildCommand: npm ci && ...
```

**Ako sa tomu vyhnúť:**
- VŽDY explicitne definovať package manager
- Používať `npm ci` namiesto `npm install` (deterministické)
- Mať iba jeden lock file (package-lock.json)

---

## Chyba #4: TypeScript strict mód vypnutý

**Problém:**
```json
{
  "compilerOptions": {
    "strict": false  // Skrýva chyby lokálne
  }
}
```
- Lokálne prejde, na Render zlyhá

**Riešenie:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Ako sa tomu vyhnúť:**
- VŽDY mať strict: true
- Fixnúť všetky chyby lokálne, nie zakryť ich

---

## Chyba #5: Necommitované @types do dependencies

**Problém:**
```json
{
  "dependencies": {
    "express": "4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21"  // ❌ Render ignoruje devDependencies
  }
}
```

**Riešenie:**
```json
{
  "dependencies": {
    "express": "4.18.2",
    "@types/express": "4.17.21"  // ✅ V dependencies
  }
}
```

**Ako sa tomu vyhnúť:**
- Všetky @types patriace do produkcie dať do dependencies
- Použiť `npm ci` lokálne na test (inštaluje iba dependencies)

---

## Chyba #6: SQLite na read-only filesystem

**Problém:**
```typescript
// ❌ Zlyhá na Render - filesystem je read-only
const DB_PATH = './galaxia3.db'
```

**Riešenie:**
```typescript
// ✅ Použiť /tmp ktorý je writable
const DB_PATH = process.env.DATABASE_URL || '/tmp/galaxia3.db'
```

**Ako sa tomu vyhnúť:**
- VŽDY používať environment variable pre cesty
- Testovať lokálne s rovnakou cestou ako na produkcii

---

## Chyba #7: Push bez lokálneho buildu

**Problém:**
```bash
git add .
git commit -m "update"
git push
# Zlyhá na GitHub Actions alebo Render
```

**Riešenie:**
```bash
# build-check.ps1
npm ci
npm run build
# Ak prejde:
git push
```

**Ako sa tomu vyhnúť:**
- Použiť `build-check.ps1` pred každým pushom
- CI/CD musí prejsť pred deployom

---

## Chyba #8: Version ranges (^) namiesto presných verzií

**Problém:**
```json
{
  "dependencies": {
    "express-rate-limit": "^7.1.5"  // Môže nainštalovať 7.2.0
  }
}
```

**Riešenie:**
```json
{
  "dependencies": {
    "express-rate-limit": "7.1.5"  // Presná verzia
  }
}
```

**Ako sa tomu vyhnúť:**
- NIKDY nepoužívať `^` alebo `~` v produkčných projektoch
- Použiť `npm ci` (respektuje package-lock.json)

---

## Chyba #9: Nesprávny import path

**Problém:**
```typescript
// ❌ Zlyhá na Render (case-sensitive filesystem)
import { something } from '../Utils/helpers'
// súbor sa volá utils/ (malé u)
```

**Riešenie:**
```typescript
// ✅ Presná zhoda s názvom súboru
import { something } from '../utils/helpers'
```

**Ako sa tomu vyhnúť:**
- Windows je case-insensitive, Linux/Render je case-sensitive
- VŽDY používať presné názvy ako sú na disku
- Použiť `forceConsistentCasingInFileNames: true` v tsconfig

---

## Chyba #10: Environment variables lokálne vs produkcia

**Problém:**
```typescript
// ❌ Lokálne funguje, na Render nie
const JWT_SECRET = 'moj-tajny-kluc'  // Hardcoded
```

**Riešenie:**
```typescript
// ✅ Z env variable
const JWT_SECRET = process.env.JWT_SECRET!
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required')
}
```

**Ako sa tomu vyhnúť:**
- NIKDY nehardcodovať secrets
- VŽDY použiť environment variables
- Pridať validáciu že env var existuje

---

## 📋 Pre-flight checklist

Pred každým pushom skontrolovať:

- [ ] `./build-check.ps1` prešiel úspešne
- [ ] `npx tsc --noEmit` bez chýb
- [ ] Všetky `@types` sú v `dependencies` (nie `devDependencies`)
- [ ] Verzie balíkov sú presné (bez `^`)
- [ ] `.node-version` súbor existuje
- [ ] Environment variables sú použité správne
- [ ] Žiadne hardcoded cesty k súborom
- [ ] Case-sensitive import paths

---

**Tieto chyby sa už nesmú opakovať.**

*Dokument vytvorený po 15+ neúspešných pokusoch o deploy.*
