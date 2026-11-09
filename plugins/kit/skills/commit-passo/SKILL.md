---
description: Crea i commit locali uno alla volta, come da git.md. Non richiede la GitHub CLI. Mai su main o develop (propone il branch di lavoro), piano dei commit in piano-commit.md, tipo del commit chiesto solo se ambiguo, ok esplicito prima di ogni commit. Non fa push. Si lancia solo su richiesta.
disable-model-invocation: true
argument-hint: [N]
---

# Commit uno alla volta

Rispondi in italiano. Una sola domanda per messaggio e attendi la risposta. Messaggi di commit in inglese, Conventional Commits (`git.md`). Non fare mai push, `--amend`, `reset`, `--no-verify`, `git add -A` né `git add .`: aggiungi i file per nome.

1. **Repository.** Esegui `git rev-parse --show-toplevel`. Se non è un repository, dillo e termina: non eseguire mai `git init`.
2. **Stato.** In sola lettura: `git branch --show-current`, `git status --short`, `git diff --stat`, `git diff --cached --stat` e, se esiste, `piano-commit.md`. Se non ci sono modifiche e `piano-commit.md` non ha commit aperti, dillo e termina. Se ci sono conflitti non risolti, segnalalo e termina senza committare.
3. **Branch.** Se il branch corrente è `main` o `develop` (o il nome del branch principale dichiarato nel `CLAUDE.md`), non committare lì. Se `develop` non esiste, chiedi con una sola domanda se crearlo da `main` (branch locale) e attendi la risposta. Poi proponi tipo, nome e branch di partenza, e chiedi conferma con una sola domanda:
   - `feature/` o `bugfix/` partono da `develop`;
   - `hotfix/` parte da `main`;
   - `release/` parte da `develop`, solo se si prepara un rilascio.
   Il nome è `tipo/descrizione-breve` in minuscolo con trattini; con i ticket nei branch (voce del `CLAUDE.md`) l'ID entra nel nome. Dopo il sì crea il branch con `git switch -c <nome> <partenza>`: le modifiche non committate vengono con te. Se la base corrente non coincide con quella scelta e il cambio rischia di dare conflitti, fermati e dillo. Se sei già su un branch di lavoro, chiedi comunque se continuare lì: la conferma vale solo per questo lavoro.
4. **File da escludere.** Segnala e non includere in nessun commit: segreti, `.env`, chiavi e certificati, file generati (`bin`, `obj`, `node_modules`, `dist`), file di IDE personali, `PIANO.md`, `CHECKLIST.md` e `piano-commit.md` (si committano solo se l'utente lo chiede). Se vedi qualcosa che sembra un segreto, fermati e segnalalo.
5. **Piano dei commit.** Se `piano-commit.md` esiste con caselle aperte, chiedi con una sola domanda se riprenderlo o sostituirlo. Altrimenti raggruppa le modifiche in unità logiche, nell'ordine di `git.md` («Granularità e sequenza»): codice di produzione (modello, EF e migrazione; poi endpoint o UI), poi `test(scope)` in commit separati, poi `docs(scope)` o `chore(...)` per `README.md`, `CHANGELOG.md` e ADR. Un `fix` è un commit a sé, con la causa radice nel corpo; refactoring, formattazione e cambi di comportamento non si mescolano. Per ogni commit scrivi oggetto proposto, file inclusi e tipo, e salva l'elenco in `piano-commit.md` nella radice, con una casella `[ ]` per commit.
5b. **Lotto (argomento numerico, opzionale).** Se l'utente ha passato un argomento `N`, è la dichiarazione esplicita «esegui fino a N commit senza chiedere l'ok a ciascuno» (`git.md`, «Commit multipli»). Senza argomento salta questo passo: un ok per ogni commit.
   - Argomento non numerico, zero o negativo: nessun lotto, dillo e prosegui con un ok per commit.
   - Leggi nel `CLAUDE.md`, sezione «Git», la voce `Commit di fila, massimo per lotto`. Se manca, è a segnaposto o non è chiara, chiedi con **una sola domanda** il tetto (suggerendo 5, oppure `non abilitato`) e scrivilo nella voce. Questa domanda si pone solo qui, mai senza argomento.
   - `non abilitato`: nessun lotto, dillo e prosegui con un ok per commit.
   - `N` maggiore del tetto: usa il tetto e avvisa. Il lotto vale solo per questo piano e per al massimo `N` commit.
6. **Tipo del commit.** Deducilo da file e diff e chiedilo solo se è ambiguo:
   - chiaro, senza domanda: solo test (`test`), solo documentazione (`docs`), solo `Dockerfile`, compose, `.csproj` o dipendenze (`build`), solo pipeline CI (`ci`), solo formattazione o configurazione (`chore`), funzionalità nuova con file nuovi e senza cancellazioni (`feat`);
   - ambiguo, una domanda con le opzioni plausibili e una raccomandazione: codice di produzione modificato senza che sia chiaro se è `feat`, `fix` o `refactor`; possibile breaking change (`!` e footer `BREAKING CHANGE:`); correzione di sicurezza (`fix(security)`).
   Se un file ha modifiche destinate a commit diversi, `git add -p` non è disponibile: chiedi caso per caso se unire i commit oppure preparare una patch parziale da applicare con `git apply --cached`, mostrandola prima. Non scegliere da solo.
   Lo scope è il modulo o la cartella toccata; se il `CLAUDE.md` elenca gli scope ammessi, usa solo quelli.
7. **Presenta il piano** e correggilo se l'utente chiede di unire, dividere, riordinare o escludere commit. L'approvazione del piano non vale come ok ai commit.
8. **Un commit alla volta.** Per il commit `n/N`:
   - aggiungi i file per nome (`git add <file>…`);
   - controlla `git status --short`, `git diff --staged` e `git diff --cached --check`; se `gitleaks` è già installato, eseguilo sulle modifiche in stage (altrimenti dillo, senza installarlo); segnala file molto grandi o binari non attesi;
   - se la build o i test sono rossi per cause del lavoro, non committare: dillo. Un commit WIP (`chore(wip): …`) solo se l'utente lo chiede esplicitamente;
   - mostra file inclusi e messaggio completo: oggetto in inglese, all'imperativo, minuscolo, senza punto finale, al massimo 72 caratteri; il corpo spiega il perché, cita per nome tipi, metodi e file toccati; nei `fix` indica la causa radice;
   - se il `CLAUDE.md` chiede l'attribuzione di Claude nei commit, aggiungi il trailer in fondo dopo una riga vuota (`Co-Authored-By: <modello> <noreply@anthropic.com>`);
   - **chiedi l'ok esplicito** («Committo questi file con questo messaggio?») e attendilo. Senza ok non committare. **Eccezione, solo nel lotto del passo 5b:** per i primi `N` commit mostra file e messaggio senza attendere risposta e committa; il lotto si interrompe con una domanda se un controllo fallisce, compare un possibile segreto, il tipo è ambiguo, un file ha modifiche per commit diversi o un hook fallisce;
   - dopo l'ok esegui il commit, spunta la casella in `piano-commit.md` e mostra hash e oggetto. Se un hook fallisce, correggi la causa e ricrea quel commit, senza passare al successivo.
9. **Pausa.** Dopo ogni commit chiedi se procedere con il successivo, indicando `n/N` e oggetto. Il sì a un commit non vale per i successivi. Nel lotto del passo 5b la pausa arriva dopo l'N-esimo commit: chiedi se continuare; un secondo lotto richiede una nuova dichiarazione. Se l'utente dichiara a parole «fai tutti i commit di fila», l'eccezione vale solo per questo piano (`git.md`, «Commit multipli»).
10. **Chiusura.** Riepiloga i commit creati e quelli rimasti. Proponi i punti sensati per un push intermedio (gruppo coerente con build e test verdi fino a lì) e ricorda che il push lo esegui solo su richiesta. Quando tutte le caselle sono spuntate, cancella `piano-commit.md` senza chiedere conferma.
