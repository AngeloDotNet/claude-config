---
description: Controlla il lavoro corrente contro la checklist di consegna del profilo del progetto e poi esegue i controlli di una soluzione .NET, di un frontend Angular o di entrambi (fullstack, in base ai file toccati) prima di dichiarare chiuso un lavoro: ripristino, formattazione, build in Release senza avvisi, using inutilizzati, test, pacchetti vulnerabili, modello EF senza migrazione, compose valido e spazi bianchi. Riporta l'esito reale senza modificare file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Verifica: checklist di consegna e controlli

Rispondi in italiano. Una sola domanda per messaggio. Questa skill non modifica file.

## 0. Checklist di consegna sul lavoro corrente
1. Scegli la checklist in base al campo «Profilo» del `CLAUDE.md` della radice. Con `mini`: leggi `checklist-mini.md` nella cartella di questa skill. Con `standard`, `strutturato`, o senza un profilo dichiarato (campo assente o ancora a segnaposto: vale `strutturato`): leggi `.claude/rules/qualita.md`, sezione «0b. Checklist di consegna». Se il file manca, dillo e fermati. Nel riepilogo indica il profilo e il file usati.
2. Raccogli in sola lettura: `git status --short`, `git diff --stat`, `git diff --cached --stat`, il branch corrente, le issue aperte della serie (con `gh`, se la riga gh del `CLAUDE.md` dice «sì») e l'esito dei test se sono stati eseguiti nella sessione.
3. Per ogni voce decidi: «ok» (verificata sul lavoro), «manca» (non fatta), «non verificata» (si può dire solo eseguendo qualcosa) o «non pertinente» (il progetto o il lavoro non la riguardano).
4. Presenta quattro gruppi: ok, manca, non verificata, non pertinente. Per ogni voce «manca» indica una riga di cosa fare. Le voci «non pertinente» si elencano solo nel gruppo, senza commento.
5. Non segnare «ok» una voce che richiede un'esecuzione: va in «non verificata» finché i controlli indicati dalla sezione 1 (sezione 2 e `frontend.md`) non passano.
6. Non dichiarare chiuso il compito: il giudizio finale resta all'utente.

## 1. Quali controlli eseguire
Le parti possibili sono due: **backend .NET** (sezione 2) e **frontend Angular** (procedura di `frontend.md` in questa cartella). In un progetto fullstack possono servire entrambe.
1. **Con una cartella come argomento** si controlla solo quella: se ha `package.json` e `angular.json` è il frontend; se contiene un `.sln` è il backend; se ha entrambi, si eseguono le due parti.
2. **Senza argomento** decidono i file toccati dal lavoro: le modifiche non committate (anche i file non tracciati) e quelle dei commit del branch non ancora in `develop` (`git diff --name-only develop...HEAD`; se `develop` non esiste, il branch principale del `CLAUDE.md`).
   - `*.cs`, `*.csproj`, `*.props`, `*.sln` richiedono la parte backend;
   - `*.ts`, `*.html`, `*.css`, `*.scss`, `angular.json`, `package.json` sotto la cartella di un frontend Angular richiedono la parte frontend;
   - se il lavoro tocca file di entrambi i tipi, esegui **entrambe** le parti, prima il backend: un fallimento nella prima non fa saltare la seconda.
3. Se nessun file toccato richiede una delle due parti, dillo e non eseguire quei controlli; restano la checklist (sezione 0) e `git diff --check`. Se non puoi stabilire i file toccati (non è un repository git), esegui le parti presenti nel progetto.
4. **Esito unico.** Dichiara quali parti hai controllato e quali no, con il motivo. L'esito complessivo è «superata» solo se tutte le parti eseguite lo sono; una parte richiesta e non eseguita lo rende «non superata».

## 2. Controlli del backend .NET
Si eseguono solo se la sezione 1 richiede la parte backend. Per la parte frontend si segue `frontend.md` in questa cartella.

Questa skill esegue i controlli e riporta l'esito. Non corregge nulla: se un controllo fallisce, lo riporta con il dettaglio. Il ripristino dei pacchetti scrive nelle cartelle di build (`bin`, `obj`), ma non modifica il codice. I comandi sotto sono il default: se la tabella «Comandi» del `CLAUDE.md` ne indica di diversi, usa quelli. `<sln>` è il file della soluzione trovato al passo 1.

1. **Soluzione.** Cerca il file `.sln` nella cartella indicata o nella radice del repository. Se ce ne sono più di uno, chiedi una sola domanda: quale verificare.
2. **Ripristino.** `dotnet restore <sln> --locked-mode` se il progetto ha i lock file (`packages.lock.json`), altrimenti `dotnet restore <sln>`. Se fallisce, riporta l'errore e fermati: gli altri controlli non hanno senso senza pacchetti.
3. **Formattazione.** `dotnet format <sln> --verify-no-changes --no-restore`. Fallisce se il codice non rispetta formattazione e regole `.editorconfig` a severità `warning` o superiore (`backend-regole.md` §2).
4. **Build.** `dotnet build <sln> --no-restore --configuration Release -warnaserror`. Un avviso è un errore: `qualita.md` §4 richiede una build senza warning. Riporta ogni problema con il file e la riga.
4b. **Using inutilizzati.** `dotnet format style <sln> --diagnostics IDE0005 --severity info --verify-no-changes --no-restore` (`backend.md`: MUST, dopo una build senza errori). Se il comando non esiste nella versione dell'SDK installata o `IDE0005` non è riportata, il controllo risulta «non verificato», non superato; verifica la sintassi sulla versione in uso (`core.md` §6.13).
5. **Test.** `dotnet test <sln> --no-build --configuration Release`. Riporta il numero di test eseguiti, falliti e saltati. Un test saltato è segnalato, non ignorato (`qualita.md` §4).
6. **Copertura (se disponibile).** Se il progetto di test ha `coverlet.collector`, esegui i test con `--collect:"XPlat Code Coverage"` e riporta la copertura. La soglia di `qualita.md` §4 (80% sul codice nuovo o modificato, solo profilo `strutturato`) non si calcola da questo dato globale: dillo, e segna la soglia «non verificata» salvo che l'utente indichi come misurarla.
7. **Pacchetti vulnerabili.** `dotnet list <sln> package --vulnerable --include-transitive` (`core.md` §3). Se l'output contiene «has the following vulnerable packages», il controllo non è superato: riporta ogni pacchetto con la gravità data dallo strumento. Non aggiornare pacchetti da questa skill.
8. **Modello EF.** Se il progetto usa EF Core: `dotnet ef migrations has-pending-model-changes --project <progetto dei dati> --startup-project <progetto di avvio>` (disponibile da EF Core 8: verifica che il comando esista nella versione installata). Se lo strumento non è installato o il comando non esiste, il controllo risulta «non verificato», non superato.
9. **Docker.** Se il repository ha file compose, `docker compose config` (con `.env.example` come segnaposto se manca `.env`, senza stamparne i valori). Se Docker non è disponibile, «non verificato».
10. **Spazi bianchi.** `git diff --check` e `git diff --cached --check` (spazi finali, marcatori di conflitto, fine riga incoerenti). Se il repository non è git, «non verificato».
11. **Esito.** Chiudi con un esito complessivo: «superata» solo se tutti i controlli sono passati, altrimenti «non superata», con l'elenco dei controlli falliti o non verificati e, per ognuno, il comando eseguito e la parte rilevante dell'output.

Il gate non sostituisce i test di integrazione sul database di prova, che richiedono la connessione di prova (`backend-app.md` §4.5): se sono previsti, lo segnala come controllo non eseguito. Non sostituisce nemmeno `/code-review` e, per i temi sensibili, `/security-review` (`lavoro.md`).

## 3. Da lanciare a parte (lancio manuale dell'utente)
Questa skill non lancia altro. Nel gruppo «non verificata» indica, se servono, queste skill a lancio manuale:
- `/kit:revisione sicurezza`: il lavoro tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali.
- `/kit:revisione gdpr-dati`: solo se il lavoro riguarda dati personali davvero.
- `/code-review`: sempre, per i difetti.

Riferimenti: `core.md` §3; `qualita.md` §0b e §4 (profilo `mini`: `checklist-mini.md`); `backend-regole.md` §2; `backend-app.md` §4.5.
