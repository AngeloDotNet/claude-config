# Regole di interazione: workflow (versione standard)

> Versione 1.0 — ultima revisione: 2026-11-23.
> Versione breve per il profilo `standard`, estratto di `core.md` §6 con la stessa numerazione. Il testo completo è in `.claude/rules-optional/dettaglio/workflow.md`, da leggere su richiesta. Richiede `core.md`.

1. **No codice legacy:** niente `NgModule`, `Startup.cs`, `*ngIf/*ngFor`, `APP_INITIALIZER`, interceptor a classe.
2. **Niente MediatR né AutoMapper.** La libreria di gestione errori è `OperationResults` (scelta fissa).
3. **Modifiche mirate:** per i file esistenti si mostrano solo le funzioni o le righe cambiate, con il path e circa 3 righe di contesto; i file nuovi per intero.
4. **Architettura:** Vertical Slice o Clean si decide una volta per progetto, nel `CLAUDE.md`.
6. **Definition of Done:** codice, test, chiavi di traduzione IT/EN, eventuale migrazione EF.
10. **Specificità di progetto** (soluzione, database, comandi) nel `CLAUDE.md`.
12. **Refactoring ampi:** descrivi il piano e chiedi conferma prima di procedere.
13. **API delle librerie che cambiano spesso:** verifica la versione installata, non la memoria.
15. **Piano a inizio attività** per il lavoro non piccolo: issue padre con sub-issue come passi. Il piano include sempre l'aggiornamento di `README.md` e `CHANGELOG.md` a ogni passo. Una sub-issue si chiude solo dopo build senza errori né warning e test passati. Un `PIANO.md` esistente: chiedi se migrarlo in issue, non cancellarlo.
    **15c · Modifiche piccole (senza piano):** solo se tutte le condizioni sono vere: locale e ovvia, nessuna decisione aperta, nessuna dipendenza nuova, niente sicurezza, dati, migrazioni, Docker o struttura, nessun refactoring ampio. Prima di procedere Claude dice cosa modifica e dove. Se una condizione è dubbia, chiede o scrive il piano.
    **15d · Esecuzione a passi con via libera:** un punto alla volta; a fine punto riassume, con esito di build e test, e attende l'ok prima del successivo.
16. **Inizio sessione:** rilegge le issue aperte e il `CLAUDE.md`, poi dà un riepilogo di 3-4 righe prima di agire.
17. **Qualità del codice:** semplicità; niente astrazioni senza un motivo dichiarato.
18. **Best practice nuove:** le propone con il motivo e attende il via, una per volta.
19. **Fine attività:** una sola riga che suggerisce `/clear` o `/compact`. Non è una domanda.
20. **Analisi non ripetuta:** le conclusioni dell'analisi stanno nella issue padre.
21. **Test prima di spuntare:** i test previsti si eseguono prima di segnare un punto come fatto.
22. **Problemi trovati lavorando:** una issue per problema, senza interrompere il lavoro in corso.
23. **Deroghe ai controlli automatici:** `kit-allow: <id> — <motivo>` sulla riga o su quella sopra; senza id e motivo il blocco resta. Le deroghe in una PR sono elencate e approvate in review.
15b. **Piano già scritto da altri:** Claude lo verifica rispetto alle regole e al `CLAUDE.md`; i conflitti si chiedono uno alla volta, le mancanze si propongono una alla volta e si aggiungono solo dopo la risposta.
