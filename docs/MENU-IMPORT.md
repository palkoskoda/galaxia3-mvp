# Týždenný import menu z e-mailu

Používateľ schválil pravidelné prečítanie PDF z Gmailu, zverejnenie samotného jedálneho lístka v tomto repozitári a nasadenie cez existujúci GitHub → Render. Objednávkové e-maily sa týmto postupom neposielajú.

## Postup pre stredajšiu úlohu

Úloha sa vracia do pôvodného chatu každú stredu o 07:00 v Europe/Bratislava. Rutinné čítanie a prepis zver agentovi `luna`. Lokálny počítač a aplikácia musia bežať. Ak Luna nie je dostupná, postupuj podľa globálnych pokynov pre náhradný model.

1. V priečinku tohto repozitára skontroluj `git status` a vzdialený `master`. S cudzími rozpracovanými zmenami nemanipuluj; pre import použi čistý checkout alebo izolovaný worktree. Nevykonávaj force push.
2. Urči nasledujúci pondelok a piatok podľa Europe/Bratislava. V pripojenom Gmaile hľadaj e-maily od `galaxia.obedy@gmail.com` z posledných 21 dní s PDF prílohou. Vyber PDF **pre Dobrá Niva / Banská Štiavnica / Dudince**, zvyčajne názov obsahuje `DN,BS,DUD`. Nepouži variant pre inú rozvozovú oblasť. Najnovší dátum e-mailu nestačí: rozhoduje rozsah dátumov vytlačený v PDF. Uprednostni najnovšiu opravu toho istého týždňa.
3. Prílohu stiahni do ignorovaného `.task-runtime/`. Prečítaj celé PDF, vyrenderuj ho a porovnaj dátumy, názvy, gramáže a všetky A–D. Na web smie ísť samotný verejný jedálny lístok. Nikdy nekopíruj zoznam adresátov, Gmail ID, odkazy na súkromnú poštu, hlavičky, tokeny ani inú korešpondenciu. Ak PDF obsahuje súkromné údaje, nezverejňuj ho týmto postupom.
4. Priprav JSON podľa existujúceho `data/menus/2026-10-26.json`. Zmeň `weekStart`, `importedAt` a `source.receivedAt` podľa overených údajov. Použi skutočné dátumy. `source.kind` je `email-pdf`, `source.label` je `PDF z e-mailu Galaxie`. Názov A neobsahuje úvodné FIT, pretože ho zobrazí aplikácia. Gramáž bez údaja v PDF má prázdny reťazec. Ceny, prílohy či alergény nevymýšľaj; originál je dostupný cez odkaz na PDF.
5. Importuj overené súbory:

   ```sh
   npm run menu:import -- .task-runtime/menu.json --pdf .task-runtime/menu.pdf
   npm run menu:validate
   ```

   Výsledkom sú iba `data/menus/YYYY-MM-DD.json` a `frontend/public/menus/YYYY-MM-DD.pdf`. Opakovaný rovnaký import nemení čas importu a nevyvoláva zbytočné nasadenie. Predchádzajúce týždne ostávajú zachované. Neúplný týždeň či sviatkový lístok bez A–D neobchádzaj vymyslenými jedlami; oznám, čo treba posúdiť.
6. Pred pushom dodrž lokálne pokyny: `build-check.ps1`, kontrola diffu a lokálny Docker build/runtime test. Commitni iba dva súbory daného týždňa. Žiadne zmeny aplikácie či infraštruktúry nepatria do bežného importu. Push na `master` má byť fast-forward a spustí existujúce nasadenie.
7. Over zelenú GitHub kontrolu, potom `https://galaxia3-mvp.onrender.com/api/menu?refresh=1`: musí obsahovať presné dátumy a `weekSources` daného týždňa s `kind: email-pdf`, `stale: false`. Otvor aj PDF URL a verejnú stránku, over zvolený týždeň, zdroj a aspoň prvé a posledné jedlo. Až potom je import dokončený.

Ak správny PDF lístok ešte neprišiel, nevymýšľaj menu a neprepisuj staré dáta. Pri chybe importu alebo nasadenia zachovaj posledný funkčný stav a oznám konkrétny problém. Pri rovnakom už nasadenom menu nič nemeň. Oznámenie má zmysel pri novom zverejnenom týždni alebo probléme vyžadujúcom pozornosť.

## Správanie servera a stránky

Pri štarte sa JSON dokumenty striktne validujú; neplatný import zastaví štart namiesto tichého zverejnenia chybných dát. Server neprijíma verejné uploady ani neobsahuje Gmail prístupové údaje. PDF menu má pre rovnaký dátum prednosť pred webom. Stav dostupnosti zdroja sa vyhodnocuje podľa zvoleného týždňa, takže výpadok webu neblokuje pripravenie objednávky z už overeného PDF.
