---
description: Esegue il controllo di verifica di un frontend Angular prima di dichiarare chiuso un lavoro: installazione, lint, formattazione, test con copertura, build di produzione, audit npm e controlli su any, colori e traduzioni. Riporta l'esito reale senza modificare file. Per il backend .NET vedi /kit:verifica. Si lancia solo su richiesta.
model: haiku
argument-hint: [cartella-frontend]
---

# Verifica del frontend Angular

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill esegue i controlli di chiusura di `frontend.md` §10 e di `core.md` §0b e §4 e riporta l'esito. Non corregge nulla: se un controllo fallisce, lo riporta con il dettaglio. L'installazione scrive in `node_modules`, ma non modifica il codice. I nomi degli script sono il default: se la tabella «Comandi» del `CLAUDE.md` ne indica di diversi, usa quelli; uno script che non esiste in `package.json` rende il controllo «non verificato», non superato.

1. **Cartella.** Usa l'argomento, altrimenti la cartella del frontend indicata nel `CLAUDE.md` («Nomi e struttura»), altrimenti cerca un `package.json` con `@angular/core` a partire dalla radice del repository. Se ne trovi più d'uno, chiedi una sola domanda: quale verificare. Se non ne trovi, dillo e termina.
2. **Installazione.** `npm ci --ignore-scripts` (regola di `security.md`, «Supply chain»; un'eccezione dichiarata nel `CLAUDE.md` si applica a parte, non da qui). Se fallisce, riporta l'errore e fermati.
3. **Lint.** `npm run lint`. Riporta file, riga e regola di ogni problema.
4. **Formattazione.** `npx prettier --check .` se il progetto usa Prettier (file di configurazione o dipendenza in `package.json`); altrimenti «non verificato».
5. **Test.** `npm test` (in modalità non interattiva: se lo script resta in watch, rilancialo con le opzioni del runner per un'esecuzione singola, ad esempio con `CI=true`). Riporta test eseguiti, falliti e saltati; un test saltato (`it.skip`, `xit`) è segnalato, non ignorato (`core.md` §4).
6. **Copertura.** `npm run test:coverage` e riporta la copertura. La soglia di `core.md` §4 (80% sul codice nuovo o modificato) non si calcola dal dato globale: dillo e segna la soglia «non verificata» salvo che l'utente indichi come misurarla.
7. **Build di produzione.** `npm run build`. Riporta errori e avvisi; i budget superati sono un problema (`frontend.md` §2, «Performance»).
8. **Audit.** `npm audit --audit-level=high`. Una vulnerabilità alta o critica rende il controllo non superato; riporta pacchetto e gravità data dallo strumento. Non aggiornare pacchetti da qui.
9. **Controlli sul codice** (ricerche in sola lettura nei sorgenti, esclusi `node_modules` e `dist`):
   - `any`: ricerca di `: any`, `as any`, `<any>`, `any[]` nei `.ts`. Ogni occorrenza è un problema (`frontend.md` §2).
   - Colori fissi: `#rgb`, `#rrggbb`, `rgb(`, `hsl(` in `.html`, `.ts` e `.css`/`.scss` fuori dai file dei token del tema. Ogni occorrenza è un problema (`frontend.md` §3).
   - Stringhe visibili fisse: testo italiano o inglese direttamente nei template, fuori dal servizio di traduzione. La ricerca non è affidabile: segnala solo i casi evidenti e dichiara il controllo «parziale».
   - Traduzioni: se esistono i file delle lingue supportate (`CLAUDE.md`, «Lingue supportate»; di norma JSON in una cartella `i18n`), confronta con un breve script Node nella cartella temporanea della sessione le chiavi di ogni lingua rispetto alla lingua di default e riporta le chiavi mancanti o in più. Se non trovi i file, «non verificato».
10. **Spazi bianchi.** `git diff --check` e `git diff --cached --check`. Se il repository non è git, «non verificato».
11. **Esito.** Chiudi con un esito complessivo: «superata» solo se tutti i controlli sono passati, altrimenti «non superata», con l'elenco dei controlli falliti o non verificati e, per ognuno, il comando eseguito e la parte rilevante dell'output.

Il gate non sostituisce i test E2E con Playwright e il controllo di accessibilità con axe (`frontend.md` §10), che richiedono un ambiente avviabile: se sono previsti, li segnala come controlli non eseguiti. Non sostituisce nemmeno `/code-review` e, per i temi sensibili, `/security-review` (`lavoro.md`); per i contrasti e l'accessibilità vedi `/kit:colori-tema` e `/kit:accessibilita-ui`.

Riferimenti: `core.md` §0b, §3 e §4; `frontend.md` §2, §3 e §10; `security.md` («Supply chain»).
