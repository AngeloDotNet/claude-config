---
description: Controlla le voci di sicurezza della consegna sul lavoro corrente, solo se tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali: threat model (ADR), test con input ostili, fail closed, abuso di risorse, log e alert, SECURITY.md e runbook; poi lancia /security-review e unisce i risultati. Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [percorso-o-branch]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Sicurezza: controllo prima di consegnare

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio. Non modificare nessun file.

Questa skill applica `security.md` («Regola operativa», «Progettazione sicura e fail closed», «Test di sicurezza automatici»), `security-backend.md`, `security-frontend.md` e le voci di sicurezza di `core.md` §0b. Verifica che le misure ci siano e siano testate; non scrive codice di sicurezza e non sostituisce un penetration test.

1. **Contesto.** Leggi il `CLAUDE.md` della radice: livello ASVS, sicurezza backend scelta, upload previsto, limiti e rate limiting, allerta sugli eventi, DAST. Se un campo di sicurezza è un segnaposto, non indovinare: segnalalo come decisione mancante.
2. **Lavoro da esaminare**, in sola lettura: con un argomento, quel percorso o quel branch (`git diff <base>...<branch>`, con `<base>` = `develop`, altrimenti il branch principale del `CLAUDE.md`); altrimenti le modifiche non committate (`git diff`, `git diff --cached`) più i file nuovi non tracciati (`git status --short`).
3. **Serve?** La revisione è dovuta se il lavoro tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali (`security.md`, «Regola operativa»). Se non ne tocca nessuno, o le modifiche sono solo cosmetiche o di documentazione, dillo in una riga ed elenca solo i controlli del passo 6 che restano comunque pertinenti, poi termina.
4. **Threat model.** Per una funzionalità sensibile cerca in `docs/adr/` l'ADR del threat model: asset, attori, abuse case e, per ognuno, mitigazione e test che la verifica (`security.md`). Se manca, è un rilievo bloccante: doveva essere approvato prima del codice. Se c'è, controlla che ogni mitigazione abbia un test.
5. **Controlli per tema**, solo per quelli che il lavoro tocca; per ogni voce «ok», «manca» o «non verificabile» (se serve eseguire qualcosa) con file e riga:
   - **Input:** endpoint e validatori nuovi o modificati hanno test con payload ostili (SQL/XSS/path traversal, stringhe oltre i limiti, a capo, JSON malformato, overposting con `Role`, `OwnerId`, `TenantId`, identificatori di altri utenti); esito atteso 400, 404, 413 o 422 con `ProblemDetails`, mai 500.
   - **Accessi:** endpoint protetti di default; test 401 senza credenziali, 403 senza il permesso; per ogni risorsa di un utente, test che un altro utente o tenant non la raggiunge (`backend-app.md` §4.6).
   - **Fail closed:** test con la dipendenza di un controllo non raggiungibile (richiesta negata) e con configurazione di sicurezza a segnaposto fuori da Development (l'avvio fallisce).
   - **Upload:** test con file ostili (tipo falsificato, nome con percorso o doppia estensione, oltre i limiti, archivi che escono dalla cartella, SVG con script, XML con entità esterne).
   - **Link assoluti** (reset password, conferma email, inviti): test con `Host` e `X-Forwarded-Host` falsificati; il link usa solo la configurazione (`App:PublicBaseUrl`).
   - **Abuso di risorse e API:** `pageSize` limitato, rate limit, timeout, `matchTimeout` sulle espressioni regolari, `no-store` sulle risposte sensibili, endpoint operativi non pubblici, webhook firmati (`security-backend.md`).
   - **Log e allerta:** eventi di sicurezza con nome stabile e proprietà strutturate, senza dati personali né segreti; test che login fallito, accesso negato e cambio di ruolo producano l'evento atteso (`security.md`).
   - **Segreti e configurazione:** nessun valore reale in `appsettings*.json`, compose o codice; variabili elencate in `.env.example`.
   - **Frontend:** nessun `innerHTML` o `bypassSecurityTrust*` senza sanitizzazione e motivo, nessun token in `localStorage` o `sessionStorage`, test di rendering con input ostili (`security-frontend.md`).
   - **Progetto:** `SECURITY.md` nella radice e `docs/runbook-sicurezza.md`; DAST se il `CLAUDE.md` lo prevede.
   - **Livello ASVS:** per il livello 2 o 3 del `CLAUDE.md` elenca i controlli opzionali che le regole chiedono di proporre (MFA, ri-autenticazione per azioni sensibili, sessioni revocabili, DAST, alert); proponili, non introdurli (`core.md` §6.18).
6. **`/security-review`.** Lancia la skill `security-review` sulle modifiche con lo strumento `Skill` e incorpora i suoi risultati nell'esito. Se non è disponibile, dillo e segnala che resta da eseguire.
7. **Esito.** Elenca i rilievi per gravità (bloccante, importante, suggerimento: `lavoro.md`, «Gravità dei rilievi»), ciascuno con file e riga, regola violata (file e sezione) e correzione proposta, poi i controlli «non verificabili» e le decisioni mancanti. Ogni rilievo di una revisione si verifica sul codice prima di applicarlo (`lavoro.md`). Una correzione di sicurezza va in un commit `fix(security)` a sé (`git.md`). Il giudizio finale resta all'utente.

Riferimenti: `security.md`, `security-backend.md`, `security-frontend.md`, `backend-app.md` §4.6, `core.md` §0b, `lavoro.md`.
