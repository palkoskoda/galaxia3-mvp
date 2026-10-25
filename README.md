# Moje obedy · Galaxia

Jednoduchý osobný pomocník pre objednávanie obedov z Galaxie. Menu z overeného e-mailového PDF má prednosť pred [webom Galaxie](https://galaxia-krupina.sk/), ktorý nemusí byť včas aktualizovaný. Používateľ si vyberie porcie A–D a otvorí pripravenú objednávku vo vlastnom Gmaile. Odoslanie potvrdí v Gmaile sám. Aplikácia je nezávislá od reštaurácie.

## Aktuálna jednoduchá verzia

- Bez registrácie, databázy a hesiel k e-mailu.
- Meno, adresa, poznámka a výber sa automaticky ukladajú iba v aktuálnom prehliadači cez localStorage. Dáta sa nesynchronizujú medzi zariadeniami; vymazanie dát prehliadača odstráni aj uložený výber.
- Server používa jedálne lístky v `data/menus/` a dopĺňa ich z verejného webu. Web má 15-minútovú cache. Overené PDF menu funguje aj pri jeho výpadku. Dátumy sa neposúvajú ani nevymýšľajú; uplynulý týždeň sa neotvára ako náhrada budúceho.
- Gmail otvorí upraviteľnú správu pre `galaxia.obedy@gmail.com` s počtami jedál podľa dní a malou poznámkou o pôvode. Otvorenie Gmailu nie je potvrdením odoslania ani prijatia objednávky.
- Platby, rozvoz, správa reštaurácie a automatické odosielanie majú stav **Pripravuje sa**.

## Lokálne spustenie

Node.js 20+, npm:

```sh
npm ci
npm run build
npm start
```

Web beží na porte 3000; v produkcii používa `PORT` dodaný hostingom. `npm run dev` spustí server a Vite. Vite posiela `/api` na port 3000.

`npm test` overí čítanie menu, cache, limity zdroja, bezpečné servovanie súborov a lokálne uloženie výberu. `npm run typecheck` kontroluje aktívnu osobnú aplikáciu. `build-check.ps1` vykoná lokálnu kontrolu pred pushom.

## Pridanie menu z e-mailového PDF

Každú stredu o 07:00 je naplánovaná kontrola Gmailu pre nasledujúci týždeň. Postup importu, ochrana súkromia a kontrola nasadenia sú v [docs/MENU-IMPORT.md](docs/MENU-IMPORT.md). `npm run menu:import -- input.json --pdf menu.pdf` vloží overené dáta a PDF do repozitára; `npm run menu:validate` ich overí pred nasadením. Úloha používa lokálny priečinok, preto potrebuje zapnutý počítač a spustenú aplikáciu.

## Pôvodné nasadenie cez GitHub → Render

Zachované príkazy hostingu:

- Build: `npm install --legacy-peer-deps && npm run build`
- Start: `npm start`
- Health check: `/health`
- Vetva: `master`

Predošlá konfigurovaná adresa je `https://galaxia3-mvp.onrender.com`. Aktívne nastavenie služby v Render dashboarde treba overiť, pretože môže prepisovať `render.yaml`. Súbor teraz popisuje web bez databázy; táto úprava sama osebe neodstraňuje existujúce vzdialené databázy ani nemení ich údaje. Staré databázové premenné služba nepoužíva.

GitHub Actions kontroluje build, testy a štart. Render môže používať automatické nasadenie po úspešných kontrolách. Pri bezplatnom uspávaní môže prvé otvorenie trvať dlhšie; pre ručne potvrdený e-mail to nevyžaduje trvalý plánovač.

Docker: `docker build -t galaxia-personal .`, potom `docker run --rm -p 3010:10000 galaxia-personal`.

## Pôvodný systém reštaurácie

Starší databázový backend a stránky ostali v `backend/` a `frontend/src/pages/` ako podklad pre budúce rozšírenie. Aktívne `npm start` ich nepoužíva a nespúšťa seed testovacích účtov. Staršie dokumenty popisujú pôvodný rozsah aplikácie; aktuálne nasadenie sa riadi týmto README a `RENDER-DEPLOY.md`.
