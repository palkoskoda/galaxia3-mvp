# Render Deploy Poznámky

## Čo sa pokazilo (38 pokusov)

1. **Npm workspaces** - Render inštaluje závislosti inak ako lokálne. Workspaces spôsobili že TypeScript nenachádzal typy.
2. **NODE_ENV=production** - Render používa production mode, čo znamená že sa neinštalujú devDependencies (typescript, @types/*).
3. **Build vs Start Command** - Render dashboard má vlastné nastavenia, ktoré prepíšu `render.yaml`.
4. **Lock files** - `package-lock.json` musí byť vždy v sync s `package.json`.
5. **Frontend dependencies** - `date-fns` chýbal vo `frontend/package.json`.

## Ako to vyriešiť

### 1. Lokálny test pred deployom

```bash
# Simuluj Render build
NODE_ENV=production npm install --legacy-peer-deps
NODE_ENV=production npm run build

# Skontroluj či appka štartuje
NODE_ENV=production PORT=10000 npm start

# Test health endpoint
curl http://localhost:10000/health
```

### 2. Build Command v Render dashboarde

```bash
npm install --legacy-peer-deps && npm run build
```

### 3. Start Command v Render dashboarde

```bash
npm start
```

### 4. Dôležité súbory

- `backend/package.json` - musí mať `@types/node` v `dependencies` (nie `devDependencies`)
- `backend/tsconfig.json` - `moduleResolution: "NodeNext"`, `types: ["node"]`
- `frontend/package.json` - všetky runtime dependencies musia byť tu
- `package.json` root - `render:build` script pre jednotný build

### 5. Čo kontrolovať pred deployom

- [ ] `npm run build` prejde lokálne
- [ ] `npm start` funguje lokálne
- [ ] `/health` endpoint odpovedá
- [ ] Všetky `package-lock.json` sú commitnuté
- [ ] Render dashboard má správny Build/Start Command
- [ ] GitHub CI prešlo

## Render nastavenia

| Nastavenie | Hodnota |
|-----------|---------|
| Language | Node |
| Build Command | `npm install --legacy-peer-deps && npm run build` |
| Start Command | `npm start` |
| Node Version | 20.11.0 (cez `.node-version`) |

## GitHub Actions

CI už kontroluje:
- TypeScript build
- Production start
- Health check

Ak CI failne, NEdeployovať na Render.
