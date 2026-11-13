---
description: Esegue il controllo di verifica di una soluzione .NET prima di dichiarare chiuso un lavoro: ripristino, formattazione, build in Release senza avvisi, test, pacchetti vulnerabili, modifiche al modello EF senza migrazione, compose valido e spazi bianchi. Riporta l'esito reale senza modificare file. Per il frontend vedi /kit:verifica-frontend. Si lancia solo su richiesta.
model: haiku
argument-hint: [cartella-soluzione]
---

# Verifica della soluzione .NET

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill esegue i controlli e riporta l'esito. Non corregge nulla: se un controllo fallisce, lo riporta con il dettaglio. Il ripristino dei pacchetti scrive nelle cartelle di build (`bin`, `obj`), ma non modifica il codice. I comandi sotto sono il default: se la tabella «Comandi» del `CLAUDE.md` ne indica di diversi, usa quelli. `<sln>` è il file della soluzione trovato al passo 1.

1. **Soluzione.** Cerca il file `.sln` nella cartella indicata o nella radice del repository. Se ce ne sono più di uno, chiedi una sola domanda: quale verificare.
2. **Ripristino.** `dotnet restore <sln> --locked-mode` se il progetto ha i lock file (`packages.lock.json`), altrimenti `dotnet restore <sln>`. Se fallisce, riporta l'errore e fermati: gli altri controlli non hanno senso senza pacchetti.
3. **Formattazione.** `dotnet format <sln> --verify-no-changes --no-restore`. Fallisce se il codice non rispetta formattazione e regole `.editorconfig` a severità `warning` o superiore (`backend.md` §2).
4. **Build.** `dotnet build <sln> --no-restore --configuration Release -warnaserror`. Un avviso è un errore: `core.md` §4 richiede una build senza warning. Riporta ogni problema con il file e la riga.
5. **Test.** `dotnet test <sln> --no-build --configuration Release`. Riporta il numero di test eseguiti, falliti e saltati. Un test saltato è segnalato, non ignorato (`core.md` §4).
6. **Copertura (se disponibile).** Se il progetto di test ha `coverlet.collector`, esegui i test con `--collect:"XPlat Code Coverage"` e riporta la copertura. La soglia di `core.md` §4 (80% sul codice nuovo o modificato) non si calcola da questo dato globale: dillo, e segna la soglia «non verificata» salvo che l'utente indichi come misurarla.
7. **Pacchetti vulnerabili.** `dotnet list <sln> package --vulnerable --include-transitive` (`core.md` §3). Se l'output contiene «has the following vulnerable packages», il controllo non è superato: riporta ogni pacchetto con la gravità data dallo strumento. Non aggiornare pacchetti da questa skill.
8. **Modello EF.** Se il progetto usa EF Core: `dotnet ef migrations has-pending-model-changes --project <progetto dei dati> --startup-project <progetto di avvio>` (disponibile da EF Core 8: verifica che il comando esista nella versione installata). Se lo strumento non è installato o il comando non esiste, il controllo risulta «non verificato», non superato.
9. **Docker.** Se il repository ha file compose, `docker compose config` (con `.env.example` come segnaposto se manca `.env`, senza stamparne i valori). Se Docker non è disponibile, «non verificato».
10. **Spazi bianchi.** `git diff --check` e `git diff --cached --check` (spazi finali, marcatori di conflitto, fine riga incoerenti). Se il repository non è git, «non verificato».
11. **Esito.** Chiudi con un esito complessivo: «superata» solo se tutti i controlli sono passati, altrimenti «non superata», con l'elenco dei controlli falliti o non verificati e, per ognuno, il comando eseguito e la parte rilevante dell'output.

Il gate non sostituisce i test di integrazione sul database di prova, che richiedono la connessione di prova (`backend-app.md` §4.5): se sono previsti, lo segnala come controllo non eseguito. Non sostituisce nemmeno `/code-review` e, per i temi sensibili, `/security-review` (`lavoro.md`).

Riferimenti: `core.md` §0b, §3 e §4; `backend.md` §2; `backend-app.md` §4.5.
