# Changelog

Registro delle modifiche alle regole del template: un titolo per giorno, con una sottosezione per intervento (cosa, dove e perché). Più recente in alto.

## 2026-11-10

### Wiki: pagina «Cosa contiene» allineata al template

**Perché:** la pagina `contenuto.md` della wiki non elencava `lavoro.md`, i nuovi `paths:` di `frontend.md` né gli esempi aggiunti in `_template/`.
**Cosa / Dove:** `docs/claude-config/contenuto.md` (repository `wiki`): riga di `lavoro.md` nella tabella dei moduli, `angular.json` e `tsconfig*.json` tra i file che caricano `frontend.md`, righe `ci.yml`, `eslint.config.example.js` e `settings.example.json` nella tabella di `_template/`.
**Verifica:** solo testo, nessuna build della wiki; nessun percorso reale nella pagina.
**Note:** la riga di `check-quality` in `plugin.md` resta da aggiornare (`CHECKLIST.md`): la pagina ha modifiche non committate di un'altra sessione. Wiki non committata.

### Esempi di ESLint e di CI nel template

**Perché:** le regole dicono «verificato dal lint» e «CI a ogni PR», ma il template non aveva alcuna configurazione di riferimento (analisi, punto 6c).
**Cosa / Dove:** `_template/eslint.config.example.js` (flat config con `angular-eslint`: no `any`, `OnPush`, `inject()`, prefisso dei selettori, control flow, accessibilità dei template, confini tra `core/`, `shared/` e `features/`); `_template/ci/ci.yml` (job backend e frontend: build, test, lint, audit; action fissate allo SHA: checkout v7.0.1, setup-node v7.1.0, setup-dotnet v6.1.0, lette il 2026-11-10 dai repository ufficiali con `gh api` in sola lettura); descrizione in `_template/avvio-progetto.md` §4.
**Verifica:** `node --check` sul file ESLint; il YAML non è stato eseguito su GitHub e i nomi delle regole non sono stati provati su un progetto Angular. Segnalato nei commenti dei file e in `avvio-progetto.md`.
**Note:** gli SHA e le regole vanno riverificati al primo uso. Non committato (`piano-commit.md`).

### Regole frontend moderne (Angular)

**Perché:** `frontend.md` non diceva nulla su Signal Forms, `@let`, router moderno, uso di SSR e accessibilità con il CDK; scelta dell'utente: partire dal solo testo (6b), senza `eslint.config.js` né CI.
**Cosa / Dove:** `frontend.md` 1.6: Signal Forms non finché la versione installata non è stabile (§2 Form); guard e resolver funzionali, `canMatch`, `withComponentInputBinding()` (§2 Routing); regole d'uso di SSR (`afterNextRender`, niente `window` nel costruttore, nessun segreto nello stato trasferito, §8); `@let` (§13); `@angular/cdk/a11y` (§3 A11y). Tutte PREFER o condizionate alla versione.
**Verifica:** solo testo, nessuna build; `git diff --check` da eseguire.
**Note:** restano da fare, su richiesta, `eslint.config.js` e CI di esempio (6b). Non committato (`piano-commit.md`).

### Nuovi avvisi del frontend nel plugin `kit`

**Perché:** diverse regole di `frontend.md` erano solo scritte, senza alcun controllo. Verificato sul codice, il plugin copriva già l'Angular legacy (`guard-patterns`), i colori nei `.css` e i nomi Compose `compose*.yaml`: i controlli mancanti erano meno di quelli segnalati dall'analisi. Per scelta dell'utente sono avvisi non bloccanti, per evitare falsi positivi che fermino il lavoro.
**Cosa / Dove:** `plugins/kit/scripts/check-write.mjs` (`check-quality`): avvisa su `@Input`/`@Output`/`@ViewChild`/`@ContentChild` (§14), `@HostBinding`/`@HostListener` (§15), `template:`/`styles:` inline (§2), `mutate()` su un signal (§13), `waitForTimeout` (§10), `ngClass`/`ngStyle` (§14) e `transition: all` (§3). Commenti di intestazione di `check-write.mjs` e `guard-write.mjs` aggiornati. `plugins/kit/tests/quality.test.mjs`: tre test nuovi.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 123 su 123 verdi (erano 120); `git diff --check` pulito.
**Note:** nessun hook `SessionStart`: `prompt-start` già segnala le regole cambiate, e `core.md` §6.16 non chiede più la rilettura di tutte le regole. Il plugin cambia (con la skill `copia-regole` della fase 5): la versione si decide al prossimo rilascio. La riga di `check-quality` nella wiki (`plugin.md`) non è aggiornata (`CHECKLIST.md`). Non committato (`piano-commit.md`).

### Mancanze tecniche di backend e Docker

**Perché:** l'analisi delle regole segnalava lacune su health check, log di EF Core, hardening dei container e tipi di risposta degli endpoint. Verificate sui file, molte voci proposte erano già presenti (`TimeProvider`, `IExceptionHandler`, utente non root, `read_only`, `cap_drop`): sono state scritte solo quelle davvero mancanti, ognuna approvata dall'utente.
**Cosa / Dove:** `backend-app.md` (1.2) §4.4: `EnableSensitiveDataLogging` e `EnableDetailedErrors` solo in Development. `docker.md` (1.2): `no-new-privileges` nell'hardening del compose di produzione; endpoint `/health/live` e `/health/ready` per un monitor esterno, solo se concordati per progetto, non pubblici e senza `HEALTHCHECK` nel container. `backend.md` (1.3): `TypedResults` e `Results<...>` per le risposte degli endpoint (PREFER).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito.
**Note:** le API citate (health check, `TypedResults`) sono stabili e non sono state rilette sulla documentazione in questa sessione; `backend.md` chiede di verificarle sulla versione installata. Scartati per scelta dell'utente: pooling e retry di EF Core, `LoggerMessage`. Frontend, `eslint.config.js` e CI di esempio rimandati. Non committato (`piano-commit.md`).

### Nuovo modulo `lavoro.md` e permessi di esempio

**Perché:** le regole non dicevano come lavorare con Claude Code su contesto e token, indagine dei difetti, review, contenuti non fidati e imprevisti, e il template non offriva un punto di partenza per i permessi.
**Cosa / Dove:** `.claude/rules/lavoro.md` (1.0, circa 3 KB, sempre caricato): lettura mirata e subagent di sola lettura per le ricerche ampie, `/clear` e plan mode, indagine di un difetto (riprodurre, una ipotesi alla volta, causa radice, test di regressione), review (`/code-review`, verifica di ogni rilievo prima di applicarlo), contenuti non fidati come dati (prompt injection), imprevisti e rollback (migrazione distruttiva, `git revert`). `_template/settings.example.json`: `deny` per `.env`, chiavi e `secrets/`, `allow` per i comandi di sola verifica; descritto in `avvio-progetto.md` §4, non copiato da solo. `lavoro.md` aggiunto agli elenchi dei moduli sempre previsti: `core.md` (moduli correlati), `CLAUDE.md`, `avvio-progetto.md` e skill `/kit:copia-regole` (anche nella modalità solo Git).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; JSON valido; `git diff --check` pulito.
**Note:** la sintassi dei permessi di `settings.example.json` va verificata sulla versione di Claude Code installata (non verificata in questa sessione). Non committato (`piano-commit.md`). Il rilascio del plugin non cambia, ma la skill `/kit:copia-regole` è modificata: valutare la versione del plugin al prossimo rilascio.

### Percorsi di caricamento dei moduli (`paths:`)

**Perché:** `docker.md` non si caricava sui file Compose con estensione `.yaml` o chiamati `compose.yml` (il nome preferito da Compose V2), né su `.dockerignore`; `frontend.md` e `security-frontend.md` non si caricavano su `angular.json` e `tsconfig*.json`, cui si riferiscono le regole su compilatore e budget; i moduli opzionali, una volta attivati, si sarebbero caricati sempre perché senza `paths:`.
**Cosa / Dove:** `docker.md` (1.2): `**/{docker-compose,compose}*.{yml,yaml}`, `**/.dockerignore`. `frontend.md` e `security-frontend.md`: aggiunti `**/angular.json` e `**/tsconfig*.json`. `backend-email.md`, `backend-infra.md` e `feature-workflow.md`: aggiunta l'intestazione `paths:` (backend, e backend più frontend per l'ultimo). `CLAUDE.md`: elenco dei percorsi aggiornato.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito.
**Note:** scelta dell'utente: solo `paths:` e intestazioni, nessun contenuto spostato (le sezioni lunghe di `core.md`, `git.md` e `security.md` restano sempre caricate). Il controllo dei segreti del plugin (`guard-write.mjs`) non riconosce ancora i nuovi nomi Compose: annotato in `CHECKLIST.md`. Non committato (`piano-commit.md`).

### Deduplica di regole ripetute tra i moduli

**Perché:** lo stesso concetto era scritto in più punti (permessi git, regola «una domanda alla volta», piano, checklist di sicurezza, sicurezza del frontend, micro frontend), con il rischio che le copie divergessero e con più token sempre caricati.
**Cosa / Dove:** `core.md` (3.37): §6.11 rimanda a `git.md`; §5 (CI/CD) e §0b (prima voce) accorciati; §6.20, §6.21 e §6.16 ridotti a rimandi al punto 15 e alla regola inviolabile; in §0b quattro voci di sicurezza unite in due. `git.md` (1.4): intro e «Sicurezza della cronologia» rimandano a «Integrazione GitHub». `frontend.md` (1.5): §9, §2 «Performance» e §12 «Quando valutarli» senza ripetizioni. `CLAUDE.md`: voce «Push, PR, tag…» rimanda a `git.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito. Risparmio di circa 1,5 KB nei file sempre caricati: la riduzione sostanziale è nella fase 4.
**Note:** nessuna regola eliminata. Molti duplicati segnalati dall'analisi erano già rimandi (per esempio il primo amministratore e le migrazioni in `docker.md`) e non sono stati toccati. Non committato (`piano-commit.md`).

### Correzione di contraddizioni e rimandi tra i moduli

**Perché:** un'analisi delle regole ha trovato punti in contrasto tra moduli o con rimandi imprecisi; ognuno è stato verificato sui file prima di correggerlo (`PIANO.md`, fase 1) e le scelte sostanziali sono state decise dall'utente.
**Cosa / Dove:**
- `git.md` (1.4): suffisso `(#NNN)` dei commit (squash su `develop`, `merge:` su `main`); push eseguito da Claude solo su richiesta o con conferma (nessun «a cura dell'utente» in «Commit multipli»); «Repository» non dice più che Claude non ha accesso ai repository; la CI verde è a cura dell'utente.
- `core.md` (3.37): copertura 80% sulla logica di business del codice nuovo o modificato (§4); plan mode di Claude Code conciliato con `PIANO.md` (§6.15: il piano approvato si copia in `PIANO.md` prima di toccare file); §6.16 rilegge solo `PIANO.md` e `CLAUDE.md`, le regole sono già caricate; la cancellazione dei piani senza conferma è un'eccezione voluta al punto 11.
- `security-backend.md` (1.1): niente `secret` Docker, solo variabili d'ambiente da `.env`, come `docker.md`. `security.md` (2.1) e `security-frontend.md` (1.1): i rimandi a «Autenticazione e Autorizzazione» indicano `security-backend.md`.
- `backend.md` (1.3): rimando a `backend-architecture.md` §2c; motivo del divieto di Quartz.NET e Hangfire (scelta del kit, derogabile su proposta approvata).
- `feature-workflow.md`: in Vertical Slice le entità stanno in una cartella condivisa (`Data/`), come `backend-architecture.md` §2a.
- `frontend.md` (1.5): `transition` solo sulle proprietà che cambiano, mai `all`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito.
**Note:** non committato (`piano-commit.md`). Il rilascio del plugin non cambia.

### Best practice ufficiali di .NET e di Angular nelle regole

**Perché:** le regole non dicevano esplicitamente che Claude, per ciò che esse non disciplinano, segue le best practice ufficiali di .NET e di Angular; restava solo il rimando generico alle convenzioni del linguaggio in `core.md` §6.17.
**Cosa / Dove:** `.claude/rules/backend.md` (versione 1.2): nuova voce «Best practice .NET (PREFER)» in fondo a §2, con rimando alla documentazione ufficiale Microsoft. `.claude/rules/frontend.md` (versione 1.4): nuova voce «Guida ufficiale di Angular (PREFER)» in testa a §15 «Migliori pratiche di Angular» (angular.dev). In entrambe: verifica sulla versione installata e non a memoria (`core.md` §6.13), prevalenza delle regole del kit e del `CLAUDE.md`, scelte nuove da proporre prima (`core.md` §6.18).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito. `README.md` e la wiki (`docs/claude-config/contenuto.md`) non descrivono il contenuto dei due moduli: nessuna modifica.
**Note:** nessuna sezione «§17» separata, per non duplicare §15. Non committato (`piano-commit.md`). Il rilascio del plugin non cambia.

### Nome libero per il branch di sincronizzazione di main in develop

**Perché:** dopo la chiusura di una PR di sincronizzazione il branch `bugfix/sync-main-into-develop` esisteva ancora in locale e ha costretto a scegliere a mano `-2` e `-3`; la skill e `git.md` non dicevano cosa fare.
**Cosa / Dove:** `plugins/kit/skills/pr-main/SKILL.md` (passo 4): se il nome esiste già in locale o sul remoto, propone il primo nome libero (`-2`, `-3`, ...) con la domanda singola, verificando con `git branch --list` e `git ls-remote --heads origin`, senza cancellare né riusare il vecchio. `.claude/rules/git.md` (versione 1.3, «Strategia di merge con git flow»): stessa regola.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito. `README.md` e wiki non citano il nome del branch.
**Note:** la skill è testo senza test automatici. Non committato (`piano-commit.md`). La versione del plugin non cambia.

### Rilascio del plugin kit 1.11.0

**Perché:** le novità del plugin dopo la 1.10.0 (skill per commit e PR, promemoria del sito, riordino delle regole di sicurezza) erano ferme in `develop` con la versione 1.10.0.
**Cosa / Dove:** `plugins/kit/.claude-plugin/plugin.json`: versione 1.11.0. Sezione `### Rilascio 1.11.0` qui sotto. Wiki, `docs/claude-config/plugin.md`: nota di aggiornamento per la 1.11.0 (rinomina di `/kit:code-review` in `/kit:review-regole`, diciannove comandi, tredici controlli).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito; JSON validi.
**Note:** PR #22 chiusa con merge commit su `main` (`15b04a9`); tag `v1.11.0` e release GitHub pubblicati; `main` riportato in `develop` con le PR #23 (repository) e #37 (wiki).

### Rilascio 1.11.0

**Aggiunto:** le skill `/kit:commit-passo` (commit uno alla volta, con lotto `/kit:commit-passo N` entro il tetto del `CLAUDE.md`), `/kit:pr-develop` e `/kit:pr-main` (PR con `gh`, merge a cura dell'utente); la tabella dei comandi in `docs/skill.md`; la domanda sulla wiki del progetto e il promemoria di aggiornamento del sito (controlli `site-question` e `site-reminder`, tredici in tutto); il modello `_template/CHECKLIST.md`.

**Modificato:** `/kit:code-review` si chiama ora `/kit:review-regole` (chi lo usa deve adeguarsi); `security.md` è diviso in `security.md`, `security-backend.md` e `security-frontend.md`; il hook `session-plan` è eliminato (la rilettura di piano e regole è `core.md` §6.16, o `/kit:buongiorno`); `git.md` 1.2 e `core.md` 3.36; diciannove comandi.

**Corretto:** il commento di `session-close` e le pagine della wiki dicevano «fine sessione» per i hook `Stop`, che scattano a ogni risposta.

## 2026-11-09

### Tabella riepilogativa dei comandi del plugin

**Perché:** con diciannove skill non c'era un colpo d'occhio su cosa fa ciascuna e su quale argomento accetta.
**Cosa / Dove:** nuovo `docs/skill.md` (comando, cosa fa, argomento facoltativo; nessun comando ha opzioni con nome). Nella wiki, `docs/claude-config/plugin.md`: colonna «Argomento» aggiunta alla tabella dei comandi già presente, senza una seconda tabella duplicata. `README.md` rimanda al file.
**Verifica:** esito in `PIANO.md`; le 19 righe corrispondono alle cartelle in `plugins/kit/skills/`.
**Note:** la tabella si aggiorna a mano quando cambia una skill (promemoria in `CHECKLIST.md`); nessun controllo automatico.

### Commit di fila con argomento numerico in commit-passo

**Perché:** i commit uno alla volta sono lenti quando il piano ha molti commit banali e l'utente vuole già un lotto; `git.md` ammetteva solo la dichiarazione a parole «fai tutti i commit di fila».
**Cosa / Dove:** `/kit:commit-passo N` esegue fino a N commit senza ok a ciascuno, entro un tetto per progetto (`plugins/kit/skills/commit-passo/SKILL.md`: `argument-hint`, nuovo passo 5b, eccezione nel passo 8, pausa nel passo 9). Il tetto sta nel `CLAUDE.md`, sezione «Git», voce `Commit di fila, massimo per lotto`; Claude lo chiede una sola volta, solo quando si passa un numero e la voce manca. `git.md` alla 1.2 («Commit multipli», punto 4, e sezione sulle skill). `README.md` e wiki `plugin.md` allineati.
**Verifica:** esito dei test in `PIANO.md`. La skill è testo senza test automatici.
**Note:** il lotto si interrompe con una domanda se un controllo fallisce, compare un possibile segreto, il tipo è ambiguo, un file ha modifiche per commit diversi o un hook fallisce. Il tetto è una regola scritta, non un blocco tecnico. Nessun push, `--amend` o commit su `main`/`develop`. La versione del plugin non è cambiata.

### Skill per commit uno alla volta e PR verso develop e main

**Perché:** `git.md` descrive il commit passo-passo e le PR di git flow, ma ogni volta andavano ripetute a mano; inoltre il hook `guard-commands` blocca i commit su `main` e `develop` senza guidare verso il branch giusto.
**Cosa / Dove:** `plugins/kit/skills/commit-passo` (branch di lavoro mai su `main`/`develop`, piano in `piano-commit.md`, tipo di commit chiesto solo se ambiguo, ok prima di ogni commit), `pr-develop` (PR da `feature/*` o `bugfix/*` verso `develop`, titolo Conventional Commits per lo squash) e `pr-main` (PR da `develop`, `release/*` o `hotfix/*` verso il branch principale; controllo di `main` avanti rispetto a `develop` con branch `bugfix/sync-main-into-develop`; merge commit). `git.md` alla 1.1: titolo della sezione PR («apertura su conferma, merge a cura dell'utente»), il push del branch di lavoro è consentito (prima il testo diceva che Claude non crea branch remoti e che il push era dell'utente, in contrasto con «Integrazione GitHub»), nuova sezione di rimando alle skill. `README.md`, `marketplace.json` e `plugin.json`: diciannove comandi.
**Prerequisito:** `pr-develop` e `pr-main` iniziano con un controllo (passo 0): `gh --version` e `gh auth status`; se la GitHub CLI manca o non è autenticata, terminano subito dicendo cosa fare (`! gh auth login`). Verificano anche la riga del `CLAUDE.md` richiesta dal hook. `commit-passo` non richiede `gh`: i commit locali non ne hanno bisogno (`git.md`).
**Verifica:** esito dei test in `PIANO.md`. Le skill non hanno test automatici: sono testo che guida Claude; il comportamento di blocco è quello già coperto dai test di `guard-commands`.
**Note:** `bugfix/` parte da `develop`; da `main` parte solo `hotfix/`. Le skill chiedono sempre l'ok prima di commit, push e creazione della PR. La versione del plugin non è cambiata (rilascio rimandato).

### Markdown del repository e della wiki allineati ai controlli del sito

**Perché:** dopo il promemoria del sito, README e pagine della wiki (`docs/claude-config/`) contavano ancora undici controlli, non descrivevano la domanda sulla wiki né il promemoria a fine risposta, e dicevano «a fine sessione» per gli hook `Stop`, che in realtà scattano a ogni risposta.
**Cosa / Dove:** `README.md`: descrizione di `prompt-start` e `session-close` con la domanda sulla wiki e il promemoria, tredici controlli. Wiki, `docs/claude-config/`: `plugin.md` (tredici controlli; due nuove righe nella tabella dei promemoria `site-question` e `site-reminder`; elenco per script; schema di `kit-progetti.json` con `chiesto`; attivazione; test; «a fine di ogni risposta»; «sette script» corretto in «sei»), `contenuto.md` e `intro.md` (conteggio tredici), `funzionamento.md` (la domanda sulla wiki tra le cose che Claude chiede; l'aggiornamento della wiki tra quelle che Claude fa da solo). `PIANO.md`: test a 120 e sezione «Ripartenza» riallineata; `CHECKLIST.md`: voce sullo schema del wiki chiusa.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi (nessun codice cambiato in questo passo). `git diff --check` pulito sui file del repository e della wiki; `grep` su «undici» e «sette script» nelle pagine `docs/claude-config/`: nessun riferimento residuo al conteggio errato.
**Note:** il `CHANGELOG.md` della wiki e le pagine `docs/sagreeventi/` hanno modifiche di un'altra sessione: non toccate. Il commit `ae66ee1` citato nella wiki per la rinomina è corretto; nel log compare anche `ed87aed` con lo stesso messaggio, da non confondere.

### Promemoria e domanda sul sito di documentazione (plugin kit)

**Perché:** la regola `core.md` §5b non aveva un controllo deterministico: la skill `aggiorna-docs` è a lancio manuale e non chiedeva nulla quando la voce `sito` diceva `esiste: false`.
**Cosa / Dove:** `plugins/kit/scripts/lib/sito.mjs` (nuovo): lettura di `~/.claude/kit-progetti.json`, `siteQuestion` e `siteReminder`. `prompt-start.mjs` (UserPromptSubmit): finché la voce manca o dice `esiste: false` senza `chiesto`, chiede a Claude di fare una sola domanda (wiki sì/no, poi il percorso assoluto) e di salvare la risposta; un «no» salva `{ "esiste": false, "chiesto": true }` e la domanda non torna. `session-close.mjs` (Stop): con `esiste: true`, se `CHANGELOG.md` o `README.md` del progetto sono modificati e la cartella del sito non ha modifiche non committate, ricorda di aggiornare il sito. Commento di `session-close.mjs` corretto: il promemoria scatta a ogni Stop, non una volta per sessione. `aggiorna-docs` (passo 2): la risposta «no» salva `chiesto: true`. `core.md` alla 3.36, §5b.
**Verifica:** `plugins/kit/tests/sito.test.mjs` (16 test: domanda, promemoria, hook, configurazione malformata). `rules-watch.test.mjs`: il helper registra la risposta sulla wiki, così i test delle regole non vedono la domanda. `node --test plugins/kit/tests/*.test.mjs`: 120 su 120 verdi; `git diff --check` pulito; `hooks.json` valido.
**Note:** la voce della wiki nello schema di `plugin.md` (repository `wiki`) non documenta ancora `chiesto` (vedi `CHECKLIST.md`). Il promemoria non distingue un sito già aggiornato e committato da uno non toccato. Il percorso è assoluto, come in `aggiorna-docs`.

### Sito di documentazione aggiornato da core.md, non solo dalla skill

**Perché:** `aggiorna-docs` è una skill a lancio manuale (`disable-model-invocation: true`): se non la si lancia, il sito di documentazione resta indietro. La regola sul sito non stava in nessuna regola sempre attiva.
**Cosa / Dove:** `.claude/rules/core.md` §5b: nuova voce «Sito di documentazione esterno (wiki)» dopo «Lingua dei documenti» (aggiornamento a ogni step del piano, percorso chiesto una sola volta e salvato in `~/.claude/kit-progetti.json`, chiave `sito`, domanda se la voce manca, nessun commit né pubblicazione senza conferma). `core.md` alla 3.35. La skill `aggiorna-docs` resta come procedura dettagliata.
**Verifica:** test `node --test plugins/kit/tests/*.test.mjs` e `git diff --check`: esito riportato nel passo di `PIANO.md`.
**Note:** la regola è di comportamento: Claude la segue, ma nessun hook la impone. Un promemoria in `session-close.mjs` resta da decidere (vedi `CHECKLIST.md`).

### Caricamento condizionato delle regole: verifica da rifare

**Perché:** il template dichiara che i moduli con `paths:` (frontend, backend, docker, security-backend, security-frontend) si caricano solo quando si legge un file corrispondente. Il tentativo di verifica con `/context` in `sagreeventi` non è stato valido: la documentazione di Claude Code dice che le regole con `paths:` si caricano su richiesta e che `/context all` elenca solo i file caricati all'avvio, quindi i moduli condizionati non compaiono lì anche quando sono caricati.
**Cosa / Dove:** nessuna modifica alle regole del template. In `sagreeventi` il frontmatter di prova è stato riportato a `"**/*.{cs,csproj,props}"`, come nel template.
**Verifica:** `/context all` con `security.md` a 9,4k token: il caricamento all'avvio funziona. Nel terminale di `sagreeventi`, dopo la lettura di `Program.cs`, compaiono le righe `Loaded` per `backend-app.md` e `backend-architecture.md`; non compaiono per `backend.md` e `security-backend.md`. La prova non è pulita: la sessione ha riletto alcune regole in modo esplicito, quindi le righe `Loaded` possono derivare da quelle letture.
**Note:** la voce precedente, che parlava di caricamento condizionato non attivato, è da considerare superata. Da rifare con una lettura di `Program.cs` senza istruzioni sulle regole, per distinguere il caricamento su percorso dalle letture esplicite.

### Schema di `~/.claude/kit-progetti.json` documentato nel sito

**Perché:** il file è letto e scritto da `aggiorna-docs` e da `buonasera`, ma il suo formato non era scritto in nessun punto.
**Cosa / Dove:** `wiki/docs/claude-config/plugin.md`: nuova sezione «Il file `~/.claude/kit-progetti.json`» prima di «Attivazione», con le chiavi `sito` e `priorita`, chi le scrive e chi le legge, un esempio e le regole di modifica a mano. Il formato è stato ricavato dalle skill (`aggiorna-docs`, `buonasera`, `buongiorno`).
**Verifica:** l'esempio JSON è stato controllato con `JSON.parse`; `git diff --check` pulito sul sito.
**Note:** la documentazione descrive il comportamento attuale delle skill, invariato in questa modifica.

### `aggiorna-docs` verifica il formato di CHANGELOG e README

**Perché:** la skill scriveva la voce di CHANGELOG e le sezioni di README senza controllare che rispettassero il formato di `core.md` §5b, e non c'era alcun controllo dopo la scrittura.
**Cosa / Dove:** `plugins/kit/skills/aggiorna-docs/SKILL.md`: nuovo passo 6 (rilettura della voce e delle sezioni toccate, confronto con il formato, correzione o domanda se la correzione non è ovvia); il passo di chiusura diventa il 7.
**Verifica:** modifica di testo; `git diff --check` sul file.
**Note:** la verifica è un'istruzione a Claude, non uno script: un controllo deterministico richiederebbe codice e test a parte, non ancora deciso.

### Sito di documentazione allineato alle modifiche della giornata

**Perché:** il sito (`wiki/docs/claude-config`) descriveva ancora l'hook `session-plan`, la skill `code-review`, sette script con dodici controlli e `security.md` come file unico.
**Cosa / Dove:** `wiki/docs/claude-config/plugin.md`: undici controlli in sei script, tolta la riga di `session-plan` e il suo riferimento in `rules-watch`, `/kit:code-review` rinominato in `/kit:review-regole`, migrazione aggiornata. `wiki/docs/claude-config/contenuto.md`: tabella dei moduli con `security-backend.md` e `security-frontend.md`, conteggi aggiornati. `README.md`: la descrizione della pagina Plugin nella tabella della documentazione non cita più il piano a inizio sessione.
**Verifica:** riferimenti ai nomi dei file e dei comandi controllati con `grep` sul sito: nessun `session-plan` né `code-review` residuo nelle pagine del claude-config.
**Note:** il sito descrive lo stato del repository, non ancora rilasciato: la versione del plugin resta 1.10.0 finché non si decide il rilascio. Il percorso del sito è stato salvato in `~/.claude/kit-progetti.json`.

### Test duplicati in `core.md` e `frontend.md` ridotti a un solo proprietario

**Perché:** `core.md` §4 ripeteva i dettagli dell'integrazione backend (già in `backend-app.md` §4.5) e del frontend (già in `frontend.md` §10). `frontend.md` §10 ripeteva l'accessibilità automatica di `core.md` §4.
**Cosa / Dove:** `.claude/rules/core.md` §4: voce «Backend» con il rimando a `backend-app.md` §4.5, mantenute le due regole che restano nel file generale (chiedere prima di usare SQLite, nessun EF Core InMemory); voce «Frontend» con il rimando a `frontend.md` §10. `.claude/rules/frontend.md` §10: voce «Accessibilità automatica» ridotta alla parte propria (flussi E2E con tema light e dark). `core.md` alla 3.34, `frontend.md` alla 1.3.
**Verifica:** inventario con `grep` su dipendenze e test: le dipendenze (`core.md` §3) hanno già un proprietario; `git diff --check` pulito; riferimenti `§4.5` e `§10` verificati; `node --test plugins/kit/tests/*.test.mjs`: 104 su 104 verdi.
**Note:** la premessa del problema 7 è stata corretta in una voce precedente: la copia completa della regola inviolabile era solo in `CLAUDE.md` e `core.md`.

### README: riepilogo di inizio sessione

**Perché:** la frase diceva che `/kit:buongiorno` fa il riepilogo a inizio sessione, come faceva l'hook. Il comando invece si lancia a mano, e il piano a inizio sessione dipende dalla regola di `core.md` §6.16.
**Cosa / Dove:** `README.md`, sezione dei controlli del plugin: frase riscritta.
**Verifica:** modifica di testo.

### Hook `session-plan` eliminato: il riepilogo a inizio sessione è in `buongiorno`

**Perché:** il riepilogo a inizio sessione era fatto dall'hook, e la skill `buongiorno` lo fa già su richiesta. La parte sulle regole cambiate era duplicata di `prompt-start`, che gira a ogni messaggio e confronta le stesse impronte.
**Cosa / Dove:** eliminati `plugins/kit/scripts/session-plan.mjs` e la voce `SessionStart` in `plugins/kit/hooks/hooks.json`; tolti i quattro test di `session-plan` (due in `prompt-start.test.mjs`, due in `rules-watch.test.mjs`); commenti aggiornati in `lib/rules.mjs`, `prompt-start.mjs` e `rules-watch.test.mjs`; `README.md`, `plugin.json` e `marketplace.json` allineati (sei script).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 104 su 104 verdi; JSON dei tre file valido; nessun riferimento residuo a `session-plan` (escluso lo storico).
**Note:** senza l'hook, `PIANO.md` non entra più in automatico a inizio sessione: lo legge `buongiorno` o Claude per la regola di `core.md` §6.16. Il piano è stato trattato come da eliminare su richiesta dell'utente, dopo una valutazione che ne sconsigliava l'eliminazione per la sola parte sul piano.

### `buongiorno` rilegge `CLAUDE.md` e le regole

**Perché:** la regola di inizio sessione (`core.md` §6.16) chiede di rileggere `CLAUDE.md` e `.claude/rules/`; la skill non lo diceva.
**Cosa / Dove:** `plugins/kit/skills/buongiorno/SKILL.md` passo 1.
**Verifica:** modifica di testo; rilettura del passo.

### `security.md` diviso in tre file

**Perché:** `security.md` era di 212 righe e si caricava in ogni sessione, anche per progetti senza backend o senza frontend. Le sezioni su API, autenticazione, abuso e upload riguardano solo il backend; la sezione Frontend riguarda solo Angular.
**Cosa / Dove:** `.claude/rules/security.md` (versione 2.0): principi sempre attivi (mappa ASVS, crittografia, dati e segreti, mobile, supply chain, scansione, test, regola operativa, progettazione fail closed). Nuovo `.claude/rules/security-backend.md` (paths `**/*.{cs,csproj,props}`): autenticazione, protezione dell'API, abuso di risorse, vulnerabilità applicative, upload. Nuovo `.claude/rules/security-frontend.md` (paths `**/*.{ts,html,css,scss}`): sezione Frontend. Riferimenti aggiornati in `core.md`, `backend.md`, `backend-app.md`, `docker.md`, `frontend.md`, `CLAUDE.md`, nelle skill `accessi-api` e `copia-regole`, nel modello `_template/avvio-progetto.md` (nuove righe nella tabella dei moduli) e nei messaggi di `check-write.mjs` e `guard-write.mjs`.
**Verifica:** riferimenti ai file di regole controllati con `grep`: tutti i file citati esistono; test del plugin 104 su 104.
**Note:** per verificare il caricamento reale, `/context` nel terminale (non eseguibile da qui).

### Prescrizioni di `backend.md` da MUST a PREFER

**Perché:** le cartelle `Interfaces/`, `Validators/`, `Options/`, `Requests/`, `Responses/` e il file `GlobalUsings.cs` erano obbligatori in ogni progetto anche con un solo tipo, in contrasto con la semplicità di `core.md` §6.17.
**Cosa / Dove:** `.claude/rules/backend.md`: le cinque cartelle sono PREFER, da creare quando il progetto ha almeno un tipo di quella categoria; `GlobalUsings.cs` è PREFER per i `using` che ricorrono in più file. Il MUST sugli `using` inutilizzati resta.
**Verifica:** modifica di testo; rilettura delle voci.
**Note:** `backend.md` passa alla versione 1.1.

### Modello di `CHECKLIST.md` per i progetti

**Perché:** `core.md` §6.22 chiede la checklist dei problemi trovati lavorando, ma non esisteva un modello.
**Cosa / Dove:** nuovo `_template/CHECKLIST.md` con intestazione, formato a voci `[ ]` e una voce di esempio nelle sezioni «Aperte» e «Chiuse».
**Verifica:** file di sola documentazione; nessun test.

### Regola inviolabile in `CLAUDE.md` ridotta a riepilogo con rimando

**Perché:** la copia completa in `CLAUDE.md` duplicava il testo di `core.md`. Il riepilogo resta, con il rimando per i dettagli.
**Cosa / Dove:** `CLAUDE.md`, sezione «Regola inviolabile»; commento di intestazione aggiornato con i nuovi moduli.
**Verifica:** modifica di testo.
**Note:** nella premessa del problema 7 avevo scritto che la regola era copiata in backend, frontend e security: non era vero. Il contenuto duplicato era solo in `CLAUDE.md` e `core.md`.

### Elenco dei moduli in `copia-regole` e in `avvio-progetto`

**Perché:** le liste dei moduli non contenevano i nuovi file di sicurezza.
**Cosa / Dove:** `plugins/kit/skills/copia-regole/SKILL.md` passo 5; `_template/avvio-progetto.md`: righe di `security-backend.md` e `security-frontend.md` nella tabella dei moduli e nella modalità solo Git.
**Verifica:** modifica di testo; rilettura della tabella.

### Versione dei moduli cambiati

**Perché:** i moduli modificati dalle voci precedenti vanno versionati, perché `rules-watch` segnala le differenze di versione nei progetti.
**Cosa / Dove:** `core.md` 3.33, `frontend.md` 1.2, `backend.md` 1.1, `backend-app.md` 1.1, `docker.md` 1.1, `security.md` 2.0; i nuovi `security-backend.md` e `security-frontend.md` partono da 1.0. `backend-architecture.md` invariato (1.0).
**Verifica:** `grep` sulle intestazioni `> Versione` dei moduli.

### `consegna` mostra le voci «non pertinente» invece di ignorarle

**Perché:** il passo 3 diceva di ignorare le voci non applicabili, il passo 4 chiedeva un gruppo «non pertinente»: due istruzioni in contrasto.
**Cosa / Dove:** `plugins/kit/skills/consegna/SKILL.md` passo 3: le voci «non pertinente» non si commentano una per una, si elencano solo nel gruppo del passo 4.
**Verifica:** modifica di testo; rilettura del passo 3 e del passo 4.

### Priorità in `PIANO.md` con etichette `[P1]`, `[P2]`, `[P3]`

**Perché:** `buongiorno` ordina per priorità, ma il formato con cui indicarla non era definito, e `buonasera` non diceva come scriverla.
**Cosa / Dove:** `plugins/kit/skills/buongiorno/SKILL.md` passo 3 (ordine per etichetta, a parità l'ordine dei passi; un passo aperto senza etichetta viene segnalato); `plugins/kit/skills/buonasera/SKILL.md` passo 4 (etichetta all'inizio di ogni passo aperto, dopo la casella).
**Verifica:** modifica di testo; rilettura dei due passi.

### Skill `code-review` rinominata `review-regole`

**Perché:** il nome coincideva con la skill integrata di Claude Code. Il nome scelto usa «review», che ricorda la code review, e dice che il controllo è contro le regole del progetto.
**Cosa / Dove:** cartella `plugins/kit/skills/code-review/` rinominata in `plugins/kit/skills/review-regole/`; aggiornati `plugins/kit/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` e `README.md`. Il comando diventa `/kit:review-regole`.
**Verifica:** ricerca di riferimenti al vecchio nome (nessuno residuo, esclusa la storia di questo file); `node --test plugins/kit/tests/*.test.mjs`: 108 su 108.
**Note:** è un cambio di nome del comando, quindi chi usa `/kit:code-review` deve adeguarsi. La versione del plugin (1.10.0) non è cambiata: sale al rilascio.

### Minimo PBKDF2 non più riportato come cifra in `security.md`

**Perché:** il valore 220.000 attribuito a OWASP non era verificabile sulla fonte. Le ricerche danno 210.000 per PBKDF2-HMAC-SHA512, con fonti discordi sulla revisione. Una cifra scritta nelle regole invecchia.
**Cosa / Dove:** `.claude/rules/security.md`, voce sulle password: il minimo è quello della Password Storage Cheat Sheet OWASP al momento dell'uso, da leggere sulla fonte.
**Verifica:** modifica di testo; ricerca della vecchia cifra nel repository (nessuna occorrenza).

### Versione di ogni modulo di regole

**Perché:** `core.md` aveva la versione 3.32, `frontend.md` 1.1, gli altri moduli nessuna. `rules-watch` confronta le versioni e i moduli senza versione non le confrontano.
**Cosa / Dove:** riga «> Versione 1.0 — ultima revisione: 2026-11-09.» aggiunta in `security.md`, `git.md`, `docker.md`, `backend.md`, `backend-architecture.md`, `backend-app.md`. `core.md` (3.32) e `frontend.md` (1.1) invariati.
**Verifica:** `grep` sulle intestazioni `> Versione` di tutti i moduli di `.claude/rules/`; `git diff --check` pulito.
**Note:** nei progetti che hanno copie di questi moduli senza versione, `rules-watch` ora segnala l'aggiornamento da fare (un modulo senza versione conta come più vecchio).

### `rules-watch` confronta le versioni di tutti i moduli con versione

**Perché:** il confronto con il template leggeva solo la versione di `core.md`: un modulo più recente, come `frontend.md` 1.1, non faceva scattare l'avviso nei progetti. Il controllo non deve dipendere da quale file ha la versione.
**Cosa / Dove:** `plugins/kit/scripts/lib/template.mjs`: `coreVersion` sostituita da `ruleVersion(file)` e `ruleVersions(dir)`, che leggono l'intestazione «> Versione X.Y» di ogni `.claude/rules/*.md`. `templateSection` confronta solo i moduli che il progetto ha: un modulo assente (es. `frontend.md` in un progetto solo backend) non genera avvisi; un modulo del progetto senza versione conta come più vecchio. Il messaggio elenca i moduli più recenti con le loro versioni. `plugins/kit/tests/rules-watch.test.mjs`: quattro casi nuovi nel blocco «confronto con il template».
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 108 su 108 verdi. `rules-watch.test.mjs`: 20 su 20.
**Note:** la versione del plugin (1.10.0) non è cambiata: sale al rilascio. Le modifiche non sono committate.

### Cartella per elemento e versione di `frontend.md` (1.1)

**Perché:** i file di componenti e servizi finivano sciolti nelle cartelle di feature o di `core/`, insieme a quelli di altri elementi, e la regola sulle pagine era incompleta: non diceva cosa fare con una feature a pagina unica. `frontend.md` non aveva una versione, quindi `rules-watch` non poteva segnalare le modifiche ai progetti che la usano.
**Cosa / Dove:** `.claude/rules/frontend.md` §2: nuova voce «Cartella per elemento» (componenti, pagine incluse, servizi e altri file non di componente in una cartella con il nome dell'elemento, con tutti i suoi file; vale anche con una sola pagina nella feature) e sotto di essa il punto sui progetti esistenti (spostamento come refactoring nel `PIANO.md`, con conferma e commit `refactor`). Nella voce «Struttura cartelle» è rimasta la parte sui livelli e sui confini; la regola sulle pagine dentro una feature è stata assorbita dalla nuova voce. Intestazione: «Versione 1.1 — ultima revisione: 2026-11-09» (prima versione 1.0 nella stessa data).
**Verifica:** modifica di sola regola; nessun codice toccato. Testo riletto dopo la fusione delle due voci.
**Note:** la voce «Propagazione del `traceId`» in §2 è stata aggiunta nel file durante la sessione, fuori da questo intervento, e non è descritta qui. Il numero di versione si riferisce al file intero.

### Rilascio 1.10.0

**Modificato:** il plugin `kit` esegue i suoi controlli con quattro script, uno per evento (`guard-write`, `check-write`, `session-close`, `prompt-start`), invece di dodici script separati; gli avvisi di `check-write` e di `session-close` escono in un unico messaggio. Push e tag sono sempre consentiti; PR e rilasci con `gh` passano solo se il `CLAUDE.md` del progetto dichiara la GitHub CLI installata. Le regole (`git.md`, `core.md` 3.32, `frontend.md` 1.1) e la documentazione allineate a questa policy.

**Corretto:** `rules-watch` confronta la versione di ogni modulo di regole che la dichiara, non solo quella di `core.md`, e avvisa solo sui moduli che il progetto ha.

## 2026-11-08

### Unione degli hook del plugin kit (plugin 1.10.0)

**Perché:** dodici hook in dodici script, con quattro coppie che condividevano evento e matcher e avviavano due processi Node per ogni evento. Unirle riduce i processi e tiene insieme i controlli dello stesso gruppo, senza cambiare le regole.
**Cosa / Dove:** `plugins/kit/scripts/`: nuovi `guard-write.mjs` (`guard-secrets` + `guard-patterns`, PreToolUse su Write/Edit/MultiEdit), `check-write.mjs` (`check-plan` + `check-quality` + `check-practice`, PostToolUse), `session-close.mjs` (`plan-reminder` + `check-close`, Stop), `prompt-start.mjs` (`ask-one-question` + `rules-watch`, UserPromptSubmit). Rimossi i nove script sostituiti. `plugins/kit/hooks/hooks.json`: sette voci invece di dodici, stessi eventi e matcher. `plugins/kit/scripts/lib/`: solo commenti aggiornati. `plugin.json`: versione 1.10.0.
**Comportamento:** messaggi di blocco e avvisi invariati, con i nomi logici dei controlli (`guard-secrets`, `check-plan`…), così le deroghe `kit-allow` e le regole in `.claude/rules/` restano valide. Ogni controllo gira isolato: un errore in uno non disattiva gli altri del gruppo. Cambia solo la forma dell'output: gli avvisi di `check-write` e di `session-close` escono in un unico JSON, con i messaggi uniti; `check-plan` mantiene exit 2 con l'avviso su stderr.
**Verifica:** `node --test` su ogni file in `plugins/kit/tests/`: tutti verdi (github 15, guards 22, patterns 16, practice 9, quality 12, close 6, prompt-start 5, merged 3 nuovi, rules-watch 16). `hooks.json`: sette voci, tutte con script esistente.
**Note:** i test di `rules-watch` ora tolgono il promemoria della regola inviolabile dall'output, che esce sempre. Chi ha copiato a mano i vecchi script in `~/.claude/` (migrazione descritta nel wiki) deve rimuovere anche le loro voci in `settings.json`. Gli script unificati non isolano un crash del processo intero: solo gli errori dei singoli controlli.

### Pipeline avviabili da Claude solo con conferma esplicita per esecuzione

**Perché:** la regola «le pipeline restano all'utente» era troppo rigida. L'utente vuole che Claude possa avviarle, per esempio con `gh workflow run`, ma sempre dopo una domanda esplicita.
**Cosa / Dove:** `.claude/rules/git.md`, §Integrazione GitHub: nuovo punto sulle pipeline. Claude le avvia solo dopo una domanda di conferma per ogni esecuzione, che nomina pipeline, branch o ref e input; la conferma non vale per le esecuzioni successive. `.claude/rules/git.md`, §Rilascio, `.claude/rules/core.md` (intestazione §5 CI/CD, §5c, regola 11 del §6) e `CLAUDE.md` (riga «Push, PR, tag, release…»): la frase «l'esecuzione delle pipeline resta all'utente» è sostituita con la regola della conferma.
**Verifica:** modifica di sola regola; nessun codice toccato. Il hook `guard-commands` non blocca `gh workflow run`, come richiesto.
**Note:** la regola non è applicata da un controllo automatico: il rispetto della conferma dipende da Claude e dalla revisione.

### Tag e pubblicazione del rilascio senza approvazione per progetto

**Perché:** dopo la modifica precedente il tag e la pubblicazione del rilascio risultavano ancora legati a un'approvazione per progetto, in contrasto con la regola «consentiti sempre» per push, tag, PR e rilasci.
**Cosa / Dove:** `.claude/rules/git.md`, §Branch: il tag è tolto dalle chiusure di git flow a cura dell'utente e rimanda a «Integrazione GitHub». La pubblicazione del rilascio con `gh` resta soggetta solo alla riga «GitHub CLI (gh) installata», come le PR. La pipeline di release resta all'utente: scelta confermata dall'utente.
**Verifica:** modifica di sola regola; nessun codice toccato. Il hook già non blocca i tag e `gh release` usa la riga della GitHub CLI.
**Note:** Claude non avvia pipeline (`gh workflow run` o simili). Il hook non lo impedisce ancora: la regola c'è ma non è applicata da un controllo automatico.

### Push, tag, PR e rilasci consentiti sempre; GitHub CLI con una domanda per progetto

**Perché:** l'approvazione per progetto di push, tag, PR e rilasci era una domanda ripetuta in ogni progetto, anche quando l'operazione è normale. Le uniche condizioni reali sono due: `push` e `tag` usano git e non dipendono da altro; PR e rilasci dipendono dalla GitHub CLI installata sul PC.
**Cosa / Dove:** `.claude/rules/git.md`: sezione «Integrazione GitHub» riscritta. Push e tag sono consentiti sempre; Claude li esegue su richiesta o con conferma. PR e rilasci passano da `gh` solo con la riga `- **GitHub CLI (gh) installata:** sì/no (AAAA-MM-GG)` nel `CLAUDE.md` di progetto, scritta dopo una sola domanda per progetto. Aggiornati i riferimenti in §Commit, §PR e §Rilascio. `.claude/rules/core.md`: versione 3.32 (2026-11-08), §5c, regola 11 del §6 e riga 105 allineate. `plugins/kit/scripts/guard-commands.mjs`: il hook non cerca più la riga «Integrazione GitHub approvata»; push e tag passano sempre (bloccati solo i comandi distruttivi di sempre), `gh pr` e `gh release` passano solo con la riga «GitHub CLI (gh) installata: sì», letta dalla radice del repository, fail closed. Il messaggio di blocco chiede una sola domanda all'utente. `plugins/kit/tests/github.test.mjs`: riscritto sul nuovo comportamento (15 test). `CLAUDE.md` di claude-config: riga di approvazione sostituita con `GitHub CLI (gh) installata: sì (2026-11-08)`.
**Verifica:** `node --test plugins/kit/tests/github.test.mjs`: 15 su 15 passati. Gli altri file di test del plugin: close 6, guards 22, patterns 16, practice 9, prompt-start 5, quality 12 su 12, tutti passati; `rules-watch` completato con esito 0.
**Note:** `merge` di PR e chiusure di git flow restano a cura dell'utente, come prima. Il numero di versione del plugin `kit` (1.9.0) non è cambiato: la descrizione in `plugin.json` è allineata, e il bump si fa con il rilascio. I progetti che hanno la vecchia riga «Integrazione GitHub approvata» nel `CLAUDE.md` devono sostituirla con la riga della GitHub CLI.

## 2026-11-07

### Link alla documentazione spostati su wiki.aepserver.it

**Perché:** la documentazione è stata unificata nel sito Docusaurus del repository `wiki` (`docs/claude-config/`), pubblicato su `http://wiki.aepserver.it`. Il vecchio indirizzo `docs-claude-config.aepserver.it` e il repository `claude-config-docs` non sono più la fonte.
**Cosa / Dove:** `README.md`: i link della sezione «Documentazione», della tabella, della sezione «Come si usa» e della sezione «Comandi del plugin» puntano a `http://wiki.aepserver.it/claude-config/...` (per esempio `/claude-config/uso`); la frase introduttiva, anche nel commento HTML, cita il repository `wiki` e la cartella `docs/claude-config`. Il link generale va a `/claude-config/intro`, perché la radice `/` del sito non ha ancora una pagina di ingresso.
**Verifica:** ricerca nel repository: nessun riferimento residuo a `docs-claude-config`. Nessuna build: il file è Markdown, il sito non è in questo repository.
**Note:** il sito è servito in HTTP, come dichiarato. Le voci storiche di questo changelog, che citano `claude-config-docs`, restano come sono. Il `url` di `docusaurus.config.ts` nel repository `wiki` è ancora un segnaposto (`https://docs.example.com`): va deciso lì.

## 2026-11-06

### Revisione di core.md 3.31

**Perché:** il commit `bc5d96e` ha modificato `core.md` e sette altri moduli di regole (xUnit v3, Docker, sicurezza, backend) senza aggiornare versione e data. `rules-watch` confronta la versione: con la stessa versione i progetti non ricevono l'avviso di aggiornamento.
**Cosa / Dove:** `.claude/rules/core.md`, intestazione: versione 3.31, ultima revisione 2026-11-06. `README.md`: la frase sulla versione 1.9.0 del plugin è diventata «Sono disponibili nel plugin».
**Verifica:** `node --test` sui file del plugin: 102 su 102 passati; `rules-watch` legge la versione 3.31 dall'intestazione.
**Note:** le modifiche del 2026-11-05 e di `bc5d96e` sono incluse in questa revisione. Chi ha copie di regole più vecchie riceve l'avviso di `rules-watch` alla prossima sessione.

### Modalità solo Git in `/kit:copia-regole`

**Perché:** per i progetti senza backend, frontend, Docker o sicurezza il comando chiedeva sette-otto risposte di «no»; la modalità solo Git dell'avvio (`avvio-progetto.md` §2) esisteva solo come frase a Claude, non come comando.
**Cosa / Dove:** `plugins/kit/skills/copia-regole/SKILL.md`: domanda «solo regole Git?» dopo il controllo del percorso. Se sì, copia solo `core.md` e `git.md`; chiede solo `CLAUDE.md`, `.gitignore` e `.gitattributes`, e non chiede `NuGet.config` né `.editorconfig`. Descrizione del comando aggiornata.
**Verifica:** `node --test` sui file del plugin: 102 su 102 passati.
**Note:** `/kit:aggiorna-regole` non cambia. Scelta dell'utente: nessun comando nuovo, la modalità sta dentro `/kit:copia-regole`.

### Rimosso `copia-regole.bat`

**Perché:** le voci 1 e 2 dello script (copia e aggiornamento delle regole) sono coperte dalle skill `/kit:copia-regole` e `/kit:aggiorna-regole`, che fanno le stesse domande e lasciano il `.bak` allo stesso modo.
**Cosa / Dove:** cancellato `copia-regole.bat` dalla root. Riferimenti aggiornati: `_template/avvio-progetto.md` (struttura del template, progetto nuovo, copia delle regole; il file non compare più tra il materiale da eliminare), `README.md` (rimando alla documentazione), `plugins/kit/skills/copia-regole/SKILL.md` e `aggiorna-regole/SKILL.md` (via la frase «Equivale alla voce N di copia-regole.bat»), `.gitignore` (commento sui `*.bak`, la regola resta).
**Verifica:** ricerca dei riferimenti nel repository: restano solo le voci storiche di questo changelog. Test del plugin in `plugins/kit/tests`: 102 su 102 passati (`node --test` sui file `*.test.mjs`).
**Note:** le skill dipendono dal plugin `kit` installato e dalla variabile `KIT_CONFIG_TEMPLATE_DIR`; lo script non le richiedeva. Il sito di documentazione (repository `claude-config-docs`, fuori da questo repository) cita ancora il `.bat` nella pagina «Come si usa»: da aggiornare lì.

### Rilascio 1.9.0

**Aggiunto:** sedici comandi del plugin `kit`, lanciati solo su richiesta come `/kit:...`: `buongiorno`, `buonasera`, `avvia-progetto`, `copia-regole`, `aggiorna-regole`, `consegna`, `code-review`, `aggiorna-docs`, `verifica`, `qualita-test`, `dati-efcore`, `accessi-api`, `gdpr-dati`, `accessibilita-ui`, `colori-tema`, `localizzazione`. Il guard `guard-patterns` blocca anche attese nei test, `NoWarn` nei progetti e `catch` vuoti in C#.

**Modificato:** regole su value object ed EF mock opzionali, `async void`, tipografia del frontend, xUnit v3, fusi orari IANA, segreti solo da variabili d'ambiente valorizzate da `.env`, immagini Docker fissate. La guida del template rimanda ai comandi `/kit:...`.

## 2026-11-05

### Versione di xUnit fissata per i progetti nuovi

**Perché:** le regole nominavano solo «xUnit», senza indicare la versione. L'analisi della skill `migrate-xunit-to-xunit-v3` ha messo in luce la lacuna.
**Cosa / Dove:** `core.md` §4, riga dei test backend: xUnit v3 per i progetti nuovi. I progetti esistenti su xUnit v2 restano su v2 finché non si decide la migrazione per progetto.
**Verifica:** rilettura della riga. Nessun test eseguito: modifica solo di regole Markdown.
**Note:** la migrazione di un progetto esistente richiede una decisione esplicita, non è automatica.

### Regole di tipografia nel frontend

**Perché:** l'analisi della skill `better-typography` ha mostrato che `frontend.md` copre la tipografia solo come token e gerarchia visiva. Mancavano le scelte su scala, altezza di riga e misura del testo.
**Cosa / Dove:** `frontend.md` §3, dopo il punto «Gerarchia visiva»: tre regole su scala con nomi semantici, altezza di riga per ruolo e misura massima del testo, tutte come token.
**Verifica:** rilettura dei punti. Nessun test eseguito: modifica solo di regole Markdown.
**Note:** modifica piccola, senza piano separato.

### Regola sui fusi orari nel backend

**Perché:** l'analisi della skill `dotnet-timezone` ha mostrato che le regole coprono lo storage in UTC, ma non il nome IANA del fuso e le pianificazioni ricorrenti in ora locale, che cambiano istante con l'ora legale.
**Cosa / Dove:** `backend.md` §9, punto «Date»: fusi identificati con il nome IANA, mai con l'offset fisso; pianificazioni ricorrenti con orario locale e fuso IANA, con l'istante successivo calcolato ogni volta con `TimeZoneInfo`. Il runtime deve includere `tzdata` (vedi `docker.md`).
**Verifica:** rilettura della regola e coerenza con la voce UTC di `core.md` §1 (conversione solo in visualizzazione). Nessun test eseguito: modifica solo di regole Markdown.
**Note:** la regola presuppone il runtime `10.0-noble-chiseled-extra`; con la variante senza `-extra` i fusi IANA non si risolvono nel container.

### Runtime Docker con dati di fuso (`-extra`)

**Perché:** la variante `10.0-noble-chiseled` fissata in `docker.md` non include `tzdata` né ICU. Senza, il backend non risolve i fusi IANA (per esempio `Europe/Rome`), e la regola sui fusi orari che stiamo introducendo non funzionerebbe nel container.
**Cosa / Dove:** `docker.md`, voce «Tag espliciti e fissi» e voce «Multi-stage»: runtime del backend `mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra`, che include `tzdata` e ICU. Restano valide le regole su shell, `HEALTHCHECK` e pacchetti.
**Verifica:** la documentazione Microsoft conferma che le varianti chiseled senza `-extra` non includono `tzdata` né ICU, e che la variante `-extra` li include. Il tag esiste: la cartella `src/aspnet/10.0/noble-chiseled-extra` è nel repository ufficiale `dotnet/dotnet-docker`. Il suo `Dockerfile` non installa né copia `tzdata` né ICU: li eredita dall'immagine base, `runtime` della stessa variante. La presenza effettiva dei dati di fuso dipende quindi dall'immagine `runtime-deps` a monte: la verifica si ferma alla documentazione Microsoft, che indica `tzdata` e ICU per la variante `-extra`, e non è stata letta fino in fondo la catena delle immagini di base.
**Note:** la voce precedente sul runtime (`10.0-noble-chiseled`) resta nel `CHANGELOG` come storico. Il tag corretto è questo.

### Prima ondata di skill nel plugin `kit`: qualità dei test, EF Core, accessi, GDPR, accessibilità

**Perché:** la prima ondata del piano di riscrittura prevedeva cinque procedure che le regole sviluppano solo per vincoli: revisione dei test, lavoro con EF Core, configurazione di autenticazione e autorizzazione, revisione GDPR e accessibilità dell'interfaccia.
**Cosa / Dove:** `plugins/kit/skills/qualita-test/` (`/kit:qualita-test`): falsa sicurezza, fragilità, duplicati con `Theory`, nomi e asserzioni. `plugins/kit/skills/dati-efcore/` (`/kit:dati-efcore`): tracking, migrazioni, ciclo di vita del `DbContext`, ottimizzazione delle query. `plugins/kit/skills/accessi-api/` (`/kit:accessi-api`): schema, ordine della pipeline, policy, handler, scope, mappatura dei claim. `plugins/kit/skills/gdpr-dati/` (`/kit:gdpr-dati`): minimizzazione, conservazione, log, errori, diritti degli interessati; non è consulenza legale. `plugins/kit/skills/accessibilita-ui/` (`/kit:accessibilita-ui`): tastiera, focus, nomi, form, annunci, contrasto, movimento, zoom. Tutte sono revisioni che non modificano file.
**Verifica:** controllo di non derivazione con confronto su sequenze di 8 parole: zero sequenze in comune con gli originali di dotcraft per ciascuna skill. Test del plugin: 102/102 verdi.
**Note:** la versione del plugin resta 1.8.0 fino al rilascio. Prova dal vivo dei comandi in una sessione nuova su un progetto di prova. Il controllo `verifica` è registrato a parte.

### Controllo delle scorciatoie nel guard del plugin `kit`

**Perché:** l'analisi di `dotnet-slopwatch` ha mostrato che gran parte delle scorciatoie è già bloccata, ma restavano senza controllo automatico le attese arbitrarie nei test, i `NoWarn` di progetto e i `catch` vuoti. La regola in `core.md` §4 le vieta già.
**Cosa / Dove:** `plugins/kit/scripts/guard-patterns.mjs`: tre regole nuove, con blocco e deroga `kit-allow`: `attesa-test` (`Task.Delay` e `Thread.Sleep` nei file di test), `nowarn` (`NoWarn` in `.csproj` e `.props`), `catch-vuoto` (`catch` con blocco vuoto in `.cs`). `core.md` §4: riga con l'elenco delle scorciatoie vietate e il rimando alla deroga.
**Verifica:** test del plugin: 102/102 verdi, con 4 test nuovi in `plugins/kit/tests/patterns.test.mjs` (attesa, deroga, `NoWarn`, `catch`).
**Note:** i pattern lavorano riga per riga, come gli altri del guard: un `NoWarn` o un `catch` vuoto scritti su più righe non vengono rilevati. La revisione del codice resta necessaria. La versione del plugin resta 1.8.0 fino al rilascio.

### Nuove skill `colori-tema` e `localizzazione` nel plugin `kit`

**Perché:** la seconda ondata del piano di riscrittura prevedeva due procedure che le regole di frontend non sviluppano: costruire e verificare la palette dei temi con il contrasto misurato sui valori resi, e verificare il layout con testi tradotti più lunghi, RTL, ordine di lettura e zoom. I vincoli restano in `frontend.md`.
**Cosa / Dove:** `plugins/kit/skills/colori-tema/SKILL.md` (`/kit:colori-tema`): token per ruolo, scala per tinta, soglie di contrasto WCAG 2.2 (1.4.3, 1.4.11), colore mai come unico segnale, gradienti, tabella finale delle coppie. `plugins/kit/skills/localizzazione/SKILL.md` (`/kit:localizzazione`; la skill tratta il layout con testi tradotti, RTL, ordine di lettura e zoom, mentre le traduzioni restano in `frontend.md` §4.2): spazio prima delle linee, proprietà logiche per RTL, ordine di lettura (1.3.2), testi che si espandono, reflow a 320 px e zoom (1.4.10, 1.4.4), contenuto nascosto (4.1.2). Entrambe non modificano file.
**Verifica:** test del plugin `plugins/kit/tests`: 98/98 verdi. Verifica di non derivazione dagli originali di dotcraft con confronto su sequenze di 8 parole: 0 sequenze in comune per entrambe; il metodo è stato controllato su un originale contro se stesso.
**Note:** la versione del plugin resta 1.8.0 fino al rilascio. Prova dal vivo dei comandi da fare in una sessione nuova su un progetto di prova.

### Fusioni di `create-readme` e `release-changelog` in `aggiorna-docs`

**Perché:** le due skill di dotcraft (`create-readme` e `release-changelog`) coprivano lavori già previsti dal plugin `kit`. Le due decisioni prese: il README si crea solo se manca, senza riscriverne uno esistente; la voce di rilascio si scrive solo su richiesta esplicita, senza calcolare la versione.
**Cosa / Dove:** `plugins/kit/skills/aggiorna-docs/SKILL.md`: descrizione aggiornata; passo 3, voce `### Rilascio X.Y.Z` su richiesta, con le categorie di `git.md` e senza bump né commit; passo 4, struttura di riferimento per un README mancante (titolo e scopo, requisiti, avvio, configurazione, comandi, struttura, licenza).
**Verifica:** test del plugin `plugins/kit/tests`: 98/98 verdi. Prova dal vivo del comando: da fare in una sessione nuova su un progetto di prova.
**Note:** la versione del plugin resta 1.8.0 fino al rilascio. Le skill sono riscritte in forma propria: nessun testo da dotcraft.

### Segreti solo da variabili d'ambiente di `.env` nelle regole Docker

**Perché:** le regole ammettevano sia i `secrets` di Compose sia le variabili d'ambiente, con due percorsi da mantenere e una scelta per progetto. Il file `secrets` richiedeva un provider aggiuntivo perché ASP.NET Core non legge `/run/secrets/` da solo.
**Cosa / Dove:** `docker.md`: i segreti passano solo da variabili d'ambiente valorizzate da `.env`, fuori dal repository. Il compose usa segnaposto `${VAR}`. Riviste le righe su Redis, configurazione e segreti, primo amministratore, migrazioni, backup e Dockerfile. Nel Dockerfile nessun segreto né come `ENV` né come `ARG`. Variante base del runtime: `10.0-noble-chiseled`, da fissare al passo 9 del piano.
**Verifica:** ricerca dei residui di `secret` in `docker.md` e rilettura delle righe modificate. Nessun test eseguito: modifica solo di regole Markdown.
**Note:** la modifica è completa anche fuori da `docker.md`: le regole e il `CLAUDE.md` che citavano ancora i `secrets` sono allineati a `.env` in `backend.md`, `backend-app.md`, `backend-email.md` (modulo opzionale), `core.md`, `security.md` e `CLAUDE.md`. Il certificato di Data Protection è un file fuori dal repository, con il percorso in una variabile d'ambiente da `.env`. Immagine runtime `10.0-noble-chiseled` e SDK di build `10.0-noble` sono fissate in `docker.md`.

### Divieti sull'asincronismo nelle regole backend

**Perché:** l'analisi della skill `csharp-async` ha confermato che le regole coprono `async/await` e `CancellationToken`, ma non vietano gli errori tipici: `async void` e il blocco su codice asincrono con `.Result` o `.Wait()`.
**Cosa / Dove:** `backend.md`, punto «Asincronismo»: vietati `async void` (salvo gli handler di eventi) e `.Result` o `.Wait()` su codice asincrono.
**Verifica:** rilettura della riga. Nessun test eseguito: modifica solo di regole Markdown.
**Note:** modifica piccola, senza piano separato.

### Value object e mock EF opzionale nelle regole backend

**Perché:** l'analisi delle skill EF Core ha messo in luce due lacune. Non era chiaro quale mappatura EF Core usare per i value object (`ComplexProperty` o `OwnsOne`), e le regole vietavano ogni mock di `DbContext` e `DbSet`, senza distinguere la logica pura dall'accesso ai dati.
**Cosa / Dove:** `backend-architecture.md` §2b (riga sui value object): `ComplexProperty` come default, `OwnsOne` solo con relazioni proprie o tabella dedicata. `backend-app.md` §4.5: mock di `DbContext` e `DbSet` opzionale, solo per la logica che non tocca il `DbContext`, con la voce `CLAUDE.md` attiva. `core.md` §4 (riga dei test backend): rimando all'eccezione. `CLAUDE.md`: nuova voce «Mock EF nei test unitari» (default: no), subito dopo «Database nei test». `InMemory` resta vietato. Un servizio che legge dal `DbContext` si prova sempre sul database reale.
**Verifica:** rilettura delle righe modificate e ricerca dei riferimenti a `InMemory`, `DbSet` e mock su regole e `CLAUDE.md`, con correzione di tre righe contraddittorie. Nessun test eseguito: sono modifiche solo di regole Markdown. Il guard del plugin su `InMemory` non cambia.
**Note:** la versione del plugin resta invariata. Il default del progetto resta il database reale; il mock si dichiara per progetto.

### Documentazione dei comandi allineata nel template

**Perché:** il README e la procedura di avvio parlavano del plugin solo come hook e del `copia-regole.bat`; i comandi `/kit:...` non comparivano nei testi che Claude e l'utente leggono.
**Cosa / Dove:** `README.md` (nota «dalla versione 1.9.0» nella sezione dei comandi, riga del plugin nella tabella); `_template/avvio-progetto.md` (rimando a `/kit:avvia-progetto`, `/kit:copia-regole` e `/kit:aggiorna-regole` nella struttura del template). `CLAUDE.md` e `.claude/rules/` non cambiano: non descrivono il plugin.
**Verifica:** `claude plugin validate .` su `plugins/kit`: passa. Suite del plugin: 98/98 verdi.
**Note:** la nota «dalla versione 1.9.0» si toglie al rilascio. Il sito di documentazione (`claude-config-docs`) ha una voce corrispondente, con commit da fare insieme a questa.

### Comandi personalizzati del plugin `kit` (`/kit:...`)

**Perché:** le operazioni ripetute (riprendere il lavoro, salvare lo stato, avviare o aggiornare un progetto, controllare la consegna, revisionare il codice, aggiornare la documentazione) si facevano a mano, con il `copia-regole.bat` per le regole.
**Cosa / Dove:** `plugins/kit/skills/` con otto skill: `buongiorno`, `buonasera`, `avvia-progetto`, `copia-regole`, `aggiorna-regole`, `consegna`, `code-review`, `aggiorna-docs`. Ogni skill ha `disable-model-invocation: true`: parte solo se la lancia l'utente. `README.md`: nuova sezione «Comandi del plugin» e riga del plugin nella tabella della documentazione con i comandi. `.claude-plugin/marketplace.json` e `plugins/kit/.claude-plugin/plugin.json`: descrizione con i comandi, perché è quella che si vede in installazione. Il `copia-regole.bat` resta finché i comandi non sono provati dal vivo.
**Verifica:** `claude plugin validate .` su `plugins/kit`: passa (avvisi solo sulla pubblicazione nel catalogo). `claude plugin details kit@claude-config`: otto skill elencate. Test del plugin: 98/98 verdi. Prova dal vivo: da fare in una sessione nuova.
**Note:** la versione del plugin resta 1.8.0 fino al rilascio. Le risposte per progetto (sito, priorità) vanno in `~/.claude/kit-progetti.json`, fuori dai repository.

### Rinomina del plugin da `kit-config` a `kit`

**Perché:** i comandi personalizzati devono uscire come `/kit:...`, senza il suffisso `-config`. Il nome del plugin è anche la chiave in `enabledPlugins`, quindi chi lo ha installato deve reinstallarlo.
**Cosa / Dove:** cartella `plugins/kit-config/` copiata in `plugins/kit/` (la vecchia rimossa nel commit); `plugin.json` con `name: kit` (versione invariata, 1.8.0); `.claude-plugin/marketplace.json` con la voce `kit`; riferimenti in `core.md`, `git.md`, `security.md`, `_template/avvio-progetto.md`, `README.md`, test e commenti degli script. Installazione: `claude plugin install kit@claude-config`.
**Verifica:** `node --test tests/*.test.mjs` in `plugins/kit`: 98/98 verdi.
**Note:** la versione resta 1.8.0 (si alza al rilascio). Il rilascio sarà `2.0.0` o `1.9.0` a seconda che la rinomina sia considerata incompatibile: decisione rinviata al rilascio. Su ogni macchina serve la reinstallazione e l'aggiornamento della voce in `~/.claude/settings.json`. Le voci storiche del CHANGELOG restano con il vecchio nome.

## 2026-11-04

### Riepilogo di rilascio per categorie (core.md v3.30)

**Perché:** il riepilogo di rilascio era un elenco libero. Le categorie prese dal changelog di Brainy (Aggiunto, Modificato, Corretto, Sicurezza) rendono più leggibile cosa cambia in ogni versione. La struttura per giorno degli interventi non cambia.
**Cosa / Dove:** `.claude/rules/core.md` §5b: il riepilogo `### Rilascio X.Y.Z` raggruppa i punti salienti con etichette in grassetto **Aggiunto:**, **Modificato:**, **Corretto:**, **Sicurezza:**, in quest'ordine e solo quelle che servono. Versione 3.29 → 3.30. `.claude/rules/git.md`, sezione «Rilascio»: stessa regola, con la motivazione delle etichette in grassetto invece dei titoli `###`.
**Verifica:** solo testo delle regole; nessuna build né test (documentazione).
**Note:** il sito di documentazione non descrive il formato interno del riepilogo, quindi non va riallineato su questo punto.

### Test di rules-watch indipendenti dai commit

**Perché:** sei test (cinque di diff con git e uno di session-plan) clonavano il repository da `HEAD`, e fallivano finché `.claude/` non era committato.
**Cosa / Dove:** `plugins/kit-config/tests/rules-watch.test.mjs`: helper `cloneWithRules()`. Se le regole non sono nel clone, le copia dalla cartella di lavoro e le committa nel clone di prova; i due casi che clonavano usano l'helper.
**Verifica:** `node --test tests/*.test.mjs` in `plugins/kit-config`: 98/98 verdi.

### Hook guard-commands: approvazione GitHub letta dalla radice del repository

**Perché:** il permesso veniva cercato nel `CLAUDE.md` della cartella da cui partiva il comando. Dopo un `cd` in una sottocartella la riga non si trovava e il comando risultava bloccato anche per un progetto approvato.
**Cosa / Dove:** `plugins/kit-config/scripts/guard-commands.mjs`: nuova funzione `repoRoot()` (via `git rev-parse --show-toplevel`); `approvals()` legge il `CLAUDE.md` della radice. Fuori da un repository resta la cartella del comando, come prima. `tests/github.test.mjs`: due test nuovi (approvazione nella radice vale da una sottocartella; fuori da un repository vale la cartella del comando).
**Verifica:** `tests/github.test.mjs` e `tests/guards.test.mjs`: 38/38 verdi.
**Note:** la versione del plugin in `plugin.json` non è stata alzata; da decidere con la prossima release.

### Limite noto dei controlli C# documentato in README

**Perché:** `check-practice` e `guard-patterns` lavorano riga per riga e possono non vedere membri su più righe o attributi complessi. Il limite va dichiarato, non nascosto.
**Cosa / Dove:** `README.md`: nuova sezione «Limiti noti» prima della licenza. Nessuna modifica al codice.
**Verifica:** solo testo; nessuna build né test (documentazione).
**Note:** scelta di accettare il limite, decisa con l'utente; un miglioramento del controllo resta un'opzione futura.

### Hook guard-commands: push, tag, PR e rilasci salvo approvazione per progetto (kit-config 1.8.0)

**Perché:** il hook bloccava push, tag, PR e rilasci in ogni progetto, anche quando l'utente li ha autorizzati. Le regole (`git.md`) ora prevedono l'approvazione per progetto, e il hook deve applicarla.
**Cosa / Dove:** `plugins/kit-config/scripts/guard-commands.mjs`: la riga «Integrazione GitHub approvata» nel `CLAUDE.md` della cartella sblocca separatamente `git push`, `git tag` (creazione), `gh pr create/merge` e `gh release`. Sempre bloccati anche con approvazione: `git push --force` e varianti (`-f`, `--force-with-lease`, `+ref`), cancellazione di branch remoti (`--delete`, `:ref`), `reset --hard`, `clean -f`, `--no-verify`, `git init`. File assente, riga assente o riga con formato diverso: nessuna approvazione (fail closed). Nuovo `tests/github.test.mjs` (14 test). `plugin.json` da 1.7.0 a 1.8.0. `CLAUDE.md` del template: riga «Integrazione GitHub approvata» in formato fisso.
**Verifica:** `tests/github.test.mjs` e `tests/guards.test.mjs`: 36/36 verdi. Suite completa del plugin: 97 test, 92 verdi; i 5 che falliscono sono nel gruppo di `rules-watch` che clona il repository da `HEAD` (`.claude/` non committato), come già noto. Controllo a mano sul `CLAUDE.md` del template: `git push` bloccato.
**Note:** il permesso è letto dal `CLAUDE.md` nella cartella da cui parte il comando (non dalla radice del repository). Il hook non verifica che `gh` sia installata: lo fa la regola al primo commit del lavoro. Il hook non è ancora stato provato in una sessione reale di Claude Code.

### Integrazione GitHub: verifica di `gh` e approvazione per progetto (core.md v3.29)

**Perché:** le regole vietavano a Claude push, PR, tag e rilasci in ogni caso, anche quando la GitHub CLI è installata e il progetto li autorizza. Ora la verifica e l'approvazione sono regolate.
**Cosa / Dove:** `.claude/rules/git.md`: nuova sezione «Integrazione GitHub: verifica e approvazione per progetto» (verifica di `gh` alla prima richiesta di commit, domande una alla volta per PR, push, tag e rilasci, riga di approvazione nel `CLAUDE.md`, comandi sempre bloccati); «Ambito», «Sicurezza della cronologia», «Pull Request» e «Rilascio» allineati. `.claude/rules/core.md` §5, §5c e §6 punto 11; versione 3.28 → 3.29. `CLAUDE.md` del template: riga «Integrazione GitHub approvata» nelle Eccezioni (default: tutto `no`).
**Verifica:** solo regole e testo; rilettura dei rimandi incrociati con ricerca. Il hook `guard-commands` non è ancora allineato: lo fa il passo 2 di `PIANO.md`.
**Note:** senza la riga, o con riga non valida, nessuna operazione di integrazione.

### Registro raggruppato per data (core.md v3.28)

**Perché:** lo stesso giorno aveva più blocchi con la stessa data, difficili da scorrere.
**Cosa / Dove:** `CHANGELOG.md`: un titolo per giorno e una sottosezione `###` per ogni intervento, anche per le voci precedenti. `.claude/rules/core.md` §5b e versione 3.27 → 3.28. Stessa regola nel sito `claude-config-docs`.
**Verifica:** solo testo; nessuna build (regole).
**Note:** l'orario non si aggiunge: l'ordine dentro il giorno è dato dalla posizione (più recente in alto) e l'ora esatta sta nel commit.

### Controllo CI delle deroghe kit-allow (core.md v3.27)

**Perché:** una deroga `kit-allow` poteva essere aggiunta da Claude senza che nessuno la vedesse in review: la regola chiedeva l'approvazione, ma nulla la rendeva visibile.
**Cosa / Dove:** nuova cartella `_template/ci/`: `kit-allow-report.mjs` (legge il diff tra `BASE_REF` e `HEAD`, elenca le righe aggiunte con `kit-allow:` con file e riga, segnala il formato non valido, scrive nel riepilogo del job e in annotazioni; non blocca); `kit-allow.yml` (workflow `pull_request` d'esempio, da copiare in `.github/workflows/` del progetto; `actions/checkout` fissato al commit `3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), verificato sull'API ufficiale di GitHub); `kit-allow-report.test.mjs` (4 test su repository temporanei). `.claude/rules/core.md` §6 punto 23: la deroga è elencata dal controllo CI e va approvata in review; versione 3.26 → 3.27. `CHECKLIST.md`: punto sulle deroghe chiuso.
**Verifica:** `kit-allow-report.test.mjs`: 4/4 verdi. Il workflow non è stato eseguito su GitHub: va attivato in un progetto e osservato in una pull request.
**Note:** scelta fatta: il controllo elenca e non blocca (opzione A). Per renderlo bloccante servirebbe un passo in più, da decidere. Il controllo resta nel template: nei progetti va copiato insieme al workflow.

### Revisione del plugin: percorsi, falsi positivi, test e documentazione allineata (kit-config 1.7.0)

**Perché:** la revisione dei hook ha trovato un percorso personale nel codice del template (vietato da `CLAUDE.md`), duplicazioni, falsi positivi sui segnaposto e sui colori, esportazioni inutili negli script e test mancanti.
**Cosa / Dove:**
- `scripts/lib/template.mjs` e `rules-watch.mjs`: nessun percorso di default. Senza `KIT_CONFIG_TEMPLATE_DIR` il confronto con il template non parte e Claude riceve un avviso che chiede il percorso. Prima della prossima sessione va impostata la variabile sulla macchina (fuori dal template).
- `scripts/lib/text.mjs` unico per `writtenText`: lo usano `guard-secrets.mjs` e `check-quality.mjs`, che avevano copie locali.
- `guard-secrets.mjs`: un segnaposto vale solo se il valore intero ha una forma nota (`CHANGE-ME…`, `placeholder…`, `${VAR}`, `example` da solo…); il token JWT non si controlla nei `.md`.
- `check-quality.mjs`: i range `^` e `~` si riassumono in una riga per scrittura; l'esadecimale si segnala nei `.ts` solo tra virgolette, nei `.html` solo dentro `style`.
- Gli script dei hook non esportano più funzioni (restano esportati solo i moduli di `lib/`).
- Test: `tests/prompt-start.test.mjs` (nuovo: `ask-one-question`, `limit-one-question`, `session-plan`); casi nuovi in `guards`, `quality` e `rules-watch`.
- `CHECKLIST.md` (nuovo): problemi aperti non risolti in questo passo (deroghe da approvare, hook da provare dal vivo, `systemMessage` su `Stop` non verificato, ambito dei controlli globali).
- `plugin.json` da 1.6.0 a 1.7.0.
**Verifica:** `node --check` su tutti gli script; suite del plugin: 83 test, 78 verdi. I 5 che falliscono sono tutti nel gruppo di `rules-watch` che clona il repository da `HEAD`: il template non è ancora committato, quindi il clone non contiene `.claude/`. Non eseguita una prova dal vivo in una sessione di Claude Code.
**Note:** la pagina del plugin nel sito è allineata nel progetto `claude-config-docs` (voce nel suo changelog). Nessun commit fatto: i commit sono rimandati a domani, come richiesto.

### Batch B e C: avvisi di pratica e promemoria a fine sessione (kit-config 1.6.0, core.md v3.26)

**Perché:** alcune pratiche richiedono giudizio e non si possono bloccare (scritture in blocco, soppressioni, endpoint anonimi, Regex, log, documentazione, test); altre si verificano a fine sessione (CHANGELOG, migrazione EF, chiavi IT/EN). Gli avvisi non fermano il lavoro; i promemoria non bloccano la chiusura.
**Cosa / Dove:** nuovo `scripts/check-practice.mjs` (PostToolUse su Write/Edit/MultiEdit): avvisi su `ExecuteUpdate`/`ExecuteDelete`, soppressioni, `AllowAnonymous`, `new Regex` senza `matchTimeout`, `console.log` e `Console.Write` fuori dai test, membri pubblici C# senza `///`, file nuovo `*Service`/`*Handler`/`*Validator` o `.service`/`.component`/`.pipe.ts` senza test. Nuovo `scripts/check-close.mjs` (Stop): promemoria su codice modificato senza `CHANGELOG.md`, modello EF senza migrazione, chiavi `it.json`/`en.json` diverse, letti da `git status`. Le deroghe usano gli stessi id del batch A. `hooks/hooks.json` registra i due hook. `.claude/rules/core.md` v3.26 (punto 23 esteso). `plugin.json` da 1.5.0 a 1.6.0.
**Verifica:** `tests/practice.test.mjs` (9 test) e `tests/close.test.mjs` (6 test, su repository git temporanei): 58/58 verdi con gli altri test del plugin. `node --check` e `hooks.json` validi. Il test `rules-watch` resta com'era (causa ENOENT già nota).
**Note:** i controlli sul C# sono regex, non parser: i membri su più righe o gli attributi complessi possono sfuggire o dare falsi positivi. Il controllo dei test mancanti guarda solo le scritture con il tool Write, non le modifiche. La ricerca dei test scorre al massimo 5000 voci e salta `node_modules`, `bin`, `obj`. Il promemoria di chiusura vede solo le modifiche non committate.

### Batch A: blocchi sui pattern vietati con deroga a commento (kit-config 1.5.0, core.md v3.25)

**Perché:** alcune regole sono divieti senza eccezioni (test saltati, librerie vietate, API insicure, SQL interpolato, TLS disattivato): un hook le può bloccare. Le eccezioni legittime devono restare dichiarate nel codice, non in una configurazione nascosta.
**Cosa / Dove:** nuovo `plugins/kit-config/scripts/guard-patterns.mjs` (PreToolUse su Write/Edit/MultiEdit) con otto regole: `skip`, `angular-legacy`, `libreria-vietata`, `inmemory`, `api-vietata`, `sql-interpolato`, `npm-install`, `tls-disattivato`. Deroga: `kit-allow: <id> — <motivo>` sulla stessa riga o su quella sopra; il motivo deve avere almeno 8 caratteri. Nuovo `scripts/lib/text.mjs` (lettura del testo scritto, deroga, attivazione). Il hook agisce solo nei progetti con `.claude/rules/core.md`. `hooks/hooks.json` registra il hook. `.claude/rules/core.md` v3.25: punto 23 sulla convenzione della deroga. `plugin.json` da 1.4.0 a 1.5.0.
**Verifica:** `tests/patterns.test.mjs` (12 test), più i test precedenti: 43/43 verdi. `node --check` e `hooks.json` validi. Il test `rules-watch` resta com'era (causa ENOENT già nota).
**Note:** il hook non vede le scritture fatte da Bash (sed, redirezioni). Con `Edit` vede solo il testo nuovo: la deroga va inclusa nella modifica. I controlli degli altri hook restano globali, come prima. La scelta di attivare il batch solo con `.claude/rules/core.md` è un'assunzione: va verificata su un progetto reale.

### Deduplicazione dei file di regole dopo i hook (core.md v3.24)

**Perché:** i hook del plugin `kit-config` applicano già parte delle regole; il testo nei `.md` andava allineato senza perdere criteri per Claude.
**Cosa / Dove:** `.claude/rules/core.md` v3.24: legenda ▲ in §0b (voci verificate anche dai hook), comando di audit NuGet sostituito da rimando al §3 nella voce sui pacchetti, rimando al plugin in §6.15 (`check-plan`, `plan-reminder`). `git.md`: ▲ su «Messaggi di commit» e su «Cosa non entra mai»; divieto di `--no-verify` ora solo in «Sicurezza della cronologia» (prima ripetuto). `security.md`: ▲ su «Dati e Segreti» e su innerHTML/bypassSecurityTrust. `frontend.md`: ▲ su «TypeScript rigoroso» e sui colori; «Niente any» in §16 diventa rimando a §2. `docker.md`: ▲ sul tag fisso.
**Verifica:** tutte le sezioni citate nei rimandi esistono (controllo con grep); nessuna regola rimossa: le righe con obblighi restano, sono state aggiunte solo note e rimandi.
**Note:** le ripetizioni trasversali ancora presenti sono volute: la regola «una domanda alla volta» appare nell'intestazione di `core.md`, nel §6.5 e in `CLAUDE.md`, ciascuna per il suo contesto; `CLAUDE.md` resta com'è perché è il file che il progetto personalizza. Il riferimento «§6.19» usato nel piano di lavoro è sbagliato: la cancellazione di `PIANO.md` sta in §6.15 («Modifiche piccole»).

### Avvisi di qualità per Docker, dipendenze e frontend (kit-config 1.4.0)

**Perché:** le regole di `docker.md`, `core.md` §3 e `frontend.md` (tag fissi, range di versione, `any`, `innerHTML`, colori hardcoded) erano solo testo. Modalità scelta dall'utente: avviso, non blocco.
**Cosa / Dove:** nuovo `plugins/kit-config/scripts/check-quality.mjs` (PostToolUse su Write/Edit/MultiEdit), registrato in `hooks/hooks.json` nel gruppo PostToolUse. Controlla il testo scritto e segnala: immagini Docker senza tag o con `latest`; porte host di database e broker esposte; range di versione (`^`, `~`, `*`, `latest`) in `package.json` e nei `*.csproj`/`*.props`; `any`, `innerHTML`, `bypassSecurityTrust*`; colori esadecimali in `.ts`/`.html` e in `.css`/`.scss` fuori dai token `--nome:`. Quando cambiano i pacchetti ricorda `npm audit` o `dotnet list package --vulnerable`. L'avviso va a Claude (`additionalContext`) e all'utente (`systemMessage`). `plugins/kit-config/.claude-plugin/plugin.json` da 1.3.0 a 1.4.0.
**Verifica:** `tests/quality.test.mjs` (11 test) e `tests/guards.test.mjs` (20 test): 31/31 verdi. `node --check` e `hooks.json` validi. Il test preesistente `rules-watch` resta com'era (causa ENOENT già nota).
**Note:** il controllo è testuale: non esegue `docker compose config` né `npm audit`. Falsi positivi noti: un `#abc` in un `href` html o un nome privato `#fee` in TypeScript vengono segnalati come colori. I range `^` in `package.json` sono segnalati tutti, come concordato; se risultano troppo rumorosi si restringono ai soli `*`/`latest`.

### Hook di kit-config per Git, segreti e controllo del piano (kit-config 1.3.0)

**Perché:** le regole di `git.md`, `security.md` e del piano erano solo testo: un commit con messaggio generico, un `git add -A` o un segreto in `appsettings.json` passavano senza controlli. Ora sono verificati da hook deterministici.
**Cosa / Dove:** `plugins/kit-config/scripts/guard-commands.mjs`: blocco di `git add -A`, `--all` e `.`; blocco dei file sensibili (`.env` non example, `secrets.json`, `*.pfx`, `*.p12`, `*.key`, `*.pem`, `*.jks`); controllo del messaggio di `git commit` (Conventional Commits, oggetto ≤ 72 caratteri, descrizione minuscola, senza punto finale), letto da `-m` o da heredoc. Nuovo `scripts/guard-secrets.mjs` (PreToolUse su Write/Edit/MultiEdit): valori reali in `appsettings*.json` (Password, Secret, Token, Key, password nelle stringhe di connessione), password in chiaro in `docker-compose*.yml` e `Dockerfile`, chiavi PEM, chiavi AWS e token JWT completi. Nuovo `scripts/check-plan.mjs` (PostToolUse su `PIANO.md`): un passo `[x]` senza esito di build e di test viene segnalato a Claude. Nuovo `scripts/plan-reminder.mjs` (Stop): `systemMessage` se restano passi aperti. `hooks/hooks.json` registra i nuovi hook. `plugins/kit-config/.claude-plugin/plugin.json` da 1.2.0 a 1.3.0.
**Verifica:** `tests/guards.test.mjs`, 20 test su processi reali con input JSON: 20/20 verdi. Sintassi di tutti gli script (`node --check`) e `hooks.json` validi. Il test preesistente `tests/rules-watch.test.mjs` fallisce per la causa già nota (il test clona da HEAD e `.claude/` non è committato); invariato, non corretto.
**Note:** scelte prese senza domanda, reversibili: blocco (exit 2) per le violazioni deterministiche, feedback soltanto per il piano. Il controllo sui segreti usa un elenco di segnaposto (`CHANGE-ME`, `${VAR}`, `changeme`, `placeholder`, `your…`, `example`): un valore reale che contiene una di queste parole passa. Il controllo del messaggio non copre `-F file` né `--amend` senza `-m`. Da verificare dal vivo al prossimo avvio di Claude Code, perché i hook si caricano all'avvio della sessione.

### Piano, analisi e checklist nelle regole (core.md v3.23, kit-config 1.2.0)

**Perché:** lavorando per sessioni successive si ripartiva ogni volta dall'analisi; i problemi trovati durante un'attività si perdevano o interrompevano il lavoro; le domande andavano poste una alla volta ma la regola non copriva i punti dell'analisi.
**Cosa / Dove:** `.claude/rules/core.md` §6, nuovi punti 20 (piano in `PIANO.md` con le conclusioni dell'analisi, prima del codice), 21 (test e domande prima di spuntare un punto) e 22 (problemi e miglioramenti annotati in `CHECKLIST.md`, a punti, non cancellata in automatico); versione di `core.md` da 3.22 a 3.23. `plugins/kit-config/scripts/ask-one-question.mjs`: il promemoria a ogni messaggio richiama piano e checklist; `plugins/kit-config/.claude-plugin/plugin.json` da 1.1.0 a 1.2.0.
**Verifica:** hook `ask-one-question.mjs` eseguito a mano (testo e uscita 0). Test di `plugins/kit-config/tests/rules-watch.test.mjs` falliti: il test clona il repository da HEAD e `.claude/` non è ancora committato (tutto il repository è in `??`); fallimento preesistente, non causato da questa modifica, da risolvere con il primo commit.
**Note:** scelte fatte senza domanda perché ovvie: nome della checklist `CHECKLIST.md`. Le regole usano `PIANO.md` (come già in core.md §6.15) e non `PLAN.md`, scelta confermata dall'utente.

### Rilascio 1.1.0

**Perché:** portare agli utenti del plugin `kit-config` le modifiche accumulate dopo la 1.0.0: con `version` invariata `claude plugin update` non le installa.
**Cosa / Dove:** `plugins/kit-config/.claude-plugin/plugin.json` da 1.0.0 a 1.1.0. Punti salienti: controllo delle regole aggiornate a sessione in corso e rispetto al template (`rules-watch`); documentazione spostata su Docusaurus; revisione completa di `security.md` (OWASP Top 10 2025, ASVS 5.0.0, `core.md` v3.22).
**Verifica:** solo file di configurazione e testo, nessuna build. La prova dal vivo di `rules-watch` è rimandata dall'utente.
**Note:** tag e rilascio su GitHub sono a cura dell'utente.

### Revisione di security.md: chiusura e coerenza complessiva

**Perché:** chiudere il piano di revisione (25 punti, fasi 0–4) con un controllo di coerenza su tutte le regole toccate.
**Cosa / Dove:** rilettura dei rimandi a `security.md` in tutti i moduli: ogni sezione citata esiste; nessuna regola rimasta doppia dopo la pulizia (servizi a pagamento, errori, test). `core.md` resta alla v3.22 (nessuna modifica in questa fase). Riepilogo dell'insieme: fonti Top 10 2025 e ASVS 5.0.0 con mappa dei capitoli; autenticazione e completamenti; progettazione sicura e fail closed; upload; frontend (CSP, Trusted Types); supply chain; abuso di risorse; header e configurazione; log e allerta; DAST, `SECURITY.md` e runbook; mobile; multi-tenancy (RLS); analyzer in `.editorconfig`; `NuGet.config` con source mapping.
**Verifica:** `git diff --check` senza errori (solo l'avviso sui fine riga di `.editorconfig`); nessuna build, sono regole.
**Note:** gli elementi non verificati su una fonte sono elencati nelle note delle singole voci di questo giorno e vanno controllati al primo uso.

### security.md: mobile, multi-tenancy (RLS) e pulizia finale

**Perché:** mancavano regole minime per il mobile e per la difesa in profondità nella multi-tenancy; alcune regole erano ripetute in più file.
**Cosa / Dove:** `.claude/rules/security.md`: nuova sezione «Mobile (sezione minima)» con rimando a OWASP MASVS; voce «Multi-tenancy» con revisione obbligatoria di `IgnoreQueryFilters` e RLS di PostgreSQL come difesa in profondità; «Servizi a pagamento» ridotto a rimando a `core.md` §3 (resta l'elenco degli IdP); «Errori» ridotto a rimando a `backend.md`; test di proprietà e frontend riorganizzati nella sezione dei test. `.claude/rules/backend-app.md` §4.6: voce su `IgnoreQueryFilters` e RLS.
**Verifica:** solo regole, nessuna build; `git diff --check` da eseguire in 4.1.
**Note:** non verificati su una fonte: i gruppi di controlli di OWASP MASVS, la sintassi RLS (`FORCE ROW LEVEL SECURITY`, `set_config` per transazione) e il suo uso con il pool di Npgsql/EF Core, l'analogo su SQL Server. Vanno controllati al primo uso.

### Allineamento della fase 2 (core.md v3.22)

**Perché:** le regole nuove dei passi 2.1–2.8 dovevano riflettersi nella checklist di consegna, nel `CLAUDE.md` template e nella versione di `core.md` (decisione D9: aumento a ogni fase). Passo 2.9 della revisione.
**Cosa / Dove:** `.claude/rules/core.md` v3.22 con due nuove voci in §0b (limiti, header, webhook; eventi di sicurezza, `SECURITY.md` e runbook); `CLAUDE.md` con quattro nuovi campi (limiti e rate limiting, allerta e retention, DAST, CSP della SPA statica). `README.md` non cambia: non descrive il contenuto delle singole regole.
**Verifica:** ricerca di contraddizioni tra `security.md`, `backend.md`, `backend-app.md`, `frontend.md`, `docker.md` e `core.md` sui temi della fase (paginazione, `no-store`, `/health`, CSP, log): nessuna trovata.
**Note:** `docs/` non esiste nel repository del kit; il runbook e `SECURITY.md` sono richiesti ai progetti, non creati qui.

### security.md e .editorconfig: rifiniture (analyzer, CSP statica, versioni delle fonti)

**Perché:** gli analyzer di sicurezza erano citati ma non configurati; la CSP della SPA statica richiedeva una decisione ripetuta in ogni progetto; le versioni delle fonti non erano dichiarate. Passo 2.8 della revisione (M4, M5, M6).
**Cosa / Dove:** in `.editorconfig` sezione di regole `CA5350`, `CA5351`, `CA5358`, `CA5379`, `CA5390`, `CA5394`, `CA5403`, `CA2100`, `CA5369`, `CA5372`, `CA2300`–`CA2302` a severità `error`. In `.claude/rules/security.md`: «Crittografia» (`AnalysisLevel`/`AnalysisMode`, soppressioni con motivo), «Protezione dell'API» (default CSP a hash con `autoCsp` per la SPA statica, nonce solo se serve), intestazione con le versioni delle fonti (Top 10 2025, ASVS 5.0.0).
**Verifica:** `git diff --check` pulito. Nessuna build nel repository: la sezione dell'`.editorconfig` non è stata provata su un progetto .NET.
**Note:** ID delle regole, valori di `AnalysisMode` e disponibilità di `autoCsp` nella versione di Angular usata non sono stati riletti dalla documentazione: da verificare al primo uso.

### security.md: mappa ASVS 5.0 e livelli

**Perché:** il livello ASVS si chiedeva a ogni progetto ma non cambiava nulla nelle regole. Passo 2.7 della revisione; decisione D7: tabella di mappatura.
**Cosa / Dove:** in `.claude/rules/security.md` nuova sezione «Mappa ASVS 5.0 e livelli»: tabella dei 17 capitoli con le sezioni delle regole che li coprono (titoli letti su GitHub, tag v5.0.0) e cosa il kit aggiunge a livello 2 e 3.
**Verifica:** `git diff --check` pulito.
**Note:** il livello dei singoli requisiti ASVS non è stato letto; i controlli per livello sono scelte del kit.

### security.md: scansione dinamica, segnalazioni e incidenti

**Perché:** mancavano un test dinamico, un canale per le segnalazioni e una procedura per segreti o account compromessi. Passo 2.6 della revisione (A12); decisione D6: ZAP opzionale.
**Cosa / Dove:** in `.claude/rules/security.md` nuova sezione «Scansione dinamica, segnalazioni e risposta agli incidenti»: ZAP baseline opzionale in CI, `SECURITY.md` per progetto, runbook minimo in `docs/runbook-sicurezza.md`.
**Verifica:** `git diff --check` pulito. Nessuna build nel repository.
**Note:** il termine di 72 ore del GDPR è dalla memoria, da riverificare sul testo del regolamento al primo uso.

### security.md: header e configurazione

**Perché:** mancavano `no-store` sulle risposte autenticate, header che rivelano la tecnologia, la protezione degli endpoint operativi, la verifica dei webhook in ingresso e `Vary: Origin` su CORS. Passo 2.5 della revisione (A02 Security Misconfiguration).
**Cosa / Dove:** in `.claude/rules/security.md`, «Protezione dell'API»: `Vary: Origin` nella voce CORS e nuovo punto «Configurazione e superficie esposta» (no-store, `Server`/`X-Powered-By`, endpoint operativi non pubblici, pagine di debug, webhook con HMAC, timestamp e anti-replay). In `.claude/rules/backend.md`, «Caching HTTP»: rimando a `no-store`.
**Verifica:** `git diff --check` pulito. Nessuna build nel repository.
**Note:** `AddServerHeader`, finestra di 5 minuti dei webhook e uso di `no-store` sono scelte del kit non lette da una fonte in questa sessione; il test degli header resta quello già previsto in «Test di sicurezza automatici».

### security.md: log di sicurezza e allerta

**Perché:** le regole prescrivevano cosa registrare ma non cosa allertare né come proteggere i log di audit. Passo 2.4 della revisione (A09 Security Logging and Alerting Failures); decisione D5: alert per livelli.
**Cosa / Dove:** in `.claude/rules/security.md`, sezione «Dati e Segreti», sotto «Log di sicurezza»: eventi con nome stabile, alert minimi, due livelli (log strutturati per i progetti piccoli; alert Grafana/Prometheus con lo stack di `core.md` §5), integrità e retention dei log di audit, test.
**Verifica:** `git diff --check` pulito. Nessuna build nel repository.
**Note:** nomi degli eventi e soglie sono scelte del kit, non lette da una fonte in questa sessione.

### security.md: abuso di risorse

**Perché:** rate limiting e limiti erano due righe generiche; mancavano timeout su database, HTTP e regex, tetto alla paginazione e un lockout che non diventi un vettore di DoS. Passo 2.3 della revisione (A06 Insecure Design / ASVS V2).
**Cosa / Dove:** in `.claude/rules/security.md` nuova sezione «Abuso di risorse» (paginazione, rate limit con `429` e `Retry-After`, timeout, `matchTimeout` sulle regex, limiti di dimensione, lockout temporaneo con ritardi crescenti, test); rimandi dalle voci «Protezione dell'API». In `.claude/rules/backend-app.md` §4.3 `pageSize` con valore predefinito e massimo in configurazione. Corretto in §4.4 un a capo mancante tra «Privilegi» e «Letture».
**Verifica:** `git diff --check` pulito. Nessuna build nel repository.
**Note:** i dettagli (limiti per replica, `matchTimeout`, middleware di timeout) sono scelte del kit non lette da una fonte in questa sessione; i valori si concordano per progetto.

### security.md: completamenti dell'autenticazione

**Perché:** le regole coprivano login, reset, lockout e JWT ma non passkey, codici di recupero, ri-autenticazione, gestione delle sessioni, riuso del refresh token, rotazione delle chiavi e credenziali per client macchina. Passo 2.2 della revisione; decisione D4: la passkey è un extra opzionale (non raccomandata d'ufficio per gli admin).
**Cosa / Dove:** in `.claude/rules/security.md`, sezione «Autenticazione e Autorizzazione»: l'elenco degli extra del punto 3 include i nuovi temi; nuovo punto «Completamenti dell'autenticazione» con una regola per ciascuno, tutti validi solo se l'extra è scelto e registrato nel campo «Granularità» del `CLAUDE.md`.
**Verifica:** coerente con il punto 3b (rinnovo e revoca dei token) e con «Dati e Segreti» (rotazione dei segreti); `git diff --check` pulito. Nessuna build nel repository.
**Note:** il supporto passkey nella versione di Identity di .NET 10 non è stato verificato: la regola dice di controllarlo al primo uso. Rilevamento del riuso del refresh token, ri-autenticazione e gestione delle sessioni sono pratiche del kit, non lette da una fonte in questa sessione.

### security.md: sezione Frontend come unica fonte

**Perché:** la sicurezza del frontend era descritta in tre righe di `security.md` e ripresa in `frontend.md` §9 e §12 con elenchi propri; mancavano CSP di base, Trusted Types, `postMessage`, source map e service worker. Passo 2.1 della revisione.
**Cosa / Dove:**
- `.claude/rules/security.md`, sezione «Frontend»: nonce per richiesta, CSP di base con rollout in report-only, Trusted Types, script di terze parti e SRI, `postMessage` e `iframe sandbox`, storage, build e segreti (source map, `config.json`), service worker e PWA, test su input ostili. Dichiarata unica fonte.
- `.claude/rules/frontend.md` §9: elenco allineato, con rimando a quella sezione (il rimando di §12 «Sicurezza» già puntava a `security.md`).
**Verifica:** fonti lette il 2026-11-04: OWASP CSP Cheat Sheet, OWASP HTML5 Security Cheat Sheet, guida Angular alla sicurezza (nonce, Trusted Types); `git diff --check` pulito. Nessuna build nel repository.
**Note:** SRI e le regole su source map e service worker sono scelte del kit, non citate dalle cheat sheet lette. Il default `autoCsp` per la SPA statica resta al passo 2.8.

### Allineamento della fase 1 (checklist, template, NuGet.config)

**Perché:** le regole dei passi 1.1-1.7 introducono scelte per progetto e controlli di consegna che il template e la checklist non riflettevano (passo 1.8 della revisione).
**Cosa / Dove:**
- `.claude/rules/core.md` §0b: tre voci nuove (threat model e fail closed; upload e `Host` ostile; utente delle migrazioni, connessione cifrata, nessun servizio interno esposto).
- `CLAUDE.md` (template), «Scelte architetturali»: campi «Indirizzo pubblico e host ammessi», «Utenti del database», «Upload di file», «Eccezioni a `npm ci --ignore-scripts`».
- `NuGet.config`: il `packageSourceMapping` con `nuget.org` per `*` è ora attivo (il feed privato resta un esempio commentato), come richiesto da `security.md` («Supply chain»).
**Verifica:** ricerca dei termini toccati (Argon2, PBKDF2, SHA-1, `AllowedHosts`, `packageSourceMapping`, `--ignore-scripts`) in `.claude/`, `_template/`, `README.md` e `CLAUDE.md`: nessuna contraddizione; `git diff --check` pulito. `docs/` non esiste più nel repository (è nel sito `claude-config-docs`); `README.md` non cita le regole toccate. Nessuna build nel repository.
**Note:** `NuGet.config` attivo non è stato provato con un `dotnet restore` (il repository non ha progetti .NET). Versione di `core.md` salita a 3.21 (D9: una salita a ogni fase in cui `core.md` cambia); il plugin `rules-watch` avvisa i progetti con una versione più vecchia.

### security.md: progettazione sicura e fail closed

**Perché:** le regole non chiedevano una riflessione sulle minacce prima del codice né dicevano cosa fare quando un controllo di sicurezza non può rispondere; sono le categorie A06 «Insecure Design» e A10 «Mishandling of Exceptional Conditions» del Top 10 2025 (verificato il 2026-11-04). Passo 1.7 della revisione.
**Cosa / Dove:** in `.claude/rules/security.md`: nuova sezione «Progettazione sicura e fail closed» (threat model leggero come ADR in `docs/adr/` per le funzionalità su autenticazione, dati personali, upload e integrazioni; regola fail closed; eccezioni senza stato a metà) e nuovo test «Fail closed» tra quelli automatici.
**Verifica:** il formato dell'ADR rimanda a `core.md` §5b; `git diff --check` pulito. Nessuna build nel repository.

### security.md: supply chain concreta

**Perché:** `core.md` §3 e §5 prevedono audit, CodeQL, gitleaks, Trivy e SBOM, ma non i controlli che riducono il rischio a monte (OWASP Top 10 2025, A03 «Software Supply Chain Failures», verificata il 2026-11-04). Passo 1.6 della revisione; decisione D3: `--ignore-scripts` obbligatorio con eccezioni documentate, attesa di 7 giorni per le versioni nuove.
**Cosa / Dove:**
- `.claude/rules/security.md`, sezione «Supply chain»: package source mapping NuGet; `npm ci --ignore-scripts` con eccezioni nel `CLAUDE.md`; attesa di 7 giorni nel bot delle dipendenze (sicurezza esclusa); GitHub Actions per SHA con `permissions:` minimi; protezione dei branch e `CODEOWNERS` (a cura dell'utente); attestazione di provenienza dell'immagine.
- `.claude/rules/core.md` §3 (Audit): rimando a quella sezione.
**Verifica:** fonti lette il 2026-11-04: documentazione Dependabot (`cooldown`, non applicato agli aggiornamenti di sicurezza), Microsoft Learn su package source mapping (NuGet 6.0, `<packageSourceMapping>`), guida GitHub sull'hardening delle Actions (SHA completo, `GITHUB_TOKEN` in sola lettura); `git diff --check` pulito. Nessuna build nel repository.
**Note:** non verificati, perciò scritti come da verificare al primo uso: l'equivalente del cooldown in Renovate e lo strumento per l'attestazione di provenienza. La versione di `core.md` non è cambiata (solo un rimando); si decide con D9.

### security.md: upload e parsing di file

**Perché:** la regola sugli upload era una sola riga (MIME, magic bytes, limite, nome, storage) e non copriva archivi, immagini, XML, contenuti attivi e download. Passo 1.5 della revisione.
**Cosa / Dove:** in `.claude/rules/security.md`: il punto «Upload» diventa «Upload e parsing di file», con controlli su tipo, nome e posizione, limiti, archivi (zip bomb e zip slip), immagini (ricodifica, EXIF), SVG e contenuti attivi, XML (XXE), download (`Content-Disposition`, `nosniff`) e antivirus come scelta per progetto; nuovo test «File ostili» tra quelli automatici.
**Verifica:** punti confrontati con la OWASP File Upload Cheat Sheet (letta il 2026-11-04); `git diff --check` pulito. Nessuna build nel repository.
**Note:** il divieto degli SVG caricati dagli utenti è una scelta del kit: la cheat sheet non cita SVG e non ho trovato una fonte OWASP verificata per quel punto.

### Database e canali interni: utente per le migrazioni, connessioni cifrate

**Perché:** `backend-app.md` §4.4 chiedeva un utente applicativo senza DDL, ma le migrazioni si applicano da codice all'avvio (`MigrateAsync()`), che richiede DDL: le due regole non stavano insieme. Mancavano anche cifratura della connessione al database e autenticazione/TLS dei servizi interni. Passo 1.4 della revisione; decisione D2: utente separato per le migrazioni sempre obbligatorio.
**Cosa / Dove:**
- `.claude/rules/backend-app.md` §4.4: l'app serve le richieste con l'utente senza DDL; le migrazioni usano un utente separato con una seconda stringa di connessione (`ConnectionStrings:Migrations`).
- `.claude/rules/docker.md` (Migrazioni): `ConnectionStrings__Migrations` da secret o variabile d'ambiente.
- `.claude/rules/security.md` (Dati e Segreti): nuovo punto «Database e canali interni» (connessione cifrata con certificato verificato, Redis e RabbitMQ autenticati, TLS fuori dalla rete interna, nessun servizio interno raggiungibile da Internet).
**Verifica:** `git diff --check` pulito; nessun conflitto con `docker.md` (Redis con password, nessuna porta esposta). Nessuna build nel repository.
**Note:** la stringa `Migrations` va ancora elencata tra i campi del `CLAUDE.md` e in `.env.example` del template (passo 1.8).

### security.md: host header e URL assoluti

**Perché:** la regola contro l'uso dell'header `Host` per costruire i link esisteva solo nel modulo opzionale `backend-email.md`; un progetto senza quel modulo (inviti, redirect, callback) non ne aveva alcuna. La cheat sheet OWASP «Forgot Password» (letta il 2026-11-04) indica l'URL fisso o in allow-list. Passo 1.3 della revisione.
**Cosa / Dove:** in `.claude/rules/security.md`: nella sezione «Protezione dell'API» nuovo punto «Host header e URL assoluti» (indirizzo pubblico da configurazione, `AllowedHosts` esplicito e non `*` in produzione, rimando a `backend-email.md`); nella sezione dei test automatici nuovo punto «Host ostile».
**Verifica:** `git diff --check` pulito; il punto non contraddice `backend-email.md` (§ «Indirizzo base dei link»), che resta il dettaglio per le email. Nessuna build nel repository.
**Note:** il campo `CLAUDE.md` per l'indirizzo pubblico non è stato aggiunto: se ne decide l'aggiunta al passo 1.8.

### security.md: crittografia coerente (SHA-1 nel TOTP, iterazioni PBKDF2)

**Perché:** il divieto di SHA-1 contraddiceva il TOTP (RFC 6238 usa HMAC-SHA1 per compatibilità con le app di autenticazione), e «PBKDF2 con iterazioni adeguate» non diceva quante. Il default di Identity (PBKDF2 HMAC-SHA512, 100.000 iterazioni) è sotto le 220.000 indicate dalla cheat sheet OWASP «Password Storage» (verificata il 2026-11-04). Passo 1.2 della revisione; decisione D1: Argon2id resta una deroga motivata.
**Cosa / Dove:** in `.claude/rules/security.md`, sezione «Crittografia»: nuova eccezione per SHA-1/HMAC-SHA1 solo dove il protocollo lo impone; sezione «Dati e Segreti», punto sulle password: `IterationCount` ad almeno 220.000 da configurazione, parametri minimi di Argon2id e condizioni della deroga (libreria permissiva verificata, hasher personalizzato).
**Verifica:** fonti rilette il 2026-11-04 (OWASP Password Storage; `PasswordHasherOptions` del ramo `release/10.0`); `git diff --check` pulito. Nessuna build nel repository.

### security.md: accorpate le regole ripetute

**Perché:** `security.md` diceva due volte la stessa cosa su input non fidato, injection, path traversal e contenuto dei log; ogni regola deve stare in un solo posto (passo 1.1 della revisione, `PIANO-security.md`).
**Cosa / Dove:** in `.claude/rules/security.md`:
- «Validazione server-side SEMPRE» e «Ogni input esterno è non fidato…» fusi in un solo punto di «Protezione dell'API».
- «Injection, tutte le forme» limitato alle forme senza regola propria; le query raw rimandano a `backend.md`; nuovo punto «Path traversal» (assorbe «Injection e path traversal»).
- «Log injection e dati nei log» rinominato «Log: injection e contenuto»; «Log di sicurezza» ora rimanda a quel punto per il contenuto dei messaggi.
**Verifica:** nessuna regola persa (confronto con `git diff`); nessun rimando rotto nei moduli; `git diff --check` pulito. Nessuna build nel repository.

## 2026-11-03

### Licenza MIT

**Perché:** il README diceva «Da definire» e senza un file `LICENSE` il contenuto non aveva una licenza di riuso. Scelta dell'utente: MIT, la stessa di `claude-config-docs`.
**Cosa / Dove:** aggiunto `LICENSE` (MIT, «Copyright (c) 2026 Angelo Pirola»); sezione «Licenza» del `README.md` ora rimanda al file.
**Verifica:** testo identico a quello di `claude-config-docs`; `git diff --check` pulito. Nessuna build nel repository.

### Documentazione spostata nel sito Docusaurus

**Perché:** la documentazione per le persone vive ora nel repository `claude-config-docs` (sito Docusaurus pubblicato in container). Tenere anche `docs/` qui creava due copie da allineare a mano.
**Cosa / Dove:**
- `docs/` (cinque file: `contenuto`, `funzionamento`, `manutenzione`, `plugin`, `uso`): rimossa. Il testo è nel sito, con lo stesso contenuto.
- `README.md`: sezione «Documentazione» con il rimando al sito e i sette link riscritti verso `http://docs-claude-config.aepserver.it/` (HTTPS verrà aggiunto in seguito). Sezione «Come si usa, in breve» ridotta: tolta la tabella delle situazioni, già nella pagina «Come si usa» del sito; restano la frase per un progetto nuovo e l'installazione del plugin.
- `_template/avvio-progetto.md` (§0 A punto 3 e §3 punto 5): `docs/` tolta dall'elenco del materiale da eliminare in un progetto nuovo, perché non esiste più.
**Verifica:** nessun riferimento residuo a `docs/` in `README.md`, `_template/` e `.claude/` (restano solo quelli a `docs/adr/` delle regole, che riguardano i progetti); `git diff --check` pulito. Nessuna build nel repository.
**Note:** le righe su `docs/` in `contenuto.md` e `uso.md` ora descrivono materiale che non c'è più nel template: vanno allineate nelle copie del sito (repository `claude-config-docs`). L'indirizzo del sito è quello dichiarato dall'utente; in `claude-config-docs` `url` in `docusaurus.config.ts` è ancora il segnaposto.

### Plugin: Claude rilegge da solo le regole aggiornate (`rules-watch`)

**Perché:** `session-plan` segnalava le regole cambiate solo a inizio sessione e solo con le impronte dei file: nessun avviso se una regola cambiava a sessione in corso (per esempio dopo un `git pull`), nessun diff e nessun confronto con il template. Serviva una richiesta esplicita ogni volta.
**Cosa / Dove:**
- `plugins/kit-config/scripts/rules-watch.mjs` (nuovo, hook `UserPromptSubmit` in `hooks/hooks.json`): a ogni messaggio confronta le impronte di `CLAUDE.md` e `.claude/rules/*.md` con lo stato salvato; se sono cambiate ordina di rileggere i file e allega il `git diff` dei soli file cambiati; se nulla è cambiato, nessun output.
- `plugins/kit-config/scripts/lib/rules.mjs` (nuovo): funzioni condivise (impronte, stato in `~/.claude/session-rules-state.json`, hash di `HEAD`, `git diff` con hash validato e solo comandi di lettura).
- `plugins/kit-config/scripts/lib/template.mjs` (nuovo): una volta per sessione confronta la versione di `core.md` con quella del template (`KIT_CONFIG_TEMPLATE_DIR`, default `E:\Disco_E\Progetti\claude-config`); se il template è più avanti segnala versioni e file diversi e chiede di proporre l'allineamento, senza copiare nulla; se la cartella manca avvisa e chiede il percorso.
- `plugins/kit-config/scripts/session-plan.mjs`: usa il modulo condiviso, registra anche l'hash di `HEAD` e allega il diff all'avviso di inizio sessione, entro il limite di 10.000 caratteri complessivi con `PIANO.md`.
- `plugins/kit-config/tests/rules-watch.test.mjs` (nuovo): 16 test con `node:test`; i casi con git usano un clone locale del repository.
- `plugins/kit-config/.claude-plugin/plugin.json`: solo la descrizione. `docs/plugin.md`, `docs/contenuto.md` e `README.md`: cinque hook, nuova sezione «Regole aggiornate», variabile d'ambiente, comando dei test.
**Verifica:** `node --test "plugins/kit-config/tests/*.test.mjs"`: 16 test su 16 passati; `node --check` su tutti gli script; confronto con la versione precedente di `session-plan` a parità di comportamento. Hook non ancora provati dal vivo in una sessione: servono aggiornamento del plugin e `/reload-plugins`. Nessuna build nel repository.
**Note:** la versione del plugin resta 1.0.0 e non è stata alzata: il bump e la voce di rilascio vanno nel commit di rilascio (`git.md`), perché chi ha il plugin installato riceve le modifiche solo quando `version` sale. Una differenza di contenuto a parità di versione di `core.md` non viene segnalata (potrebbe essere una deroga). I file nuovi non tracciati compaiono nell'elenco ma non nel diff.

### Plugin: come spostare la cartella locale del marketplace

**Perché:** la documentazione spiegava installazione e aggiornamento, ma non cosa fare quando la cartella locale del marketplace cambia percorso; `marketplace update` non aggiorna il percorso registrato.
**Cosa / Dove:**
- `docs/plugin.md`: nuova sezione «Spostare la cartella locale del marketplace» con i tre comandi (`marketplace remove`, `marketplace add --scope user`, `install --scope user`), la verifica (`/reload-plugins`, `claude plugin list`) e l'avviso che `remove` disinstalla il plugin e ne cancella opzioni e dati salvati.
**Verifica:** procedura eseguita sulla macchina dell'autore (percorso passato a `E:\Disco_E\Progetti\claude-config`): marketplace e plugin risultano registrati al nuovo percorso. Hook non riprovati dal vivo. Nessuna build né test nel repository.

## 2026-11-02

### `PIANO.md` solo per il lavoro sostanzioso

**Perché:** la regola imponeva `PIANO.md` per ogni modifica, anche di una riga: creare e cancellare il file costava più della modifica.
**Cosa / Dove:**
- `.claude/rules/core.md` (versione 3.20): §6.15 diventa «Piano a inizio attività, per il lavoro sostanzioso»; il paragrafo «Nessuna esclusione, mai» è sostituito da «Modifiche piccole (senza piano)». Una modifica è piccola solo se tutte le condizioni sono vere: locale e ovvia, nessuna decisione aperta, nessuna dipendenza, nessun impatto su sicurezza, dati, migrazioni, Docker o struttura, non è un refactoring ampio. Senza piano restano dovuti: dire in chat cosa e dove si modifica, `README.md` e `CHANGELOG.md`, build e test. Se una condizione è dubbia o la modifica cresce, Claude pone una domanda o scrive il piano; su richiesta esplicita dell'utente il piano si scrive sempre. Riga della checklist §0b adeguata.
- `docs/funzionamento.md` (riga 23) e `README.md` (riga 33): descrizione allineata.
- Piano concluso: `core.md` §6.15 e `git.md` («Commit multipli», punto 1) prevedono che `PIANO.md` e ogni altro piano in formato `.md`, comunque si chiami (`piano-commit.md` a commit finiti), restino finché hanno passi da fare e si cancellino a lavoro concluso, senza chiedere conferma all'utente.
**Verifica:** `git diff --check` pulito; nessun residuo di «Nessuna esclusione» o «anche piccola». Nessuna build né test nel repository.
**Note:** la soglia è qualitativa (scelta dell'utente), non numerica: nel dubbio Claude chiede. Resta invariato l'obbligo del piano per refactoring ampi, migrazioni, nuove funzionalità, avvio e integrazione di progetti.

### `backend.md` diviso in tre moduli

**Perché:** `backend.md` pesava ~45.000 caratteri (~11.300 token) e si carica a ogni lettura di un `.cs`, `.csproj` o `.props`: era il più grande dei moduli, con la sola sezione 2 al 60% del file.
**Cosa / Dove:**
- `.claude/rules/backend.md` (ora ~24.400 caratteri): stack, regole comuni (§2), mapping (§3), §5-§9, con rimandi ai due nuovi moduli.
- `.claude/rules/backend-architecture.md` (nuovo, ~12.900): §2a Vertical Slice, §2b Clean Architecture, §2c accesso ai dati e pattern.
- `.claude/rules/backend-app.md` (nuovo, ~9.400): §4.1-4.6 (errori, concorrenza, paginazione, database ed EF Core, integration test, utente corrente e proprietà).
- Testo delle regole invariato (confrontato riga per riga con l'originale); stessa intestazione `paths:`, quindi il caricamento non cambia. La numerazione dei paragrafi resta quella storica, condivisa dai tre file.
- Rimandi riscritti in `core.md` (versione 3.19), `frontend.md`, `git.md`, `security.md`, `backend-email.md`, `backend-infra.md`, `feature-workflow.md`, `CLAUDE.md`; elenchi dei moduli in `core.md`, `CLAUDE.md`, `docs/contenuto.md`, `_template/avvio-progetto.md`.
- `copia-regole.bat`: la voce 1 copia i tre moduli backend con una sola domanda. La voce 2, se il progetto ha `backend.md`, aggiunge i due moduli backend mancanti, aggiorna anche i moduli presenti in `rules-optional/` del progetto (prima guardava solo `rules/`) e ricorda di far riallineare il `CLAUDE.md` a Claude.
- `docs/uso.md`: riorganizzato per situazione, perché il bat compariva in tre punti senza dire quale caso si ha: tabella «Quale caso è il tuo?», una sezione per caso (progetto nuovo; esistente senza regole, con strada A col bat e strada B senza; esistente con regole), sezione «Il template come cartella a parte» (dove si lancia il bat, repository GitHub già esistente, percorso del template) e dettagli del bat in fondo. Contenuto esistente conservato; nessun file nuovo. `README.md`: riga dell'indice aggiornata.
**Verifica:** nessuna riga persa (confronto con la copia dell'originale); nessun rimando `backend.md §2a-2c/§4.x` residuo; `git diff --check` pulito. Nessuna build né test nel repository; `copia-regole.bat` (voce 2) provato a secco su un finto progetto con il vecchio `backend.md` e un modulo obsoleto in `rules-optional/`, con una copia di prova che salta le domande interattive: moduli backend copiati, `backend.md` e `backend-email.md` aggiornati con `.bak`, `backend-infra.md` segnalato uguale; la voce 1 non è stata eseguita.
**Note:** nei tre file i rimandi interni `§N` senza nome del file valgono per tutti e tre i moduli. Un progetto con il solo vecchio `backend.md` si aggiorna con la voce 2 di `copia-regole.bat`, che aggiunge i due moduli mancanti; la voce 1 serve per i progetti senza regole.

### Allineamento della documentazione e pulizia del progetto nuovo

**Perché:** dopo l'introduzione del plugin, la procedura di avvio non diceva cosa fare di `.claude-plugin/`, `plugins/`, `docs/` e `copia-regole.bat` in un progetto nuovo, e i moduli non scelti venivano eliminati, impedendo di aggiungerli più avanti.
**Cosa / Dove:**
- `_template/avvio-progetto.md` (§0 A punto 3, §2, §3 punto 3 e punto 5): in un progetto nuovo si elimina il materiale del template (`_template/`, `.claude-plugin/`, `plugins/`, `docs/`, `copia-regole.bat`); `README.md` e `CHANGELOG.md` del template si sostituiscono con quelli del progetto; restano `.claude/rules/` e `.claude/rules-optional/`, e i moduli non scelti si **spostano** in `rules-optional/` invece di essere eliminati.
- `_template/avvio-progetto.md` (§3, nuovo punto 4c): Claude propone di adattare `.gitignore` al tipo di progetto, con una sola domanda di conferma.
- `docs/uso.md`, `docs/contenuto.md`, `CLAUDE.md` (riga 6): descrizioni allineate; in `docs/contenuto.md` la frase sul plugin non è più in forma storica.
- `CHANGELOG.md`: la nota «Piani cancellati» della voce «Plugin rinominato» include ora anche il `PIANO.md` del plugin, cancellato a lavoro concluso.
**Verifica:** i link Markdown di `README.md` e `docs/*.md` puntano a file esistenti; nessun riferimento residuo a `guardrails` o alla procedura manuale degli hook; `git diff --check` pulito.
**Note:** le voci vecchie del changelog restano storiche e citano ancora i piani cancellati.

### Documentazione del plugin `kit-config` (passo 4 di `PIANO.md`)

**Perché:** il plugin è l'unica procedura documentata per gli hook personali; la copia manuale in `~/.claude/` esce dalla documentazione.
**Cosa / Dove:** nuovo `docs/plugin.md` (contenuto, installazione, aggiornamento, disattivazione, migrazione dagli hook a mano, limiti, versionamento); `README.md` (riga in tabella, descrizione di `contenuto.md`, rimando e comandi di installazione); `docs/contenuto.md` (struttura con `.claude-plugin/` e `plugins/kit-config/`, sezione sul plugin al posto della procedura manuale); `docs/manutenzione.md` (blocco tecnico di `git push` e `--no-verify` con il plugin; aggiornamento del plugin); `docs/funzionamento.md` (rimando al plugin); `_template/avvio-progetto.md` (struttura di `_template/`). `docs/uso.md` non pertinente, invariato.
**Verifica:** ricerca di `~/.claude`, `settings.json`, `user-config`: restano solo i riferimenti voluti (migrazione in `docs/plugin.md`); link tra i documenti verificati; `claude plugin validate` superato su marketplace e plugin.
**Note:** il validatore segnala LICENSE e icona mancanti solo per l'invio alla directory pubblica (nessun campo `license`, per scelta).

### Plugin `kit-config`: prova di installazione reale (passo 3 di `PIANO.md`)

**Perché:** verificare dal vivo che il plugin carichi gli hook su Windows con `${CLAUDE_PLUGIN_ROOT}`.
**Cosa / Dove:** nessuna modifica ai file del repository. Su `~/.claude/settings.json` (fuori dal repository) non c'erano più hook manuali; risultavano già registrati il marketplace `claude-config` (cartella locale) e `kit-config@claude-config` abilitato.
**Verifica:** `claude plugin list`: `kit-config@claude-config` 1.0.0, scope user, enabled. Hook attivi: `session-plan` (riepilogo a inizio sessione), `ask-one-question` (promemoria dopo ogni messaggio), `guard-commands` (bloccato `git push`), `limit-one-question` (rifiutata una chiamata `AskUserQuestion` con due domande).
**Note:** il marketplace da GitHub si userà dopo push e merge, a cura dell'utente.

### Plugin rinominato da `guardrails` a `kit-config`

**Perché:** lasciare libera la radice `kit-*` per eventuali futuri plugin dello stesso marketplace.
**Cosa / Dove:** `plugins/guardrails/` → `plugins/kit-config/` (`git mv`); `name` in `plugins/kit-config/.claude-plugin/plugin.json`; `name` e `source` (`./plugins/kit-config`) nella voce del plugin in `.claude-plugin/marketplace.json`; commenti di testa dei quattro script in `scripts/`; `PIANO.md`. Il marketplace resta `claude-config`; il comando di installazione diventa `claude plugin install kit-config@claude-config`. Piano in `PIANO-rinomina-plugin.md`.
**Corrispondenza:** le voci precedenti di questo file che citano `guardrails` e `plugins/guardrails/` si riferiscono allo stesso plugin, allora con il vecchio nome, e sono lasciate invariate come storia. Hook, script e `version` (1.0.0) non cambiano.
**Verifica:** `claude plugin validate` superato su plugin e marketplace; `node --check` superato sui quattro script.
**Note:** il plugin non è mai stato installato sulla macchina, quindi non serve migrare nulla in `~/.claude/`. Il suggerimento del validatore sul README (riga di installazione) resta al passo 4 di `PIANO.md`.
**Piani cancellati:** a lavoro concluso sono stati cancellati `PIANO-rinomina-plugin.md`, `PIANO-url-autore.md`, `PIANO-global-usings.md` e `PIANO-frontend-sezioni.md`; a chiusura del passo 5 è stato cancellato anche `PIANO.md` (piano del plugin `kit-config`, tutti i passi completati). Non erano tracciati da git e non sono recuperabili: i rimandi a quei file nelle voci di questo changelog (anche quelli con la dicitura «non committato») non portano più a un file, e le voci stesse sono l'unica traccia di ciò che i piani descrivevano.

### Marketplace `claude-config`: URL del profilo GitHub in `owner`

**Perché:** rendere identificabile il proprietario del marketplace con un riferimento al suo profilo.
**Cosa / Dove:** in `.claude-plugin/marketplace.json`, `owner` ha ora due righe figlie distinte, `name` e `url` (`https://github.com/AngeloDotNet`). `plugin.json` invariato.
**Verifica:** JSON valido; `claude plugin validate` superato senza segnalazioni sul campo.
**Note:** la validazione non dice se `claude` usi `owner.url` o lo ignori.

### Frontend: sezione 13 "Linee guida per i template"

**Perché:** raccogliere in un punto solo le linee guida per i template e lo stato locale Angular, aggiungendo le regole mancanti (Async Pipe, servizi con un unico scopo, niente `mutate()`).

**Cosa / Dove:** `.claude/rules/frontend.md`: nuova §13 (control flow moderno e `@defer`, Async Pipe, servizi con un unico scopo, `inject()`, Signal per lo stato locale, vietato `mutate()`). Le voci "Template" e "Dependency Injection" di §2 sono state sostituite da un rimando a §13; la voce "Stato" di §2 resta e la §13 la richiama. Piano in `PIANO-frontend-sezioni.md` (non committato).

**Verifica:** repository di sole regole, nessuna build né test; testo riletto e ricerca dei rimandi alle voci spostate.

**Note:** seguiranno altre tre sezioni.

### Aggiunta: sezione 14 "Linee guida per i componenti"
`.claude/rules/frontend.md`: nuova §14 (componenti piccoli, `input()`/`output()` funzionali, `computed()`, `OnPush`, Reactive Forms, niente `ngClass`/`ngStyle`). Le voci "Change detection" e "API a segnali" di §2 sostituite da un rimando a §14; "Stato" e "Form" restano in §2 e la §14 le richiama. Verifica: solo regole, testo riletto. Seguiranno altre due sezioni.

### Aggiunta: sezione 15 "Migliori pratiche di Angular"
`.claude/rules/frontend.md`: nuova §15 (standalone, Signal per lo stato, lazy loading delle route, host binding nei metadati al posto di `@HostBinding`/`@HostListener`, `NgOptimizedImage`). La voce "Componenti" di §2 ora rimanda a §15; "Stato", "Routing" e la riga Performance restano e sono richiamate. Verifica: solo regole, testo riletto. Resta un'ultima sezione.

### Aggiunta: sezione 16 "Best practice per TypeScript"
`.claude/rules/frontend.md`: nuova §16 (controllo rigoroso dei tipi, inferenza dove il tipo è evidente, niente `any`). Le voci "TypeScript rigoroso" e "Compilatore" di §2 restano (contengono `unknown`, interfacce e le opzioni di `tsconfig`) e la §16 le richiama. Verifica: solo regole, testo riletto. Con questa si chiudono le quattro sezioni richieste.

### Regola `GlobalUsings.cs` nel backend

**Perché:** gli `using` sparsi nei singoli file `.cs` duplicano righe e rendono rumorosi i diff; centralizzarli in un solo file per progetto è una convenzione richiesta dall'utente.

**Cosa / Dove:** `.claude/rules/backend.md` §2, nuova voce MUST "Using globali in `GlobalUsings.cs`" dopo "Using inutilizzati": gli `using` di ogni progetto sono `global using` in un unico `GlobalUsings.cs` nella radice del progetto. Piano in `PIANO-global-usings.md` (non committato).

**Verifica:** repository di sole regole, nessuna build né test; verificato per ricerca testuale che la regola non esisteva già e riletto il testo inserito.

### Plugin `guardrails`: struttura e hook (passi 1-2 di `PIANO.md`)

**Perché:** i quattro hook personali si copiavano a mano in `~/.claude/` e si registravano a mano in `~/.claude/settings.json` su ogni macchina; un plugin li rende installabili e aggiornabili con un comando.

**Cosa / Dove:**
- `.claude-plugin/marketplace.json` (nuovo): marketplace `claude-config` con il solo plugin `guardrails` (`source: ./plugins/guardrails`).
- `plugins/guardrails/.claude-plugin/plugin.json` (nuovo): `name: guardrails`, `version: 1.0.0`, nessun `userConfig`, nessun campo `license`.
- `plugins/guardrails/hooks/hooks.json` (nuovo): `UserPromptSubmit`, `PreToolUse` su `AskUserQuestion`, `PreToolUse` su `Bash|PowerShell`, `SessionStart` su `startup|resume|clear|compact`; forma `exec` (`command: node` + `args` con `${CLAUDE_PLUGIN_ROOT}`).
- `plugins/guardrails/scripts/` (spostati con `git mv` da `_template/user-config/`): `ask-one-question.mjs`, `limit-one-question.mjs`, `guard-commands.mjs`, `session-plan.mjs`. Logica invariata; dai commenti di testa è stato tolto il blocco di installazione manuale, sostituito dal rimando a `hooks/hooks.json`.
- `PIANO.md` (nuovo, non committato).

**Verifica:** repository di sole regole, nessuna build né test automatici. `claude plugin validate` passa su marketplace e plugin (il controllo "plugin directory", che non incide sull'esito, segnala l'assenza di `LICENSE` e di icona: riguarda solo l'invio a un catalogo pubblico). `node --check` sui quattro script. Prove con input su stdin: `ask-one-question` stampa il promemoria; `limit-one-question` esce con 2 con due domande e con 0 con una domanda o JSON illeggibile; `guard-commands` blocca `git push` e `Remove-Item -Recurse -Force`, lascia passare `git status`, `git log --grep "git push"` e `git commit` su un branch di lavoro; `session-plan` stampa il piano e registra lo stato (provato con una home finta, lo stato reale in `~/.claude/` non è stato toccato) e alla seconda esecuzione non segnala cambiamenti.

**Note:** l'installazione reale sulla macchina (passo 3) e la documentazione (passo 4) sono ancora da fare; fino ad allora `docs/contenuto.md` descrive ancora la procedura manuale e rimanda a file spostati. Gli hook in `~/.claude/settings.json` continuano a puntare ai file in `~/.claude/` e non sono stati toccati.

## 2026-11-01

### `README.md` ridotto a indice, documentazione divisa in `docs/`

**Perché:** il `README.md` era arrivato a 219 righe e risultava troppo lungo da leggere e da mantenere.

**Cosa / Dove:**
- `README.md`: ora è un indice di 49 righe (descrizione, avviso, tabella dei documenti, "Come si usa, in breve" con la tabella delle frasi, licenza).
- `docs/contenuto.md` (nuovo): struttura del repository, moduli delle regole, `_template/` e hook personali.
- `docs/uso.md` (nuovo): `copia-regole.bat`, dove Claude trova la procedura, progetto nuovo, progetto già avviato.
- `docs/funzionamento.md` (nuovo): caricamento delle regole, deroghe, cosa chiede Claude e cosa fa da solo.
- `docs/manutenzione.md` (nuovo): verifiche periodiche, risoluzione dei problemi, punti aperti, aggiornamento del template.
- Il testo è stato spostato senza riscriverlo; i titoli salgono di un livello e ogni file figlio ha il link di ritorno al README.

**Verifica:** repository di sole regole, nessuna build né test. Nessun altro file del repository rimanda a sezioni del README spostate.

### `develop` obbligatorio, hook sui comandi e a inizio sessione, promemoria `/compact`

**Perché:** le regole scritte sono solo consigli per il modello. `develop` obbligatorio segue le best practice del git flow ed elimina la variante semplificata; gli hook rendono deterministici i divieti che dipendevano dalla memoria di Claude (comandi git/shell vietati, rilettura del piano e delle regole a inizio sessione); `/compact` non può essere lanciato da Claude, quindi la regola è un promemoria.

**Cosa / Dove:**
- `git.md`: git flow completo e `develop` obbligatorio (nome fisso); se `develop` manca Claude chiede, con una sola domanda, se può crearlo da `main` (branch locale, dopo conferma) e poi propone il branch di lavoro; branch principale con altro nome o altro modello: si segnala e si chiede, senza rinominare. Eliminati i riferimenti al flusso semplificato.
- `CLAUDE.md` (template): "Modello branch" fisso, "Strategia di merge" come da `git.md`. `_template/avvio-progetto.md`: l'assenza di `develop` non è più una variante ammessa ma una domanda.
- `core.md`: punto 19 del §6 (promemoria di una riga a fine attività per `/compact`, che Claude non esegue); versione 3.16 → 3.18.
- `_template/user-config/guard-commands.mjs` (nuovo, `PreToolUse` su `Bash|PowerShell`): blocco assoluto di `git push`, creazione di tag, `git init`, `reset --hard`, `clean -f`, `--no-verify`, `rm -rf` e `Remove-Item -Recurse -Force`, `gh pr create/merge`, `gh release create/delete/upload/edit`, `git commit` su `main`/`develop`. Il comando è cercato solo in posizione di comando (non dentro virgolette, heredoc o commenti) e segue `bash -c`, `powershell -Command`, `cmd /c`, `eval`. Il messaggio del commit bloccato dice a Claude di proporre un branch da `develop` con una sola domanda, o di chiedere se creare `develop` se manca.
- `_template/user-config/session-plan.mjs` (nuovo, `SessionStart` su `startup|resume|clear|compact`): inserisce le prime 80 righe di `PIANO.md` più le righe con caselle aperte, e l'elenco di `CLAUDE.md` e `.claude/rules/*.md` cambiati dall'ultima sessione (impronte SHA-256 in `~/.claude/session-rules-state.json`).
- `README.md`: riga `user-config/` con tutti gli hook; riga Git aggiornata.

**Verifica:** repository di sole regole, nessuna build né test. `guard-commands.mjs`: 42 comandi vietati bloccati, 38 consentiti, 5 input anomali tollerati, messaggi di blocco del commit provati su repository temporanei con e senza `develop`; dal vivo bloccati `git push --dry-run`, `rm -rf` (Bash) e `Remove-Item -Recurse -Force` (PowerShell), e il mio stesso `rm -rf` di prova. `session-plan.mjs`: sezione del piano provata con piano assente, corto, lungo, enorme e CRLF; dal vivo il piano è arrivato nel contesto alla ripresa della sessione (`resume`) e il file di stato è stato creato.

**Note:** non verificati: il rilevamento delle regole cambiate di `session-plan.mjs` (test E2 saltato su richiesta, mai eseguito), l'esecuzione dell'hook dopo `/clear` e sugli altri eventi (non visibile a schermo: l'hook aggiunge solo contesto) e il caso `echo "$(git push)"`, che `guard-commands.mjs` non analizza (limite noto). Gli hook sono a livello utente e fuori dal repository: vanno installati su ogni macchina.

### Hook `PreToolUse` che blocca `AskUserQuestion` con più di una domanda

**Perché:** il promemoria `UserPromptSubmit` è solo un consiglio: lo strumento di domande a scelta multipla accetta fino a 4 domande per chiamata e poteva continuare a violare "una domanda alla volta". Un hook `PreToolUse` rende la regola un blocco deterministico.

**Cosa / Dove:**
- `_template/user-config/limit-one-question.mjs` (nuovo): legge il JSON dell'hook da stdin; se `tool_input.questions` ha più di una domanda esce con codice 2 e un messaggio su stderr che Claude legge e usa per riformulare. Fail-open: input illeggibile o inatteso non blocca. Il JSON `PreToolUse` con `matcher: "AskUserQuestion"` da aggiungere a `~/.claude/settings.json` è nel commento in testa allo script.
- `README.md`: descrizione di `user-config/` aggiornata con il secondo hook.

**Verifica:** repository di sole regole, nessuna build né test. Script provato con 8 input simulati: 1 domanda, 0 domande, campo assente, `questions` non array, JSON malformato e input vuoto danno exit 0; 2 e 4 domande danno exit 2 con il messaggio. Formato dell'input e matcher confermati dalla documentazione ufficiale degli hook (parte letta: i primi 100.000 caratteri della pagina).

**Verifica dal vivo:** installato a livello utente (script in `~/.claude/`, voce `PreToolUse` in `~/.claude/settings.json`); una chiamata reale a `AskUserQuestion` con 2 domande è stata bloccata con il messaggio dell'hook.

**Note:** l'installazione in `~/.claude/` e `~/.claude/settings.json` è fuori dal repository e si ripete su ogni macchina.

### Regola inviolabile "nel dubbio, una domanda alla volta" e hook di promemoria

**Perché:** la regola esisteva già (`core.md` §6.5) ma veniva trascurata nei progetti: era sepolta tra le altre, assente dal `CLAUDE.md`, in contrasto con lo strumento di domande a scelta multipla (fino a 4 domande per volta) e non verificabile.

**Cosa / Dove:**
- `core.md`: nuova sezione in testa "Regola inviolabile: nel dubbio, una domanda alla volta" (MUST, sempre attiva, una sola domanda per chiamata anche con `AskUserQuestion`); rimando dal §6.5; nuova prima voce nella checklist di consegna (§0b); versione 3.15 → 3.16, revisione 2026-11-01.
- `CLAUDE.md` (template): blocco "Regola inviolabile" prima della sezione "Regole".
- `_template/user-config/`: nuovo `ask-one-question.mjs` (hook `UserPromptSubmit` che reinserisce il promemoria a ogni messaggio); il JSON da aggiungere a `~/.claude/settings.json` è nel commento in testa allo script, senza un file di snippet separato.
- `README.md`: descrizione di `user-config/` aggiornata.
- Fuori dal repository (macchina dell'utente): script copiato in `~/.claude/` e hook registrato in `~/.claude/settings.json`.

**Verifica:** repository di sole regole, nessuna build né test. Lo script stampa il promemoria, `settings.json` è JSON valido, l'hook risulta attivo in sessione (il promemoria compare dopo ogni messaggio).

**Note:** il testo del promemoria in `ask-one-question.mjs` va tenuto allineato a `core.md`. Le copie delle regole nei progetti esistenti si aggiornano con `copia-regole.bat` (voce 2); il `CLAUDE.md` dei progetti già avviati non cambia da solo.

## 2026-10-31

### Rimossi health check e `depends_on`; migrazioni all'avvio del backend

**Perché:** i servizi come Redis, RabbitMQ o Mailpit sono container indipendenti dal progetto in sviluppo, quindi l'app non ne attende lo stato; gli health check non servono. Le migrazioni vengono applicate dal codice all'avvio del container del backend, quindi non serve un servizio one-shot che preceda l'app.

**Cosa / Dove:**
- `core.md` §5: eliminata la voce "Health check"; versione 3.14 → 3.15.
- `security.md`: eliminata la voce sugli health check dalla "Protezione dell'API".
- `docker.md`: eliminati l'healthcheck dell'app, quello di Redis e ogni `depends_on` (migrazioni incluse); migrazioni applicate all'avvio del backend, con cautela sulle repliche; la validazione verifica che i container partano.
- `backend.md`: tolto "health check" dall'elenco del livello Api; migrazioni da `Database.MigrateAsync()` all'avvio (non più bundle o step di CI/CD); tolto il paragone con le migrazioni nel primo amministratore.
- `backend-email.md` (modulo opzionale): eliminata la nota sull'SMTP in `/health/ready`.

**Verifica:** progetto di sole regole, nessuna build; `grep -i "health\|depends_on"` sui `.md` mostra solo il divieto esplicito in `docker.md` e le voci storiche del CHANGELOG.

**Note:** la regola "primo amministratore non all'avvio dell'app" resta invariata.

### SMTP di prova: Mailpit al posto di Mailtrap

**Perché:** Mailtrap è un servizio cloud e richiedeva un'eccezione dedicata alle regole sulle dipendenze; Mailpit è già presente nell'infrastruttura come servizio esterno non modificato, quindi rientra nell'eccezione generale dei servizi di infrastruttura e diventa il default per i test che richiedono un mail server.

**Cosa / Dove:**
- `core.md` §3: eliminata l'eccezione Mailtrap; versione 3.13 → 3.14, revisione 2026-10-31.
- `backend-email.md` (modulo opzionale): "Server di posta non reale" riscritto. Default Mailpit senza domanda, istanza già esistente mai aggiunta al compose, host e porta SMTP forniti dall'utente, solo test e sviluppo, licenza da verificare al primo uso.
- `CLAUDE.md` (template): la voce "SMTP di prova" offre `nessuno | Mailpit | altro`.
- `README.md`: la nota nelle verifiche periodiche riguarda ora la licenza di Mailpit.

**Verifica:** nessuna build né test (repository di sole regole); ricerca testuale su Mailtrap, MailHog, Papercut e "SMTP di prova" nei `.md`: restano solo le voci storiche del changelog e il piano.

**Note:** le copie delle regole nei progetti già avviati vanno riallineate su richiesta.

### `OperationResults`: solo la libreria di Marco Minerva

**Perché:** la libreria `OperationResults` di AppEngine subirà un refactoring completo; fino a nuova modifica l'unica opzione ammessa è quella di Marco Minerva, quindi la scelta tra due varianti non ha più senso.

**Cosa / Dove:**
- `backend.md` §1: una sola libreria, scelta fissa e non più chiesta; la variante AppEngine è dichiarata sospesa e da non proporre né usare. Rimosso il riferimento a esempi validi per entrambe e alla versione "congelata".
- `backend.md` §2: tolto il rimando alla variante AppEngine nella voce sulla libreria di gestione errori.
- `core.md` §6.2: "due varianti, si chiede ogni volta" sostituito da scelta fissa; versione 3.12 → 3.13, revisione 2026-10-31.
- `CLAUDE.md` (template): la voce "Gestione errori/risultati" non ha più le due opzioni.
- `README.md`: tolto il riferimento alla copia "congelata" di AppEngine.

**Verifica:** nessuna build né test (repository di sole regole); ricerca testuale su `AppEngine` e "due varianti" nei `.md`: restano solo la nota di sospensione e le voci storiche del changelog.

**Note:** per ripristinare la variante AppEngine basta riscrivere la voce in `backend.md` §1 e nel template. Le copie delle regole nei progetti già avviati vanno riallineate su richiesta.

## 2026-10-30

### `backend.md`: using inutilizzati e cartelle `Validators`, `Options`, `Requests`, `Responses`

**Perché:** mancavano regole sulla pulizia degli `using` e sul raggruppamento di validator, Options e DTO di richiesta/risposta; ciascuna è stata confermata singolarmente come MUST.

**Cosa / Dove:**
- `backend.md` §2: quattro nuove regole MUST: rimozione degli `using` non necessari a fine sviluppo, dopo build senza errori; cartelle `Validators/`, `Options/`, `Requests/` e `Responses/`, una per progetto, senza sottocartelle, con il namespace che segue la cartella. Clean Architecture: nel progetto che usa le classi (`Application`; `Options/` anche in `Infrastructure`). Vertical Slice: nel progetto API, accanto alle slice.
- `backend.md` §2a: DTO e validatore della slice stanno nelle cartelle condivise, non dentro la slice.
- `backend.md` §2b "Struttura interna": le eccezioni alla struttura per area funzionale passano dalla sola `Interfaces/` a `Interfaces/`, `Validators/`, `Options/`, `Requests/` e `Responses/`.

**Verifica:** nessuna build né test (repository di sole regole); ricerca testuale in `README.md`, `feature-workflow.md` e `backend-*.md` senza altre strutture in conflitto.

### `backend.md`: expression body obbligatorio

**Perché:** la regola era solo PREFER, limitata ai metodi di una sola espressione e con una deroga per la leggibilità; deve valere qualunque sia la firma del metodo.

**Cosa / Dove:**
- `backend.md` §2: "Expression body" passa da PREFER a MUST; vale per metodi, proprietà e operatori con una sola espressione, a prescindere da numero e lunghezza dei parametri e dal tipo di ritorno; il blocco solo con più istruzioni, senza deroga per la leggibilità.

**Verifica:** nessuna build né test (repository di sole regole); ricerca testuale senza altri riferimenti alla regola nelle altre regole né nel `README.md`.

**Note:** `.editorconfig` ha `csharp_style_expression_bodied_methods = when_on_single_line:silent`, che non rispecchia il MUST (impone solo se l'espressione sta su una riga, e senza avvisi): non modificato, da decidere.

### `core.md` v3.12: piano sempre obbligatorio; `frontend.md`: struttura componenti e test

**Perché:** il piano poteva essere saltato per le modifiche banali con l'ok dell'utente; deve invece esistere per ogni modifica. Inoltre `frontend.md` mancava di alcune convenzioni generiche su struttura dei componenti e test.

**Cosa / Dove:**
- `core.md` intestazione da 3.11 a 3.12; §6.15 "Nessuna esclusione, mai" (nessuna possibilità di saltare `PIANO.md`, nemmeno su richiesta per il singolo caso); §0b voce della checklist allineata.
- `frontend.md` §2: `.css` solo con stili propri, valori di `templateUrl`/`styleUrl`, nota sullo spostamento dei template inline, sottocartella per pagina nelle feature con più pagine. §10: runner e comandi (`@angular/build:unit-test`), `TestBed` e HTTP, test zoneless, isolamento e fusi orari, casi ostili, `it.fails`, chiusura di un lavoro (test e build di produzione), verifica di un refactoring con build a confronto.

**Verifica:** nessuna build né test (repository di sole regole); ricerca testuale senza riferimenti residui alla possibilità di saltare il piano.

**Note:** non importati dalla bozza di partenza il suffisso `.page`, i nomi di dominio in italiano e l'adeguamento degli import relativi.

## 2026-10-29

### Documentazione unificata nel README

**Perché:** `guida-claude.md` e `README.md` si sovrapponevano (avvio, progetti esistenti, aggiornamento delle regole) e rischiavano di divergere.

**Cosa / Dove:**
- `README.md`: nuove sezioni "Come funziona", "Cosa chiede Claude e cosa fa da solo" (aggiornata: domande singole, piano esistente, database e nginx preesistenti), "Verifiche periodiche", "Risoluzione dei problemi", "Punti aperti"; "Aggiornare il template" ampliata. Le parti già coperte dal README (struttura, avvio, progetti esistenti) non sono state riportate.
- `README.md`: chiarito dove Claude trova `_template/avvio-progetto.md` (da solo; nei progetti esistenti dalla cartella del template, che deve essere completa) e che `copia-regole.bat` non lo sostituisce; aggiunta la nota "Il progetto contiene già `.claude/rules/` e `CLAUDE.md`?" (nessun nuovo avvio: prima `git pull` del template, poi `copia-regole.bat` voce 2 o "Riallinea le regole"), con la sezione "Progetto già avviato" riferita ai soli progetti senza regole.
- `_template/guida-claude.md`: eliminato. `_template/avvio-progetto.md` resta (procedura per Claude, richiamata dalle regole) e non cita più la guida.

**Verifica:** nessuna build né test (repository di sole regole); nessun rimando residuo a `guida-claude.md` fuori dallo storico del changelog.

**Note:** l'elenco delle domande "ogni volta" della guida non è stato replicato per intero: vive nei campi del `CLAUDE.md` e nei moduli. Il file resta nello storico git.

### Controllo del template prima di procedere

**Perché:** se il template indicato è incompleto Claude deve fermarsi e dirlo, non accorgersene a metà procedura; con `copia-regole.bat` il caso dovrebbe diventare raro, ma resta possibile.

**Cosa / Dove:** `_template/avvio-progetto.md` §3, punto 1: il controllo include `_template/avvio-progetto.md`, e se manca qualcosa Claude elenca ciò che manca, si ferma e chiede di completare il template o di indicare il percorso giusto; se la procedura gira dal progetto, il controllo riguarda i moduli e il `CLAUDE.md` già presenti. Punto 4: per un progetto esistente il `CLAUDE.md` si crea se manca e si allinea se esiste (coerente con il percorso B).

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### `feature-workflow.md`: richiami alle regole su service e interfacce

**Perché:** chi segue solo il flusso per entità non deve dimenticare le regole di `backend.md` su service, interfacce e DI.

**Cosa / Dove:** `feature-workflow.md` Fase 1, passo 1 (interfacce in `Interfaces/`) e passo 3 (service con interfaccia, registrazione con entrambi i tipi, Scrutor); nessuna regola nuova, solo rimandi a `backend.md` §2.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### `core.md` v3.11

**Perché:** `core.md` è cambiato più volte dopo la v3.10; per la regola del file ogni revisione aggiorna la versione.

**Cosa / Dove:** `core.md` intestazione da 3.10 a 3.11, che raccoglie: §2 database preesistente sul server e non in container; §6.5 domande sempre singole in tutto il workflow; §6.15 piano di sviluppo già scritto (verifica, conflitti e mancanze chiesti uno per volta).

**Verifica:** nessuna build né test (repository di sole regole).

### `copia-regole.bat`: avviso se il progetto ha già le regole

**Perché:** evitare di usare per errore la voce 1 (progetti senza regole) su un progetto che le ha già e di copiarvi inutilmente `_template/`.

**Cosa / Dove:** voci del menu rinominate in "1. Progetto esistente SENZA regole: copia le regole" e "2. Progetto con regole già presenti: aggiorna le regole" (script e `README.md`). `copia-regole.bat` voce 1: se esiste `.claude/rules/` nel progetto, avvisa di usare la voce 2 e chiede se continuare; se si continua, `_template/avvio-progetto.md` non viene copiato. `README.md` aggiornato.

**Verifica:** provato con stub di `choice` (regole presenti con "no" e con "sì", regole assenti); nessuna build né test.

### `copia-regole.bat` copia anche la procedura di avvio

**Perché:** dopo la copia delle regole, Claude deve poter applicarle senza che l'utente indichi il percorso del template.

**Cosa / Dove:**
- `copia-regole.bat` voce 1: copia `_template/avvio-progetto.md` in `_template/` del progetto; messaggio finale con la frase *"Applica le regole di questo progetto"*.
- `_template/avvio-progetto.md` §0: nuova frase d'uso senza percorso; il percorso del template si chiede solo se serve (moduli non ancora copiati, riallineamento); Claude elimina `_template/` dal progetto esistente a fine procedura.
- `README.md`: riga della tabella, descrizione dello script e "Dove Claude trova la procedura" aggiornate.

**Verifica:** nessuna build né test; copia di `_template/avvio-progetto.md` provata con stub di `choice`.

### Script `copia-regole.bat` per copiare e aggiornare le regole

**Perché:** la copia dei moduli in un progetto esistente è meccanica e non richiede Claude; aggiornare le copie quando gli originali cambiano era un'operazione manuale.

**Cosa / Dove:**
- `copia-regole.bat` (nuovo, root): menu interattivo con la voce 1 (copia in un progetto: `core.md` e `git.md` sempre, moduli facoltativi su richiesta) e la voce 2 (aggiornamento: confronto file per file, conferma per ciascun file diverso, vecchio file salvato come `.md.bak`). Il `CLAUDE.md` si copia solo se manca, senza chiedere; se esiste non si tocca e Claude lo allinea (`avvio-progetto.md` §0 B, punto 4). La voce 1 può copiare anche i file di root `NuGet.config`, `.editorconfig`, `.gitignore` e `.gitattributes` (chiede sì/no per ciascuno; se esistono già e sono diversi, conferma e `.bak`); la voce 2 aggiorna solo le regole. Non tocca `PIANO.md` né altri file.
- `.gitignore`: aggiunto `*.bak` (backup dello script).
- `README.md`: elenco file, tabella d'uso, nota "Copiare i file senza Claude" e scorciatoia nella sezione "Progetto già avviato".
- `_template/avvio-progetto.md` §2: la copia dei moduli può essere già stata fatta con lo script.

**Verifica:** script provato su una cartella di prova con percorso con spazi e parentesi (copia, file uguale, file diverso con "no" e con "sì", `.bak` creato e file identico al template); `choice` sostituito da uno stub nel test, quindi il menu interattivo reale non è stato provato.

**Note:** i file `.md.bak` nel progetto non sono caricati da Claude Code; valutare di ignorarli in `.gitignore`.

### Domande singole in tutto il workflow

**Perché:** una domanda alla volta, con risposta prima di proseguire, rende le decisioni più chiare; prima l'avvio del progetto poneva le domande "tutte insieme".

**Cosa / Dove:**
- `core.md` §6.5: domande sempre singole in tutto il workflow, una per messaggio, con attesa della risposta prima della successiva o di procedere.
- `_template/avvio-progetto.md` §0 (percorsi A e B) e §1: le domande di avvio si pongono una per volta, non più tutte insieme.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** `README.md` e `guida-claude.md` non descrivono domande "tutte insieme": nessuna modifica necessaria.

### Piano di sviluppo già scritto

**Perché:** le regole prevedevano solo un `PIANO.md` scritto da Claude; non dicevano cosa fare se l'utente fornisce un piano già pronto.

**Cosa / Dove:**
- `core.md` §6.15: il piano esistente si verifica rispetto a regole e `CLAUDE.md`; conflitti e mancanze chiesti uno per volta, con aggiunta al piano solo dopo la risposta dell'utente e senza toccare i punti dell'utente; risultato salvato in `PIANO.md` ed eseguito a passi con via libera.
- `feature-workflow.md` §1, punto 4: rimando alla stessa regola per le fasi del flusso per entità.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### README: integrazione delle regole più semplice

**Perché:** la spiegazione su come integrare le regole di `.claude/` in un progetto nuovo e, soprattutto, in uno già avviato era poco chiara.

**Cosa / Dove:**
- `README.md`: nuova sezione "Come si usa, in breve" (cosa serve davvero e tabella situazione → frase da scrivere a Claude); "Progetto nuovo" ridotto ai passi essenziali; "Progetto già avviato" riscritto in sette passi numerati (template in cartella a parte, dove aprire Claude Code, frase da usare, scelta deroga o adeguamento, cosa viene copiato, verifica con `/context`).

**Verifica:** nessuna build né test (repository di sole regole); procedura confrontata con `_template/avvio-progetto.md`.

### Backend: interfacce dei service, cartella `Interfaces/`, expression body

**Perché:** rendere uniforme il codice dei service e la posizione delle interfacce, e preferire gli expression body per i metodi di una sola espressione.

**Cosa / Dove:**
- `backend.md` §2: nuove regole "Service e interfacce" (ogni service implementa un'interfaccia dedicata, registrata in DI con entrambi i tipi, anche con una sola implementazione), "Cartella `Interfaces/`" (una sola alla radice di ogni progetto, escluse le interfacce dei framework) ed "Expression body" (regola generale, a partire dagli endpoint).
- `backend.md` §2: "Registrazione in blocco con Scrutor" (PREFER) per più service con lo stesso lifetime, con filtro stretto, scansioni nei metodi di composizione e test di risoluzione dal container.
- `backend.md` SOLID, §2a, §2b (struttura interna e `AddApplication()`), §2c (repository) e `ICurrentUser`: riallineati alle nuove regole.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** gli handler di una slice che non hanno forma di service restano liberi (§2a). Licenza (MIT per quanto noto) e compatibilità con .NET 10 di Scrutor non verificate: da controllare al primo uso in un progetto.

### Docker: database e nginx preesistenti sul server

**Perché:** il database (SQL Server o PostgreSQL) e il reverse proxy nginx sono già configurati sul server che ospita i container: il compose non deve ridefinirli.

**Cosa / Dove:**
- `docker.md`: nuovo paragrafo introduttivo che vieta servizi, volumi, configurazioni e script per database e nginx; rimossi database e relativi volumi/porte dai servizi dipendenti; backup del database mantenuto (`db-backup`, `ops/backup.sh`, `ops/restore.sh`) ma da valutare e chiedere in ogni progetto, perché il database è preesistente.
- `core.md` §2: database preesistente, non in container.
- `CLAUDE.md`: comando di avvio locale, reverse proxy, nuova voce Database, servizi nel compose e backup adeguati.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** resta l'nginx dentro l'immagine del frontend (web server dei file statici), distinto dal reverse proxy; il backup del database resta tra le regole, con la decisione rimandata a ogni progetto (voce "Backup" del `CLAUDE.md`).

### Frontend: file per componente, unit test e micro frontend

**Perché:** evitare HTML e stili dentro i `.ts`, rendere esplicita la scrittura degli unit test e valutare i micro frontend senza renderli il default (il lazy loading delle route basta già per il caricamento a richiesta).

**Cosa / Dove:**
- `frontend.md` §2: naming con suffisso `.component` e quattro file separati per ogni componente (`.ts`, `.html`, `.css`, `.spec.ts`), vietati `template:`/`styles:` inline; Routing e Performance rimandano al lazy loading e ai micro frontend.
- `frontend.md` §10: unit test `*.spec.ts` accanto al file testato per servizi e componenti con logica; per la sola presentazione lo spec resta facoltativo.
- `frontend.md` §12 (nuova): micro frontend opzionali, solo su conferma, con Native Federation, confini, runtime config, sicurezza e test.
- `CLAUDE.md`: campo "Naming file Angular" reso fisso (solo deroga motivata) e nuovo campo "Micro frontend".

**Verifica:** nessuna build né test (repository di sole regole); rimandi tra sezioni riletti. `README.md` non cita il naming: invariato.

**Note:** licenza, compatibilità con Angular/PrimeNG e API di Native Federation non verificate: da controllare al primo uso in un progetto.

### Regole di workflow, qualità del codice e sicurezza

**Perché:** formalizzare le richieste dell'utente su commit, sessioni, piano, stile del codice e sicurezza, dopo averle confrontate con le regole esistenti punto per punto.

**Cosa / Dove:**
- `core.md` (v3.10): checklist con commenti XML, audit NuGet e test con input malevoli; audit NuGet con `--include-transitive` a ogni passo e in CI; commenti XML in inglese su tutti i tipi e membri pubblici; §6.15 spunta il piano solo con build e test verdi; nuovi punti 16 (rilettura di piano, `CLAUDE.md` e regole a inizio sessione, con riepilogo), 17 (leggibilità, semplicità, niente overengineering) e 18 (best practice solo su conferma).
- `git.md`: conferma esplicita dell'utente prima di ogni commit, anche singolo; nessuna PR, merge request, merge, push o tag; il piano dei commit si salva in `piano-commit.md` nella root (non più in una sezione di `PIANO.md`).
- `backend.md`: SOLID come criterio non rigido; `record` per i tipi di dati immutabili, `class` per entità EF; niente Testcontainers; dettagli interni solo in Development.
- `security.md`: Top 10 sempre considerata; injection in tutte le forme; input esterni non fidati (header, query, route); sezione Crittografia (vietati, consentiti, confronti a tempo costante); test con input malevoli; errori senza dettagli fuori da Development.

**Verifica:** nessuna build né test (repository di sole regole); modifiche rilette.

**Note:** `PIANO.md` non aggiornato; le modifiche non sono committate in attesa del tuo ok.

### Revisione di feature-workflow.md

**Perché:** allineare il flusso per entità alle regole riviste di `backend.md`, `frontend.md`, `security.md` e `core.md`.

**Cosa / Dove (`.claude/rules-optional/feature-workflow.md`):**
- Fase 1: modello secondo le scelte del `CLAUDE.md` (dominio, repository, Specification); risultati secondo la tabella di `backend.md` §4.1; `ICurrentUser` e filtro per proprietario o tenant; integration test nel progetto `IntegrationTests`, test di isolamento obbligatorio, test di architettura in Clean; security review in uscita se l'entità tocca autorizzazione o dati personali.
- Fase 2: cartella dedicata del client generato.
- Fase 3: conversione della paginazione e trattamento per codice HTTP, con rimandi a `frontend.md`.
- Sequenza dei commit: punti 2 e 3 chiariti.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### Revisione di backend-email.md

**Perché:** colmare lacune di sicurezza sull'invio email (link, TLS, iniezione) e chiudere il rimando di `security.md` sugli avvisi.

**Cosa / Dove (`.claude/rules-optional/backend-email.md`):**
- Indirizzo base dei link da configurazione (`App:PublicBaseUrl`), mai dall'header `Host`.
- TLS verso l'SMTP: validazione del certificato sempre attiva, connessione non cifrata solo verso un SMTP locale di prova in sviluppo.
- Dati dell'utente nel messaggio: parser di indirizzi, nessun ritorno a capo negli header, HTML encode nei template.
- Test con `IEmailSender` fittizio; SMTP fuori da `/health/ready`.
- Avvisi di sicurezza al cambio di password o email (rimando da `security.md`).
- Intestazione senza "Estratto da `backend.md`".

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### Revisione di backend-infra.md

**Perché:** colmare lacune su eventi, messaggistica, outbox e cache, in coerenza con `backend.md` §2b e §5b.

**Cosa / Dove (`.claude/rules-optional/backend-infra.md`):**
- Eventi di dominio: pubblicati dopo il `SaveChanges`, a due livelli scelti per evento (in-process oppure outbox), annotati nel `CLAUDE.md`.
- Messaggistica: numero massimo di tentativi con backoff, poi dead-letter queue e log; rielaborazione dalla DLQ chiesta caso per caso, mai automatica; licenza di `RabbitMQ.Client` da verificare al primo uso.
- Outbox: lock di `backend.md` §5b con più repliche, identificativo stabile per la deduplicazione, retention delle righe pubblicate.
- Cache: invalidazione dopo un `SaveChanges` riuscito con TTL come rete di sicurezza; stampede con `IMemoryCache`; identificativo dell'utente nella chiave per i dati che ne dipendono.
- Intestazione senza "Estratto da `backend.md`".

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### Revisione di git.md

**Perché:** colmare i casi emersi nel lavoro reale (modifiche parziali di un file, piano dei commit su file, base avanzata) e allineare il modulo a `core.md` §5c, ridotto a rimando.

**Cosa / Dove (`.claude/rules/git.md`):**
- Commit multipli: file con modifiche destinate a commit diversi segnalati nel piano e gestiti caso per caso (patch parziale con `git apply --cached` o commit uniti); piano dei commit salvato in una sezione di `PIANO.md`.
- Controlli sulle modifiche in stage: `git diff --cached --check`, `gitleaks` se già installato, segnalazione di file grandi o binari.
- Messaggi: prefissi `build(deps)` e `chore(deps-dev)` per i bot delle dipendenze.
- Branch: base avanzata o conflitti segnalati, risoluzione proposta e applicata solo dopo l'ok; merge e rebase restano dell'utente.
- Intestazione senza il riferimento "estratto da `core.md`"; nei test, rimando al progetto `IntegrationTests`.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

### Revisione di docker.md

**Perché:** chiudere rimandi scoperti (primo amministratore), spiegare come i segreti e l'healthcheck funzionano davvero con le immagini .NET e rafforzare la sicurezza dei container.

**Cosa / Dove (`.claude/rules/docker.md`):**
- Dockerfile: regole per l'immagine nginx del frontend (non root, `config.json` a runtime, fallback SPA e cache, header di sicurezza); healthcheck nel compose invece che nel Dockerfile; arresto graduale (`ENTRYPOINT` in forma exec, `stop_grace_period` maggiore di `ShutdownTimeout`); digest delle immagini chiesto per progetto; `ForwardedHeaders` ridotto a rimando a `security.md`.
- Compose: segreti come file (meccanismo chiesto per progetto); hardening (`read_only` con `tmpfs`, `cap_drop: [ALL]`, `pids_limit`); bundle delle migrazioni (stage nel Dockerfile o artefatto della CI, chiesto per progetto); primo amministratore con rimando a `backend.md` §7.

**Verifica:** nessuna build né test (repository di sole regole); `docker compose config` non applicabile; rimandi riletti.

**Note:** non aggiunti: `--locked-mode` nei build, volume di Data Protection, rimando a `docker-compose.observability.yml`, UTC esplicito, `no-new-privileges`.

### Revisione di security.md

**Perché:** correggere imprecisioni e colmare lacune rispetto alle best practice (OWASP ASVS, indicazioni su JWT e proxy), in coerenza con le modifiche a backend e frontend.

**Cosa / Dove (`.claude/rules/security.md`, `CLAUDE.md`):**
- Intestazione: livello ASVS chiesto per progetto (nuovo campo "Livello ASVS" nel `CLAUDE.md`).
- Autenticazione: reset password, conferma email e sessioni (messaggio uniforme, token monouso a scadenza, invalidazione al cambio password o ruolo, email di avviso); validazione e firma dei JWT (`iss`, `aud`, `exp`, `ClockSkew` ridotto, algoritmi ammessi, claim minimi); attributi dei cookie di sessione.
- Protezione dell'API: `ForwardedHeaders` con proxy fidati espliciti dietro reverse proxy; CSP con nonce chiesta per progetto se l'SPA è statica; health check con solo lo stato.
- Dati: hashing con PBKDF2 di Identity (Argon2 solo come deroga); cifratura a riposo delle chiavi di Data Protection chiesta per progetto.
- Nuova sezione "Test di sicurezza automatici" (endpoint protetti di default, ruoli e policy, proprietà e tenant, header e CORS).

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** non aggiunti: rimando anti-IDOR a `backend.md` §4.6, header `Server`, prefisso `__Host-`, rotazione JWT con `kid`. L'email di avviso rimanda a `backend-email.md`, modulo opzionale.

### Revisione di frontend.md

**Perché:** allineare il frontend al contratto con il backend (codici di errore, `traceId`, paginazione) e colmare lacune su sessione, client generato e struttura.

**Cosa / Dove (`.claude/rules/frontend.md`):**
- §2: tabella del trattamento per codice HTTP (400, 404, 409/412, 422, 401/403, 500 e rete); propagazione del `traceId` (`traceparent` con OpenTelemetry, altrimenti `X-Trace-Id`); client API generato in cartella dedicata, mai modificato a mano; confini tra feature verificati dal lint.
- §5: sessione con cookie o BFF (`withCredentials`, XSRF, sessione scaduta con ritorno solo a percorsi locali).
- §8: conversione `first`/`rows` di PrimeNG → `pageNumber`/`pageSize` in un solo punto condiviso.
- §9: ridotto a rimando a `security.md`. §10: database E2E (istanza e modalità si chiedono) e accessibilità automatica con `@axe-core/playwright`.
- Nuova §11: sostituzione di un frontend esistente (prima era un punto orfano in §1).

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** nei progetti senza `security.md` le regole di sicurezza frontend non sono più in `frontend.md` (Claude lo segnala). Non aggiunti: chiave di idempotenza lato client, client SignalR.

### Revisione di core.md

**Perché:** allineare `core.md` alle modifiche su test, errori e architettura e togliere duplicazioni.

**Cosa / Dove (`.claude/rules/core.md`):**
- §0b: quattro voci di checklist (integration test nel progetto dedicato, test di architettura, isolamento tra utenti/tenant, copertura ≥ 80%).
- §1: codici di errore del contratto (400, 401, 403, 404, 409, 412, 422).
- §2: stack di test con rimando al progetto di integration test.
- §3: eccezione per `axe-core` e `@axe-core/playwright` (solo strumenti di test, licenza da verificare al primo uso).
- §4: copertura misurata con `coverlet.collector` e `ReportGenerator` (backend) e v8 di Vitest (frontend).
- §5c: ridotto a rimando a `git.md`. §6.2: rimando a `backend.md` §2a per la forma dell'handler.

**Verifica:** nessuna build né test (repository di sole regole); rimandi riletti.

**Note:** licenze di coverlet e ReportGenerator da verificare al primo uso.

### Revisione di backend.md e integration test su database di prova (core.md v3.9)

**Perché:** l'analisi di `backend.md` ha rilevato regole mancanti sui pattern di accesso ai dati, sulla mappatura degli errori, sul modello del dominio e sui controlli di proprietà; inoltre Testcontainers è stato sostituito da un progetto dedicato di integration test con un database reale di prova.

**Cosa / Dove:**
- `backend.md` §2c (nuovo): accesso ai dati e pattern. `DbContext` diretto come default, repository mai di default (opzionale su conferma, anche in Vertical Slice, per aggregato), Specification opzionale su conferma, query object, scritture in blocco su conferma.
- `backend.md` §2a: forma dell'handler libera (annotata nel `CLAUDE.md`), struttura condivisa e divieto di dipendenze tra slice.
- `backend.md` §2b: modello del dominio anemico o ricco (opzionale), factory con eccezione di dominio (o `Result<T>` con deroga), eventi di dominio dopo `SaveChanges`, test di architettura obbligatori in Clean.
- `backend.md` §4.1: tabella risultato → HTTP (con 422 per le regole di business), eccezioni e flusso normale, 409 per concorrenza e unique, 412 per `If-Match` (allineato §4.2).
- `backend.md` §4.5 (nuovo): progetto `IntegrationTests`, database di prova locale, un database per esecuzione, utente di test con DDL, nessuno skip silenzioso.
- `backend.md` §4.6 (nuovo): `ICurrentUser`, filtro per proprietario/tenant nel servizio, 404 sulle risorse altrui (deroga al 403 annotata), handler per risorsa solo con permessi granulari.
- `core.md` §4 e intestazione (v3.9, 2026-10-29), `git.md`, `CLAUDE.md` (campi "Database nei test", "Modello del dominio", "Repository", "Specification pattern"), `_template/guida-claude.md`: rimosso Testcontainers e allineati i rimandi.

**Verifica:** nessuna build né test (repository di sole regole). Rilettura incrociata dei rimandi tra `core.md`, `backend.md`, `git.md`, `CLAUDE.md` e `_template/guida-claude.md`; nessun riferimento a Testcontainers rimasto.

**Pulizia:** rimossi `_template/archivio/` (versioni 1 e 2.1 delle regole, superate) e `_template/user-config/TODO-hook-settings.md` (promemoria sugli hook, accantonato); aggiornati i rimandi in `README.md`, `_template/guida-claude.md` e `_template/avvio-progetto.md`. Gli hook restano non attivi.

**Note:** nelle copie dei progetti già avviati le regole vanno riallineate su richiesta. Da verificare al primo uso, sulla versione installata, come ottenere il 422 nella libreria `OperationResults` scelta e la licenza/compatibilità .NET 10 della libreria dei test di architettura.
