# Render: pokračovanie existujúceho nasadenia

Použiť existujúcu službu pre `palkoskoda/galaxia3-mvp`, vetvu `master`. Netreba vytvárať ďalší účet na hostingu ani databázu.

| Nastavenie | Hodnota |
| --- | --- |
| Runtime | Node (alebo existujúci Docker) |
| Build | `npm install --legacy-peer-deps && npm run build` |
| Start | `npm start` |
| Health check | `/health` |
| Auto-deploy | Po úspešných GitHub kontrolách |
| Port | Hodnota `PORT` od Renderu, štandardne 10000 |

Pôvodná adresa uvedená v konfigurácii: https://galaxia3-mvp.onrender.com . Reálny stav a prepojenie služby treba potvrdiť v Render dashboarde; súbory v GitHube samy nepotvrdzujú aktívne nasadenie.

Aktívny server `server/index.cjs` používa iba vstavané Node moduly. Spúšťa `/health`, verejné `/api/menu` a obsluhu buildu Reactu. Nepripája sa k PostgreSQL/SQLite a nepotrebuje `DATABASE_URL`, `JWT_SECRET` ani žiadny e-mailový token. Staré serverové premenné môžu ostať nepoužité. Existujúcu vzdialenú databázu táto zmena nemaže.

Pri blueprint synchronizácii si osobitne skontrolovať, ktoré existujúce zdroje sa menia. Konfigurácia jednoduchého webu nevyžaduje nový databázový zdroj.

Používateľov výber je v localStorage na konkrétnej doméne a v konkrétnom prehliadači. Údaje zo skúšobného chatgpt.site sa do Render domény neprenesú automaticky.

Pred pushom: `build-check.ps1`, Docker build a kontrola `/health` aj hlavnej stránky v kontajneri. CI používa rovnaký aktívny build. Žiadny test neposiela e-mail.
