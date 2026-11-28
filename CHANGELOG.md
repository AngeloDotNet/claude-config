# Changelog

Registro delle modifiche alle regole del template: un titolo per giorno, con una sottosezione per intervento (cosa, dove e perché). Più recente in alto. Le voci fino al 15 novembre 2026 sono archiviate in `docs/changelog/` (un file per mese).

## 2026-11-28

### Prova end-to-end della sincronizzazione (#144)
**Perché:** i test unitari del motore non dicono se copia, aggiornamento, conflitto e ripetizione funzionano insieme sui file reali del template.
**Cosa:** nuovo test che copia il template reale con `regole copia` in un progetto git, poi lo aggiorna da un tag di prova: un modulo non modificato si aggiorna da solo, un modulo personalizzato in conflitto resta con la regola personale (con copia di salvataggio), e la ripetizione non scrive nulla e lascia la domanda aperta.
**Dove:** `plugins/kit/tests/sync-e2e.test.mjs`.
**Verifica:** test end-to-end 1/1; suite del plugin 232/232.
**Note:** la prova non attiva la sincronizzazione per nessun progetto reale; l'attivazione di default e il rilascio con tag restano decisioni dell'utente (#144).

### Risposte alle domande della sincronizzazione (#143)
**Perché:** le domande della sincronizzazione (conflitti, moduli nuovi, file fuori posto, file rimossi modificati, sezione «Regole») devono poter essere risolte una alla volta, e la scelta deve restare nel registro.
**Cosa:** `pianifica` accetta le risposte (`id` = `tipo:chiave`) e le applica prima di scrivere: `tieni` o `applica` per i conflitti (e la sezione «Regole» solo con `applica`), `accetta` o `rifiuta` per i moduli nuovi (il rifiuto va in `moduli.rifiutati`), `sposta` per i file fuori posto, `rimuovi` o `tieni` per i file rimossi e modificati. Una risposta non valida o senza domanda corrispondente rifiuta il piano. Nuovo `regole.mjs sincronizza --rispondi id=scelta`, una risposta per volta. Ogni domanda nel resoconto dell'avvio riporta il suo `id`. La skill `regole` ha il nuovo caso C, con una domanda per messaggio.
**Dove:** `plugins/kit/scripts/lib/sync.mjs`, `plugins/kit/scripts/regole.mjs`, `plugins/kit/scripts/lib/avvio.mjs`, `plugins/kit/skills/regole/SKILL.md`, `plugins/kit/tests/sync.test.mjs`, `docs/skill.md`, `_template/avvio-progetto.md`, `CLAUDE.md`.
**Verifica:** 35 test di sincronizzazione (risposte incluse); suite del plugin 231/231.
**Note:** con modifiche non committate la risposta è rifiutata: la sincronizzazione riparte dopo il commit, come deciso per #141.

### Sincronizzazione all'avvio, spenta per default (#142)
**Perché:** le regole aggiornate devono arrivare ai progetti all'avvio, senza `/kit:regole`, ma l'automatismo scrive in progetti altrui: deve restare spento finché non si attiva per progetto.
**Cosa:** nuovo hook `SessionStart` (`scripts/session-start.mjs`, `hooks/hooks.json`, tempo massimo 30 secondi), che lavora solo se la voce del progetto in `~/.claude/kit-progetti.json` ha `"sincronizzazione": true`, solo a `startup` e `resume`, e solo su progetti riconosciuti dal kit (`core.md` più un profilo dichiarato nel `CLAUDE.md`). Passa a Claude un resoconto e le domande in sospeso, da porre una alla volta; chiede di riaprire la sessione dopo un aggiornamento. Con la sincronizzazione attiva, `prompt-start` non mostra più l'avviso sul template e, dopo un allineamento, non chiede di rileggere le regole appena copiate. Fail-open: un errore non modifica nulla. Le chiamate git hanno un tempo massimo di 10 secondi.
**Dove:** `plugins/kit/scripts/session-start.mjs` (nuovo), `plugins/kit/scripts/lib/avvio.mjs` (nuovo), `plugins/kit/scripts/prompt-start.mjs`, `plugins/kit/scripts/lib/git.mjs`, `plugins/kit/hooks/hooks.json`, `plugins/kit/tests/session-start.test.mjs` (nuovo), `README.md`.
**Verifica:** 9 test dell'hook (spento per default, clear ignorato, startup e resume, repository altrui, template non impostato, modifiche non committate, promemoria dopo l'allineamento, promemoria invariato).
**Note:** la domanda sui moduli nuovi, sui conflitti e sul primo avvio resta da porre: lo fa la skill con #143.

### Branch di lavoro per la sincronizzazione (#141)
**Perché:** la sincronizzazione non deve mai scrivere sopra un lavoro in corso né su `main` o `develop`; il lavoro di regole va su un branch dedicato, senza commit né push automatici.
**Cosa:** regole di `lib/sync.mjs` e `lib/git.mjs`. Con modifiche non committate, su qualunque branch: nessuna modifica (decisione del 2026-11-28). Con HEAD staccata, merge o rebase in corso, o senza `develop` su `main`/`develop`: nessuna modifica. Su `main` o `develop` puliti crea `bugfix/kit-regole-AAAA-MM-GG` da `develop`; se il nome esiste, usa il primo libero (`-2`, `-3`, ...). Senza modifiche da fare non crea alcun branch. Nessun commit, nessun push.
**Dove:** `plugins/kit/scripts/lib/sync.mjs`, `plugins/kit/scripts/lib/git.mjs`, `plugins/kit/tests/sync.test.mjs`.
**Verifica:** test di sincronizzazione 27/27 (nome occupato, HEAD staccata, merge in corso, modifiche su branch di lavoro).

### Motore di sincronizzazione e registro (#140)
**Perché:** la sincronizzazione all'avvio deve calcolare un piano prima di toccare qualunque file, distinguere file non modificati, personalizzati e in conflitto, e non lasciare mai un progetto a metà.
**Cosa:** nuovi `lib/registro.mjs` (registro `.claude/kit-regole.json`: impronte SHA-256, tag, profilo, moduli rifiutati; validazione stretta, nessun percorso locale), `lib/sync.mjs` (`pianifica`: calcola il piano senza scrivere; `applica`: backup in `.claude/kit-backup/`, lock `.claude/kit-regole.lock` con scadenza di 10 minuti, rollback se una scrittura fallisce), `lib/git.mjs` (comandi git di sola lettura, condivisi). Il comando `regole.mjs sincronizza [--dry-run]` mostra o applica il piano. Regole: non modificato e template cambiato → aggiornamento automatico; personalizzato e template invariato → nessuna azione; personalizzato e template cambiato → domanda; non modificato e fuori posto → spostamento; non modificato e rimosso dal template → rimozione; moduli nuovi, file fuori posto modificati e primo avvio → domande (non applicate); sezione «Regole» di `CLAUDE.md` → mai automatica. Su `main` o `develop` con modifiche non committate, o senza `develop`, o in cartella non versionata: nessuna modifica. Su `main` pulito crea `bugfix/kit-regole-AAAA-MM-GG` da `develop`. Decisione dell'utente: un modulo nuovo rifiutato va in `moduli.rifiutati` e non si ripropone. Il motore non è ancora collegato all'avvio di Claude Code (#142).
**Dove:** `plugins/kit/scripts/lib/registro.mjs`, `lib/sync.mjs`, `lib/git.mjs`, `lib/layout.mjs` (nuovi; costanti di layout spostate da `regole.mjs`), `plugins/kit/scripts/lib/release.mjs` (usa `git.mjs`), `plugins/kit/scripts/regole.mjs`, `plugins/kit/tests/sync.test.mjs` (nuovo), `README.md`.
**Verifica:** test del plugin 210/210 (187 esistenti, 23 nuovi: primo avvio, aggiornamento, conflitto, spostamento, rimozione, modulo nuovo e rifiutato, registro ostile, percorsi con `..`, git e branch, lock, rollback, idempotenza, comando da riga di comando, sezione «Regole»).
**Note:** i link simbolici nel progetto sono rifiutati dal codice ma il test non li crea, perché su Windows richiedono permessi. Le domande (conflitti, moduli nuovi, primo avvio) non si pongono ancora: le pone la skill, con #143.

### Lettura delle regole dall'ultimo tag (#139)
**Perché:** la sincronizzazione automatica deve prendere le regole dall'ultimo rilascio del template, non dalla cartella di lavoro, che può avere modifiche non committate o un branch diverso.
**Cosa:** nuova libreria `lib/release.mjs`: sceglie il tag `X.Y.Z` più alto (numerico; ignora `v`, suffissi e tag a due parti), legge `_template/moduli.json` e i file dal tag con `git show`, senza checkout. Senza tag o senza manifest leggibile restituisce il motivo e non legge nulla. Non è ancora collegata a `regole.mjs`: lo farà il motore di sincronizzazione (#140).
**Dove:** `plugins/kit/scripts/lib/release.mjs` (nuovo), `plugins/kit/tests/release.test.mjs` (nuovo), `README.md`.
**Verifica:** test del plugin 187/187 (179 esistenti, 8 nuovi su repository git temporanei: scelta del tag, annotated tag, lettura con disco e branch cambiati, assenza di tag, tag senza manifest, manifest non valido, cartella non git).
**Note:** la lettura usa solo argomenti separati di `execFileSync`, nessuna shell.

### Manifest dei moduli nel template (#138)
**Perché:** l'elenco dei moduli era scritto in quattro costanti di `regole.mjs`: per la sincronizzazione automatica serve una fonte unica, con applicabilità, cartella e versione breve di ogni modulo.
**Cosa:** nuovo `_template/moduli.json` con i 22 moduli (applicabilità, profilo minimo, `soloGit`, `richiedeBackend`, `versioneBreve`, `copiaSempre`, descrizione). `regole.mjs` lo legge in `copia`, `confronta` e `aggiorna` e lo valida (nomi ripetuti, applicabilità o profilo sconosciuti, versioni brevi mancanti: errore, nessuna scrittura). `confronta` aggiunge `descrizioniNuovi` per la domanda sui moduli nuovi; gli altri campi di output non cambiano. I file di root e di riferimento restano nel codice.
**Dove:** `_template/moduli.json` (nuovo), `plugins/kit/scripts/regole.mjs`, `plugins/kit/tests/moduli.test.mjs` (nuovo), `README.md`.
**Verifica:** test del plugin 179/179 (173 esistenti, 6 nuovi su coerenza del manifest, versioni brevi, moduli nuovi e manifest malformato); `regole.test.mjs` e `profili.test.mjs` invariati nei risultati.
**Note:** il manifest va tenuto allineato quando si aggiunge o sposta un modulo: il test di coerenza fallisce altrimenti.

### ADR sulla sincronizzazione automatica delle regole (#137)
**Perché:** l'allineamento delle regole all'avvio scrive file e crea branch in progetti altrui: il disegno e il threat model vanno approvati prima del codice (#135).
**Cosa:** nuovo ADR `0004` in stato «proposta»: avvio con hook `SessionStart` spento per default, origine al tag `X.Y.Z` locale, registro `.claude/kit-regole.json` senza dati personali, conflitti chiesti un file alla volta, copie di salvataggio, branch `bugfix/` su `main` o `develop`, e undici abusi con mitigazione e test. Nessun codice cambia.
**Dove:** `docs/adr/0004-sincronizzazione-automatica-regole.md` (nuovo), `README.md` (nota che l'automatismo non è ancora attivo).
**Verifica:** solo documentazione; nessun codice toccato. Test del plugin da eseguire prima del push.
**Note:** la decisione è da approvare; finché non è accettata l'ADR non autorizza il codice.

## 2026-11-27

### Archivio del CHANGELOG fino al 15 novembre (#123)
**Perché:** il `CHANGELOG.md` pesava circa 300 KB, quasi tutto voci vecchie che si leggono raramente.
**Cosa:** le voci dal 15 novembre 2026 indietro sono in `docs/changelog/2026-11.md` (dal 15 al 1 novembre) e `docs/changelog/2026-10.md` (ottobre), invariate. Il CHANGELOG tiene i giorni dal 17 al 27 novembre (circa 60 KB). La regola per le voci vecchie cambia: ora vanno in `docs/changelog/AAAA-MM.md`, non in fondo al file in un commento HTML (`documentazione.md` v1.3, `_template/rules-standard/documentazione.md` v1.2).
**Dove:** `CHANGELOG.md`, `docs/changelog/2026-11.md` (nuovo), `docs/changelog/2026-10.md` (nuovo), `.claude/rules/documentazione.md`, `_template/rules-standard/documentazione.md`.
**Verifica:** titoli `###` prima 281, dopo 281 (61 + 191 + 29, più questa voce); test del plugin 173/173; `git diff --check` pulito.

### Test del plugin kit eseguiti su GitHub (#121)
**Perché:** i 173 test di `plugins/kit` giravano solo in locale: una modifica rotta al plugin poteva arrivare su `develop` o `main` senza che nessuno se ne accorgesse.
**Cosa:** nuovo workflow `plugin-tests` che lancia `node --test plugins/kit/tests/*.test.mjs` su Node 24, a ogni pull request e a ogni push su `develop` e `main`. Le action sono fissate al commit SHA, come in `_template/ci/ci.yml`, con `permissions: contents: read`.
**Dove:** `.github/workflows/plugin-tests.yml` (nuovo).
**Verifica:** il comando lanciato in locale dà 173/173. Il workflow su GitHub si verifica con la PR di questo cambio.
**Note:** il workflow copre solo i test del plugin; build, lint e audit dei progetti restano nel template `_template/ci/ci.yml`.

### Descrizione del plugin: push e tag con il via dell'utente (#148)
**Perché:** la descrizione di `kit` diceva «push e tag sempre consentiti», in contrasto con `git-flusso.md` (push e tag con il via dell'utente, decisione del 2026-11-26).
**Cosa:** la descrizione dice che push e tag richiedono il via dell'utente e che l'hook blocca solo i comandi distruttivi e il tag fuori da `main`. Nessun cambio di comportamento dell'hook.
**Dove:** `plugins/kit/.claude-plugin/plugin.json`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Rilascio 3.4.0
**Modificato:** le regole di sicurezza frontend (`security-frontend.md`, ora `frontend.md` §9) si caricano sempre sui file frontend, in ogni profilo, anche senza la «sicurezza estesa». Un progetto frontend le riceve per la prima volta: è un cambio di comportamento.
**Sicurezza:** nessuna regola indebolita; le regole frontend ora vincolano anche i progetti che prima non le caricavano.

### Sicurezza frontend nel modulo frontend (passo 7 di #128, fusione facoltativa)
**Perché:** le regole di sicurezza frontend stavano in `security-frontend.md`, che si caricava solo con la «sicurezza estesa». Un progetto frontend senza quella scelta non le vedeva, anche con `innerHTML`, storage e CSP in gioco. Decisione dell'utente: fondere il modulo (analisi di #132, «sarei favorevole»).
**Cosa:** le regole di `security-frontend.md` sono nella sezione 9 di `frontend.md`, che si carica sempre sui file frontend in ogni profilo. `security-frontend.md` non esiste più; i riferimenti in regole, `CLAUDE.md`, `avvio-progetto.md`, hook (`check-write`), skill `sicurezza` e script `regole.mjs` puntano a `frontend.md` §9. Conseguenza: il progetto frontend riceve le regole di sicurezza anche senza la sicurezza estesa, come previsto nell'analisi.
**Dove:** `.claude/rules/frontend.md` (1.18), `.claude/rules/security.md` (3.3), `.claude/rules/security-strutturato.md` (1.6), `CLAUDE.md`, `_template/avvio-progetto.md`, `plugins/kit/scripts/check-write.mjs`, `plugins/kit/scripts/regole.mjs`, `plugins/kit/skills/revisione/temi/sicurezza.md`, `plugins/kit/tests/regole.test.mjs`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Rilascio 3.3.0
**Aggiunto:** modulo opzionale `mobile.md` (regole di base per un'app mobile, da attivare solo se il progetto ha un client mobile); `docs/fonti.md` (date di verifica delle fonti, fuori dal caricamento); sezione «GDPR operativo lato server» in `security-avanzata.md` (inventario, retention, cancellazione, esportazione); procedura del test di contratto OpenAPI; ADR 0003 (migrazioni come passo unico prima delle repliche); servizio `migrate` nella sezione Docker.
**Modificato:** Git in due moduli: `git-flusso.md` (anche PR e rilascio) e `core.md` §5c (regole minime). `git.md` e `git-avanzato.md` non esistono più: `/kit:regole` li rimuove nei progetti che li hanno, con `.bak` e un solo ok. Il profilo `standard` copia quattro moduli brevi. `operativita.md` si carica solo sui file `.github/**`. **Le migrazioni non si applicano più all'avvio di ogni container ma con un passo unico prima delle repliche (ADR 0003): i progetti che le applicavano all'avvio devono cambiare.** I moduli sempre caricati sono più leggeri (profilo `strutturato`: 84 → 82 KiB).
**Corretto:** contraddizioni tra moduli su branch, commit, push e bump; titoli duplicati; rimandi per profilo (nuovo test); file di configurazione e pacchetti nei `paths:`.
**Sicurezza:** nessuna regola indebolita. Aggiunti: GDPR operativo lato server; utente DDL usato solo dal job di migrazione.
**Note:** `/kit:regole` (rimozione dei due file vecchi), il servizio `migrate` del compose e il template CI non sono stati provati su un progetto di prova.

### CI: controlli obbligatori, cache e release (passo 6 di #128, voce 5)
**Perché:** la regola CI diceva «build, test, lint» senza elencare cosa blocca una PR né come si avvia una release; il template `_template/ci/ci.yml` non era collegato alle regole. Decisione dell'utente: opzione 1.
**Cosa:** `operativita.md` §5 elenca i controlli obbligatori per ogni PR (build senza avvisi, test, lint, formattazione, audit), la cache legata al lock file, la pipeline di release con conferma per ogni esecuzione, e `_template/ci/ci.yml` come punto di partenza con le action fissate al commit SHA.
**Dove:** `.claude/rules/operativita.md` (1.4).
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Il template non è stato eseguito su una PR reale: la verifica sulla CI resta da fare in un progetto di prova.

### Test di contratto sullo schema OpenAPI (passo 6 di #128, voce 4)
**Perché:** «lo schema è versionato e la CI fallisce» non diceva come verificarlo: dove sta lo schema, cosa confronta la CI, quali modifiche sono incompatibili.
**Cosa:** lo schema generato dalla build è committato (per esempio in `docs/openapi/`); la CI lo confronta con quello attuale e fallisce su una modifica incompatibile (endpoint o campo rimosso, tipo cambiato, campo obbligatorio aggiunto). Lo strumento di confronto si sceglie per progetto e se ne verifica la licenza. Decisione dell'utente: opzione 1.
**Dove:** `.claude/rules/qualita.md` (1.3), `_template/rules-standard/qualita.md` (1.3).
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Nessuno strumento è stato scelto né provato su un progetto: la scelta resta per progetto.

### GDPR operativo lato server (passo 6 di #128, voce 3)
**Perché:** l'inventario dei dati personali, la retention, la cancellazione e l'esportazione erano una riga, e valeva solo nel profilo `strutturato`. Un dato personale attiva le sue regole in ogni profilo (ADR 0001, regola 3). Decisione dell'utente: opzione 1.
**Cosa:** `security-avanzata.md` ha una sezione «GDPR operativo lato server»: inventario, retention dichiarata nel `CLAUDE.md`, cancellazione o anonimizzazione (anche nei log e con la scadenza dei backup), esportazione all'interessato autenticato. Le basi giuridiche restano al titolare del trattamento. La skill `gdpr-dati` rimanda alla nuova sezione.
**Dove:** `.claude/rules/security-avanzata.md` (2.5), `plugins/kit/skills/revisione/temi/gdpr-dati.md`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Migrazioni come passo unico prima delle repliche (passo 6 di #128, voce 2)
**Perché:** con più repliche, la migrazione all'avvio di ogni container può far girare le migrazioni in parallelo. La documentazione EF Core (lock dal EF Core 9, con provider diversi) consiglia un passo di deploy separato quando contano rollout coordinato e alta disponibilità. Decisione dell'utente: opzione 1, documentata in ADR 0003.
**Cosa:** `backend-app.md` §4.4 dice che le migrazioni si applicano con un passo unico (bundle come job one-shot) prima delle repliche, non da ogni container all'avvio. `docker.md` descrive il servizio `migrate` del compose e la dipendenza di `api` da `migrate`. La stringa di connessione DDL è usata solo dal job. Il lock di EF Core è una protezione in più. La segnalazione su Npgsql 11 non è stata confermata e non è stata usata per la regola.
**Dove:** `.claude/rules/backend-app.md` (1.11), `.claude/rules-optional/docker.md` (1.8), `docs/adr/0003-migrazioni-passo-unico.md` (nuovo).
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Il passo di migrazione in Docker non è stato eseguito su un compose: va verificato in un progetto di prova.

### Migrazioni expand/contract e rollback (passo 6 di #128, voce 1)
**Perché:** durante un rilascio la versione precedente dell'app può girare sullo schema nuovo; senza una regola, una migrazione che rinomina o elimina una colonna rompe il rollback. Approvato dall'utente (priorità alta).
**Cosa:** `backend-app.md` §4.4 ha due punti: migrazioni compatibili con la versione precedente (expand, poi codice, poi contract in un rilascio successivo) e rollback del rilascio (il codice precedente legge lo schema nuovo; una migrazione applicata non si modifica, si annulla con una nuova).
**Dove:** `.claude/rules/backend-app.md` (1.10).
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Riduzione dei moduli caricati: note, duplicati e paragrafi (passo 5 di #128, parte 2)
**Perché:** i moduli sempre caricati contenevano date di lettura delle fonti, ripetizioni della verifica di licenza, voci duplicate (più container, shutdown) e paragrafi molto lunghi, che pesano nel contesto senza servire ogni volta.
**Cosa:** le note di verifica (date e fonti) passano in `docs/fonti.md`, che non si carica; la regola «verifica versione e licenza» è detta una volta in `core.md` §3 e tolta dai moduli backend e sicurezza. «Shutdown» e «Più container» vanno da `osservabilita.md` a `backend.md` §5b, dove ci sono già le regole sui più container; `docker.md` punta lì. Il paragrafo OpenAPI e quello su C# 14 di `backend.md` sono divisi in sotto-punti, senza cambiare le regole. Non cambiate per scelta: la regola inviolabile (in testa a `core.md` e nel punto 5 del §6, più dettagliato) e i punti 20-21 del §6, che rimandano al punto 15.
**Dove:** `docs/fonti.md` (nuovo), `.claude/rules/core.md` (4.5), `.claude/rules/backend.md` (1.15), `.claude/rules/osservabilita.md` (1.2), `.claude/rules/security-avanzata.md` (2.4), `.claude/rules/security-strutturato.md` (1.5), `.claude/rules-optional/docker.md` (1.7).
**Misura** (moduli sempre caricati): `mini` 14,8 → 15,0 KiB (cresce per la regola unica sulla licenza e le regole minime di Git spostate in `core.md` §5c); `standard` 37,6 KiB; `strutturato` 84,0 → 81,9 KiB.
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Regole mobile in un modulo opzionale (passo 5 di #128, parte 1)
**Perché:** la sezione Mobile di `security-strutturato.md` si caricava sempre nel profilo `strutturato`, anche senza un client mobile; circa 2 KiB su un profilo che pesa 84 KiB.
**Cosa:** le regole di base per un'app mobile passano in `.claude/rules-optional/mobile.md`, da attivare solo se il progetto ha un client mobile (`CLAUDE.md`, «Sviluppo mobile»). `security-strutturato.md` perde la sezione e il titolo «mobile». Il modulo è in elenco tra gli opzionali in `CLAUDE.md`, `avvio-progetto.md` e nel codice di `regole.mjs`. Misura (profili con i moduli sempre caricati): `mini` 14,8 KiB, `standard` 37,6 KiB, `strutturato` 84,0 → 82,1 KiB.
**Dove:** `.claude/rules-optional/mobile.md` (nuovo, 1.0), `.claude/rules/security-strutturato.md` (1.4), `plugins/kit/scripts/regole.mjs`, `CLAUDE.md`, `_template/avvio-progetto.md`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito.

### Git in due moduli: flusso e regole minime (passo 4 di #128)
**Perché:** Git stava in tre moduli (`git.md`, `git-flusso.md`, `git-avanzato.md`) e le regole minime, che valgono in ogni profilo, erano in un file che si doveva ricordare di caricare; `git-avanzato.md` era l'estratto di `git-flusso.md` con gli stessi titoli.
**Cosa:** `git-avanzato.md` è unito in `git-flusso.md`, anche nella versione breve per lo standard. Le regole minime di `git.md` sono in `core.md` §5c. `git.md` e `git-avanzato.md` non esistono più: i riferimenti in regole, template, avvio, hook, skill, `CLAUDE.md` e ADR 0001 puntano alla nuova collocazione. Lo standard copia quattro moduli brevi, non cinque. `/kit:regole` dice dove è finito il contenuto dei due file rimossi e li rimuove, con `.bak` e con un solo ok, nei progetti che li hanno.
**Dove:** `.claude/rules/core.md` (4.4), `.claude/rules/git-flusso.md` (1.2), `_template/rules-standard/git-flusso.md` (1.2), `.claude/rules/lavoro.md` (1.6), `.claude/rules/frontend.md` (1.17), `.claude/rules/documentazione.md` (1.2), `.claude/rules/security-strutturato.md` (1.3), `.claude/rules/operativita.md` (1.3), `_template/avvio-progetto.md`, `CLAUDE.md`, `docs/adr/0001-profili.md`, `plugins/kit/scripts/regole.mjs`, `plugins/kit/scripts/guard-commands.mjs`, `plugins/kit/skills/regole/SKILL.md` e le altre skill che citavano i due file, test `regole.test.mjs`, `profili.test.mjs`, `rules-watch.test.mjs`, `refs.test.mjs`, `github.test.mjs`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Nessuna build (solo regole e codice del plugin, testati).

### Moduli caricati su configurazione, pacchetti e CI (passo 3 di #128)
**Perché:** modificando `appsettings.json`, `NuGet.config`, `package.json` o un workflow CI, le regole pertinenti non si caricavano perché i `paths:` coprivano solo i sorgenti; `operativita.md` (CI) si caricava sempre nei profili `standard` e `strutturato`, anche quando non serviva; in un progetto nuovo non ci sono ancora file che attivino i moduli da leggere prima del piano.
**Cosa:** i `paths:` di backend, frontend, contratto, osservabilità, sicurezza e moduli opzionali collegati includono i file di configurazione e dei pacchetti (`appsettings*.json`, `NuGet.config`, `.editorconfig`, `global.json`, `*.sln`/`*.slnx`, `package.json`, `.npmrc`, `.nvmrc`, `eslint.config.*`). `operativita.md` si carica solo sui file `.github/**`. `core.md` (§6) chiede di leggere i moduli delle aree coinvolte prima di scrivere il piano.
**Dove:** `.claude/rules/backend.md` (1.13), `backend-architecture.md` (1.3), `backend-app.md` (1.9), `security-backend.md` (1.7), `osservabilita.md` (1.1), `frontend.md` (1.16), `security-frontend.md` (1.4), `contratto.md` (1.2), `operativita.md` (1.2), `core.md` (4.3), e i moduli opzionali `backend-email.md`, `backend-infra.md`, `feature-workflow.md`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Nessuna build (solo regole).

### Titoli, versioni brevi e rimandi per profilo (passo 2 di #128, parte 2)
**Perché:** due titoli erano duplicati («Dati e Segreti», «Test di sicurezza automatici») e i rimandi per profilo non erano controllati; la versione breve di `qualita` per lo standard mancava di regole presenti nel testo completo (test di contratto, SQLite, isolamento tra utenti, architettura); l'80% di copertura è del profilo `strutturato` (ADR 0001) ma nel testo completo non lo diceva.
**Cosa:** in `security-strutturato.md` la sezione «Dati e Segreti» diventa «Dati e Segreti (dettaglio)»; in `security-avanzata.md` «Test di sicurezza automatici (minimo)» diventa «Test di sicurezza di base»; i rimandi sono aggiornati. La versione breve `qualita.md` per lo standard aggiunge xUnit v3, il test di contratto, la regola sul database nei test, la struttura dei progetti di test, il controllo di isolamento tra utenti e di architettura. Il testo completo dichiara la copertura dell'80% dal profilo `strutturato`. Nuovo test `plugins/kit/tests/profili.test.mjs`: per ogni profilo, un rimando a un modulo non caricato nel profilo deve dichiararlo sulla stessa riga (profilo, «solo», «su richiesta»); `core.md` e `lavoro.md` dichiarano il profilo nei rimandi che non lo indicavano.
**Dove:** `.claude/rules/security-strutturato.md`, `.claude/rules/security-avanzata.md`, `.claude/rules/qualita.md` (versione 1.2), `_template/rules-standard/qualita.md` (versione 1.2), `.claude/rules/core.md` (versione 4.2), `.claude/rules/lavoro.md` (versione 1.5), `plugins/kit/skills/revisione/temi/gdpr-dati.md`, `plugins/kit/skills/revisione/temi/qualita-test.md`, `plugins/kit/skills/revisione/temi/sicurezza.md`, `plugins/kit/tests/profili.test.mjs`.
**Verifica:** test del plugin 173/173; `git diff --check` pulito. Il controllo per profilo accetta una riga che dichiara il profilo: non verifica che la dichiarazione sia corretta nel merito.

### Base di sicurezza nel profilo standard (passo 2 di #128, parte 1)
**Perché:** supply chain, connessione cifrata al database, rotazione dei segreti e dati personali valgono solo nel profilo `strutturato`, ma moduli come `core.md` e `qualita.md` li citavano come se fossero sempre presenti: un progetto `standard` non li avrebbe mai letti. Scelta dell'utente (opzione b): stanno in `security-avanzata.md`, che si carica in `standard` e `strutturato`.
**Cosa:** le sezioni «Supply chain» e «Database, rotazione e dati personali» passano da `security-strutturato.md` a `security-avanzata.md`. I rimandi in regole, avvio, skill, hook, ci e `CLAUDE.md` puntano alla nuova collocazione. `git.md` e `security.md` non si intitolano più «profilo mini», perché valgono sempre. Il commento XML rimanda a `documentazione.md` §5b, e il «§4» di `contratto.md` è `qualita.md` §4.
**Dove:** `.claude/rules/security-avanzata.md` (versione 2.3), `.claude/rules/security-strutturato.md` (versione 1.2), `.claude/rules/core.md`, `.claude/rules/qualita.md` (versione 1.2), `.claude/rules/backend.md` (versione 1.12), `.claude/rules/contratto.md` (versione 1.1), `.claude/rules/git.md` (versione 3.1), `.claude/rules/security.md` (versione 3.2), `.claude/rules-optional/backend-email.md`, `_template/avvio-progetto.md`, `_template/ci/ci.yml`, `plugins/kit/scripts/guard-write.mjs`, `plugins/kit/skills/revisione/temi/gdpr-dati.md`, `plugins/kit/skills/verifica/frontend.md`, `CLAUDE.md`.
**Verifica:** test del plugin 170/170; `git diff --check` pulito. Restano aperti in #130: versioni brevi divergenti (B.4) e test dei rimandi per profilo (B.5).

### Contraddizioni tra moduli di regole (passo 1 di #128)
**Perché:** alcune regole si contraddicevano tra moduli: branch e commit chiesti all'utente in `feature-workflow.md` e `avvio-progetto.md`, ma creati senza conferma in `git-flusso.md`; il commit di bump richiesto in `git-avanzato.md` ma non come negli altri commit; obblighi dei profili in disaccordo tra ADR 0001 e moduli; `contratto.md` dato come sempre presente anche in modalità solo Git.
**Cosa:** branch di lavoro e commit creati senza conferma, push e tag con il via dell'utente, in `feature-workflow.md` e `avvio-progetto.md`. Il commit di bump richiede l'ok dell'utente, come da `git-avanzato.md`. Le caselle di `PIANO.md` diventano sub-issue chiuse in `workflow.md` (§6.21) e `git-avanzato.md`. Gli obblighi del profilo `strutturato` (utenti del database separati) valgono solo da quel profilo, come da ADR 0001, in `backend-app.md` §4.4. `contratto.md` si carica solo sui file backend e frontend, non in solo Git. Nell'ADR 0001 i commenti XML sono in italiano.
**Dove:** `.claude/rules-optional/feature-workflow.md`, `_template/avvio-progetto.md`, `.claude/rules/git-avanzato.md` (versione 1.2), `.claude/rules/workflow.md`, `.claude/rules/backend-app.md` (versione 1.8), `docs/adr/0001-profili.md`.
**Verifica:** test del plugin 170/170; `git diff --check` pulito. Nessuna build (solo testo).
### Rilascio 3.2.0
**Aggiunto:** script `regole.mjs` per copia, confronto, aggiornamento, spostamento e rimozione dei file di regole (con `.bak` prima di ogni sostituzione); skill `/kit:regole` e `/kit:verifica` che seguono il profilo dichiarato nel `CLAUDE.md`; `checklist-mini.md` per il profilo `mini`; test `regole.test.mjs` e `refs.test.mjs` (copia per profilo e rimandi tra regole, skill e script).
**Modificato:** il profilo `standard` non richiede più il threat model (vedi ADR 0001 e `security-strutturato.md`). I progetti già avviati restano sul profilo dichiarato nel loro `CLAUDE.md`.
**Corretto:** rimandi incoerenti tra moduli di regole e nei messaggi degli hook (nomi di modulo e di sezione aggiornati al testo attuale).
**Note:** `/kit:regole` e `/kit:verifica` non sono state provate su un progetto di prova.

### Push e tag restano con il via dell'utente
**Perché:** le voci del 2026-11-08 («Push, tag, PR e rilasci consentiti sempre» e «Tag e pubblicazione del rilascio senza approvazione per progetto») descrivevano una riscrittura di `git.md` §Integrazione GitHub che non risulta nelle regole attuali: `git-flusso.md` e `git.md` dicono ancora che push, PR, tag e rilasci vanno eseguiti con il via dell'utente. Su decisione dell'utente (2026-11-26) vale il testo attuale: push e tag restano con il via dell'utente.
**Cosa:** nessuna regola cambiata. Le voci del 2026-11-08 su push e tag sono superate e non vanno seguite; la riga «GitHub CLI (gh) installata» per PR e rilasci resta com'è.
**Dove:** `CHANGELOG.md`.
**Verifica:** nessun file di regole toccato; nessun codice toccato.
**Note:** il comportamento del hook `guard-commands` su push e tag non è stato verificato in questo intervento.

### Test sui rimandi tra regole, skill, script e documentazione
**Perché:** le sezioni spostate lasciavano rimandi sbagliati che nessun controllo intercettava.
**Cosa:** nuovo test che controlla i rimandi «file.md §N» e «file.md «Titolo»», i percorsi `scripts/*.mjs` e i nomi `/kit:` delle skill. Corretti i rimandi trovati: `core.md` §9, che non esiste, diventa `core.md` §6.9; un commento di `session-close.mjs` puntava ancora a `core.md` §0b invece che a `qualita.md`. `documentazione.md`, completo e breve, passa alla versione 1.1.
**Dove:** `plugins/kit/tests/refs.test.mjs`, `.claude/rules/documentazione.md`, `.claude/rules/frontend.md`, `.claude/rules/qualita.md`, `_template/rules-standard/documentazione.md`, `plugins/kit/scripts/session-close.mjs`.
**Verifica:** test del plugin 170/170, compresi i casi con errori inseriti di proposito; `git diff --check` pulito.
**Note:** il test non controlla i rimandi senza il nome del file; per i titoli basta che un titolo o un testo in grassetto del file citato contenga il testo. Non gira ancora su GitHub.

### Script per le operazioni sui file di /kit:regole
**Perché:** copie, spostamenti, aggiornamenti e cancellazioni per profilo erano descritti a parole e affidati a Claude.
**Cosa:** il nuovo script `regole.mjs` copia, confronta, aggiorna, sposta e rimuove i file di regole. Salva una copia `.bak` prima di sostituire o cancellare, non sposta un file sopra un altro e rifiuta i percorsi fuori dai file di regole e di consultazione. A Claude restano domande, conferme, conflitti e l'allineamento del `CLAUDE.md` durante l'aggiornamento. Nella prima copia il `CLAUDE.md` mancante si copia senza chiedere; dopo l'anteprima (`--dry-run`) la copia parte senza altre conferme.
**Dove:** `plugins/kit/scripts/regole.mjs`, `plugins/kit/tests/regole.test.mjs`, `plugins/kit/skills/regole/SKILL.md`, `README.md`.
**Verifica:** 14 test nuovi; test del plugin verdi (166/166 a fine passo); prova dello script in una cartella temporanea con profilo standard fullstack, senza file diversi, rimossi, fuori posto o obbligatori mancanti.
**Note:** la skill non è stata eseguita.

### Avvio di un progetto in un percorso unico
**Perché:** servivano `/kit:avvia-progetto`, `/kit:regole` e la frase «Applica le regole di questo progetto».
**Cosa:** `/kit:avvia-progetto` fa le domande, copia le regole senza ripeterle e compila il `CLAUDE.md`, sezione «Regole» compresa; usa il modello `sonnet`. `backend-email.md` e `backend-infra.md` non si chiedono all'avvio. La conferma del riepilogo vale per tutto l'avvio, senza ok a ogni punto. Con il profilo `mini` il piano di avvio resta in chat: non servono issue né il repository remoto su GitHub.
**Dove:** `plugins/kit/skills/avvia-progetto/SKILL.md`, `_template/avvio-progetto.md`, `.claude/rules/workflow.md`, `README.md`, `docs/skill.md`.
**Verifica:** test del plugin 166/166, `git diff --check` pulito.
**Note:** né la skill né la procedura sono state eseguite.

### commit-passo apre le issue solo per le serie di almeno tre commit
**Perché:** la skill apriva una issue padre e una sub-issue per commit anche nel profilo `mini` o per un solo commit.
**Cosa:** se il lavoro ha già una issue padre, a fine serie la commenta con hash e oggetto dei commit; altrimenti apre le issue solo fuori da `mini`, con almeno tre commit e con `gh` disponibile; negli altri casi il piano resta in chat.
**Dove:** `plugins/kit/skills/commit-passo/SKILL.md`, `.claude/rules/git-flusso.md`, `.claude/rules/git-avanzato.md`, `_template/rules-standard/git-flusso.md`, `README.md`, `docs/skill.md`.
**Verifica:** test del plugin 152/152, `git diff --check` pulito.
**Note:** la skill non è stata eseguita.

### security.md si copia in ogni profilo
**Perché:** l'avvio permetteva di escludere `security.md`, ma segreti e security review valgono anche nel profilo `mini`, la cui checklist rimanda a quel file.
**Cosa:** `security.md` si copia sempre, tranne in modalità solo Git. La domanda facoltativa riguarda solo le regole di sicurezza estese; in aggiornamento `/kit:regole` propone `security.md` se manca.
**Dove:** `_template/avvio-progetto.md`, `plugins/kit/skills/regole/SKILL.md`, `.claude/rules/frontend.md`, `CLAUDE.md`.
**Verifica:** test del plugin 152/152, `git diff --check` pulito.
**Note:** né `/kit:regole` né la procedura di avvio sono state eseguite.

### Promemoria sul piano solo dove le regole lo chiedono
**Perché:** il promemoria a ogni prompt chiedeva la issue padre anche nel profilo `mini`, per le modifiche piccole e nei progetti senza il kit.
**Cosa:** il richiamo a piano e issue compare solo nei progetti con il kit e con profilo diverso da `mini` (senza un profilo leggibile vale `strutturato`) e precisa che riguarda il lavoro non piccolo. Il richiamo alla domanda unica resta.
**Dove:** `plugins/kit/scripts/prompt-start.mjs`, `plugins/kit/scripts/lib/text.mjs`, `plugins/kit/tests/prompt-start.test.mjs`, `README.md`.
**Verifica:** 3 test nuovi, visti fallire prima della modifica; test del plugin 152/152; hook provato da una sottocartella del repository.

### La pulizia dopo il merge di pr-main si può lanciare
**Perché:** al rilancio la skill terminava per mancanza di commit nuovi e non raggiungeva la pulizia dei branch.
**Cosa:** nuovo argomento `pulizia` (`/kit:pr-main pulizia`): non apre una PR, individua la PR sorgente con `gh` e si ferma senza cancellare nulla se non risulta mergiata.
**Dove:** `plugins/kit/skills/pr-main/SKILL.md`, `.claude/rules/git-avanzato.md`, `_template/rules-standard/git-avanzato.md`, `README.md`, `docs/skill.md`.
**Verifica:** test del plugin verdi (170/170 al controllo finale), `git diff --check` pulito.
**Note:** la skill non è stata eseguita.

### Ordine delle domande di avvio e moduli aggiornati
**Perché:** il profilo si chiedeva prima di sapere se il progetto è solo Git, e la panoramica dei moduli era superata.
**Cosa:** la domanda «solo Git» viene prima di quella sul profilo, con la numerazione invariata; panoramica allineata al `CLAUDE.md`, `lavoro.md` aggiunto alla tabella dei moduli e corretto l'elenco della variante solo Git.
**Dove:** `_template/avvio-progetto.md`, `plugins/kit/skills/avvia-progetto/SKILL.md`.
**Verifica:** test del plugin 149/149, `git diff --check` pulito.
**Note:** la procedura non è stata eseguita.

### verifica controlla anche il frontend nei progetti fullstack
**Perché:** i controlli del frontend partivano solo se la cartella indicata era un frontend Angular.
**Cosa:** con un argomento la skill controlla quella cartella; senza argomento decidono i file toccati, anche nei commit del branch. Nei progetti fullstack esegue backend e poi frontend, con un esito unico. L'argomento è `[cartella]`.
**Dove:** `plugins/kit/skills/verifica/SKILL.md`, `README.md`, `docs/skill.md`.
**Verifica:** test del plugin 149/149, `git diff --check` pulito.
**Note:** la skill non è stata eseguita.

### buongiorno riconosce la issue padre con le sub-issue tutte chiuse
**Perché:** la skill considerava padre solo una issue con sub-issue aperte, diversamente da `/kit:buonasera`.
**Cosa:** vale come padre anche una issue aperta con le sub-issue tutte chiuse, dopo quelle con sub-issue aperte; la skill indica come leggerle, tiene valido il commento più recente e, senza punti da fare, chiede se chiudere la padre.
**Dove:** `plugins/kit/skills/buongiorno/SKILL.md`, `README.md`, `docs/skill.md`.
**Verifica:** test del plugin 149/149, `git diff --check` pulito, comando di lettura delle sub-issue provato su un repository reale.
**Note:** la skill non è stata eseguita.

### Rimandi superati e refusi
**Perché:** dopo lo spostamento di alcune sezioni restavano rimandi ai vecchi file, e la documentazione aveva due imprecisioni.
**Cosa:** i rimandi a checklist e test puntano a `qualita.md`; i messaggi di `guard-commands` indicano `git-flusso.md` o `git-avanzato.md` dove sta la sezione; corretta la descrizione di `/kit:verifica` e tolto un doppione di `/kit:regole` nel README.
**Dove:** `.claude/rules/`, `plugins/kit/scripts/`, `docs/skill.md`, `README.md`.
**Verifica:** test del plugin 149/149, `git diff --check` pulito.

## 2026-11-24

### Rilascio 3.1.0
**Aggiunto:** ADR 0002 (`docs/adr/0002-commenti-in-italiano.md`): commenti di codice in italiano per default, identificatori e messaggi di commit in inglese.
**Modificato:** commenti di codice in italiano per default, anche XML `<summary>`, in `core.md` §9, `documentazione.md` §5b, `qualita.md` §0b, la sezione test di `frontend.md` e le versioni brevi in `_template/rules-standard/`. Nessun cambio incompatibile: il cambio riguarda le regole di stile, non il codice.
**Corretto:** nessuno.
**Sicurezza:** nessuna regola di sicurezza modificata.

### Documentazione allineata: commenti in italiano (passi 7 e 8 di #88)
**Perché:** `README.md` diceva che codice e identificatori sono in inglese, senza distinguere i commenti; nella wiki (`C:/DEV/wiki`) due pagine ripetevano la stessa cosa e rimandavano a `core.md` §6, dove la regola di lingua non è più (ora §9).
**Cosa:** `README.md` (riga sulla lingua): commenti di codice in italiano per default, identificatori e messaggi di commit in inglese. Nella wiki, `docs/claude-config/intro.md` (stessa riga) e `docs/claude-config/manutenzione.md` (riferimento a `core.md` §9). Nessun'altra pagina della wiki parla della lingua dei commenti.
**Dove:** `README.md`; wiki: `docs/claude-config/intro.md`, `docs/claude-config/manutenzione.md` (repository separato, non committato).
**Verifica:** ricerca testuale su `README.md` e sulla wiki (`docs/`, `src/`): nessun'altra occorrenza della regola di lingua dei commenti. Nessuna build o test lanciato: modifiche solo a testo. La wiki ha un proprio `CHANGELOG.md` che non è stato toccato, perché le sue voci riguardano la wiki stessa.

### ADR 0002: commenti in italiano, supera due righe dell'ADR 0001 (passo 6 di #88)
**Perché:** l'ADR 0001 accettato diceva «commenti XML in inglese» e «codice e commit in inglese»; per non riscriverne la storia, la decisione sul default italiano è registrata in un ADR nuovo (#88, opzione B).
**Cosa:** nuovo `docs/adr/0002-commenti-in-italiano.md` (accettata): commenti di codice in italiano per default, identificatori e commit in inglese, deroga solo su richiesta esplicita. L'ADR 0001 non cambia.
**Dove:** `docs/adr/0002-commenti-in-italiano.md`, `CHANGELOG.md`.
**Verifica:** lettura del file e confronto con le righe 20 e 30 dell'ADR 0001. Nessun codice toccato, nessun test lanciato.

### Template standard: commenti in italiano (passo 5 di #88)
**Perché:** le versioni brevi di `documentazione.md` e `qualita.md` nel profilo `standard` dicevano «commenti in inglese», come le regole complete (#88).
**Cosa:** commenti XML e gli altri commenti di codice in italiano per default, identificatori in inglese, deroga solo su richiesta esplicita; la voce della checklist diventa italiana.
**Dove:** `_template/rules-standard/documentazione.md`, `_template/rules-standard/qualita.md`.
**Verifica:** ricerca testuale su `_template` e `.claude/rules-optional`: nessuna regola sui commenti che dica ancora «in inglese». Restano da decidere il passo 6 (`docs/adr/0001-profili.md`, riga 30) e la riga 20 dello stesso ADR, che parla di «codice e commit in inglese» e che verrà valutata con il passo 6. Nessun codice toccato, nessun test lanciato.

### Test frontend: commenti in italiano (passo 4 di #88)
**Perché:** la sezione test di `frontend.md` diceva «commenti in inglese», in contrasto con il default italiano di `core.md` §9 (#88).
**Cosa:** la frase diventa «commenti in italiano (default, `core.md` §9)»; i nomi dei test restano descrittivi.
**Dove:** `.claude/rules/frontend.md` (sezione test, riga «Isolamento e determinismo»).
**Verifica:** ricerca testuale sul file: la frase sui commenti non dice più «in inglese». Nessun codice toccato, nessun test lanciato.

### Checklist: commenti in italiano (passo 3 di #88)
**Perché:** la voce di `qualita.md` §0b chiedeva commenti XML in inglese, in contrasto con il default italiano di `core.md` §9 (#88).
**Cosa:** la voce diventa «commenti XML in italiano su tutti i tipi e i membri pubblici, e gli altri commenti di codice in italiano, salvo richiesta diversa».
**Dove:** `.claude/rules/qualita.md` §0b.
**Verifica:** ricerca testuale sul file: nessuna occorrenza residua di «inglese» riferita ai commenti. Nessun codice toccato, nessun test lanciato.

### Commenti XML in italiano (passo 2 di #88)
**Perché:** `documentazione.md` §5b diceva «commenti XML in inglese»; con il default italiano per ogni commento (#88) la regola del file doveva allinearsi a `core.md` §9.
**Cosa:** commenti XML `<summary>` in italiano per default; tutti gli altri commenti di codice in italiano, identificatori in inglese, deroga solo su richiesta esplicita.
**Dove:** `.claude/rules/documentazione.md` §5b.
**Verifica:** ricerca testuale sul file: resta solo la voce «Lingua dei documenti», che riguarda README e CHANGELOG e non i commenti. Nessun codice toccato, nessun test lanciato.

### Commenti di codice in italiano di default (passo 1 di #88)
**Perché:** la regola diceva «commenti in inglese», anche per i commenti XML; la richiesta dell'utente è il default italiano per ogni commento, salvo richiesta esplicita diversa (#88).
**Cosa:** `core.md` §9: identificatori in inglese, commenti di codice in italiano per default (anche `<summary>`), deroga solo su richiesta esplicita. Le voci sui commenti in `documentazione.md`, `qualita.md`, `frontend.md`, `_template` e l'ADR 0001 si aggiornano nei passi successivi di #88.
**Dove:** `.claude/rules/core.md`, `CHANGELOG.md`.
**Verifica:** ricerca testuale sulle regole: il default inglese per i commenti resta in `documentazione.md`, `qualita.md`, `frontend.md`, `_template` e `docs/adr/0001-profili.md`, da aggiornare nei passi 2-6. Nessun test di codice toccato.

## 2026-11-23

### Rilascio 3.0.0
**Aggiunto:** profili `mini`, `standard` e `strutturato` con regole per profilo (`mini` sotto 15 KB sempre caricati, `standard` sotto 40 KB); versioni brevi dello `standard` in `_template/rules-standard/`; moduli `contratto.md`, `operativita.md`, `documentazione.md`, `git-flusso.md` e `security-strutturato.md`.
**Modificato:** **breaking change:** `/kit:consegna` è ora `/kit:verifica`; `/kit:copia-regole` e `/kit:aggiorna-regole` sono ora `/kit:regole`. La domanda sul profilo è la prima dell'avvio. Le regole minime stanno in `core.md` (v4.0), `git.md` (v3.0) e `security.md` (v3.0); il dettaglio è nei moduli indicati e, per lo `standard`, in `rules-optional/dettaglio/`.
**Corretto:** le descrizioni di plugin e marketplace elencavano comandi non più esistenti (#82).
**Sicurezza:** nessuna regola di sicurezza è stata tolta: le sezioni sono state spostate tra moduli, e per lo `standard` il testo completo resta leggibile in `rules-optional/dettaglio/`.

### Skill fuse da dodici a dieci (passo 5 di #83)
**Perché:** `consegna` e `verifica` erano due controlli prima della chiusura; `copia-regole` e `aggiorna-regole` facevano la stessa cosa in due casi. Le descrizioni del plugin elencavano ancora ventidue nomi, di cui molti non più esistenti (#82).
**Cosa:** `consegna` diventa la sezione 0 di `verifica` (checklist di consegna, poi i controlli). `copia-regole` e `aggiorna-regole` diventano `regole`, con il caso A (copia) e il caso B (aggiornamento). `modelli` resta nel plugin: il hook `session-close` dipende da lui.
**Breaking change:** `/kit:consegna` è ora `/kit:verifica`; `/kit:copia-regole` e `/kit:aggiorna-regole` sono ora `/kit:regole`.
**Dove:** `plugins/kit/skills/verifica/SKILL.md`, `plugins/kit/skills/regole/SKILL.md` (nuova), rimosse `plugins/kit/skills/consegna/`, `copia-regole/` e `aggiorna-regole/`; `plugins/kit/.claude-plugin/plugin.json` e `.claude-plugin/marketplace.json` (descrizione con i dieci comandi); `docs/skill.md`, `README.md`, `_template/avvio-progetto.md`, `plugins/kit/skills/avvia-progetto/SKILL.md`, `plugins/kit/tests/skills-layout.test.mjs` (conteggio 10).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Le skill fuse non sono state lanciate su un progetto di prova.
**Note:** la wiki (`C:/DEV/wiki`) non è stata toccata: va aggiornata con conferma. La versione del plugin non cambia in questo passo (passo 6).

### Avvio: il profilo si chiede per primo, mini salta l'ORM
**Perché:** il profilo decide i default e quali domande servono, ma era l'ultima domanda (la 10); con `mini` l'avvio chiedeva ancora l'ORM, che ha già il default (passo 4 di #83).
**Cosa:** la domanda sul profilo diventa la 0, posta per prima; la 10 rimanda alla 0 (i numeri restano). Con `mini` non si chiede l'ORM (EF Core, default). Nel piano dei moduli (§3) il profilo `standard` sostituisce i cinque moduli con versione breve e copia il testo completo in `rules-optional/dettaglio/`. La skill `avvia-progetto` segue la domanda 0 per prima.
**Dove:** `_template/avvio-progetto.md`, `plugins/kit/skills/avvia-progetto/SKILL.md`, `CHANGELOG.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Avvio non ancora eseguito su un progetto di prova.
**Note:** `copia-regole` e `aggiorna-regole` erano già allineati al profilo nel passo precedente.

### Profilo standard sotto 40 KB: versioni brevi di cinque moduli
**Perché:** lo `standard` caricava circa 73 KB di regole; la ADR 0001 fissa il target a 40 KB (#83, opzione A confermata).
**Cosa:** nuova cartella `_template/rules-standard/` con versioni brevi di `git-flusso.md`, `git-avanzato.md`, `workflow.md`, `qualita.md` e `documentazione.md`. Per il profilo `standard`, `copia-regole` copia la versione breve in `.claude/rules/` e il testo completo in `.claude/rules-optional/dettaglio/` (non caricato, leggibile su richiesta). Il profilo `strutturato` resta con il testo completo. `aggiorna-regole`, `avvio-progetto` e il `CLAUDE.md` del template descrivono il nuovo meccanismo.
**Dove:** `_template/rules-standard/` (nuovi cinque file), `plugins/kit/skills/copia-regole/SKILL.md`, `plugins/kit/skills/aggiorna-regole/SKILL.md`, `_template/avvio-progetto.md`, `CLAUDE.md`, `CHANGELOG.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Profilo `standard` sempre caricato: 38.567 byte (≤ 40 KB), misurato sui file della composizione prevista. Profilo `mini`: 14.036 byte.
**Note:** la copia reale in un progetto di prova non è ancora stata eseguita: la skill `copia-regole` va lanciata su una cartella di prova per verificarla.

### Profilo standard ridotto: sicurezza strutturata in un modulo a parte
**Perché:** lo `standard` caricava circa 88,5 KB di regole; spostare le sezioni che la tabella dell'ADR assegna solo allo `strutturato` lo riduce senza togliere regole agli altri profili (scelta B di #83).
**Cosa:** nuovo `security-strutturato.md` con ASVS, supply chain, scansione dinamica, mobile, test di sicurezza automatici (tranne la riga sugli input malevoli, che resta nello `standard`) e dettaglio di dati e segreti. `security-avanzata.md` (v2.0) tiene progettazione sicura, crittografia, input malevoli e regola operativa. Nei profili `standard` e `mini` `security-strutturato.md` va in `.claude/rules-optional/`. Liste di copia, template e riferimenti aggiornati.
**Dove:** `.claude/rules/security-strutturato.md` (nuovo), `.claude/rules/security-avanzata.md`, `.claude/rules/security.md`, `plugins/kit/skills/copia-regole/SKILL.md`, `plugins/kit/skills/aggiorna-regole/SKILL.md`, `_template/avvio-progetto.md`, `_template/ci/ci.yml`, `plugins/kit/skills/revisione/temi/gdpr-dati.md`, `plugins/kit/skills/verifica/frontend.md`, `CLAUDE.md`, `docs/adr/0001-profili.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Profilo `standard` sempre caricato: 73.371 byte (era 88.539). Profilo `mini`: 14.036 byte.
**Note:** il target dello `standard` (40 KB) non è raggiunto. Per arrivarci servirebbe condensare i moduli standard (opzione A di #83), con il dettaglio in `rules-optional/` da leggere su richiesta.

### Profilo mini sotto 15 KB: core, git e sicurezza divisi per profilo
**Perché:** il profilo `mini` caricava circa 50 KB di regole in ogni sessione; la ADR 0001 fissa il target a 15 KB per `mini` (#83, passo 3).
**Cosa:** `core.md` (v4.0) ridotto a regole minime: Regola inviolabile, §0, §3 e i punti 5, 7, 8, 9, 11, 14 del §6, più il changelog minimo (§5b) e la mappa dei moduli. Nuovi moduli con la stessa numerazione: `contratto.md` (§1 e §2, solo sui file backend e frontend), `operativita.md` (§5 e §5a), `documentazione.md` (§5b), `git-flusso.md` (sezioni di `git.md` non minime). `git.md` (v3.0) diventa la versione minima. `security.md` (v3.0) ha solo segreti e log minimi; il resto è in `security-avanzata.md`. I punti 15, 16, 19, 21, 22 del §6 passano a `workflow.md`. Liste di copia aggiornate in `copia-regole`, `aggiorna-regole` e `_template/avvio-progetto.md`.
**Dove:** `.claude/rules/` (`core.md`, `git.md`, `security.md`, `security-avanzata.md`, `workflow.md`, `lavoro.md`, nuovi `contratto.md`, `operativita.md`, `documentazione.md`, `git-flusso.md`), `plugins/kit/skills/copia-regole/SKILL.md`, `plugins/kit/skills/aggiorna-regole/SKILL.md`, `_template/avvio-progetto.md`, `CLAUDE.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Profilo `mini` sempre caricato: 13.983 byte (≤ 15 KB). Profilo `standard` sempre caricato: circa 86 KB, sopra il target di 40 KB della ADR, da rivedere.
**Note:** `CLAUDE.md` del template: il paragrafo «Regole» ora descrive i moduli e il loro caricamento per profilo, e i riferimenti alle sezioni spostate puntano al modulo giusto. Il target dello `standard` (40 KB) resta aperto (vedi la voce successiva).

### Voci aperte del passo 3: riferimenti, ADR e CLAUDE.md
**Perché:** chiusura del passo 3 di #83: riferimenti alle sezioni spostate ancora sbagliati, mappa della ADR senza due obblighi concordati, paragrafo «Regole» del `CLAUDE.md` non aggiornato ai nuovi moduli.
**Cosa:** riferimenti corretti in `core.md`, `workflow.md`, `qualita.md`, `CLAUDE.md`, `_template/avvio-progetto.md`, `_template/ci/ci.yml`, `plugins/kit/skills/verifica/frontend.md`, `plugins/kit/skills/revisione/temi/gdpr-dati.md`. Nella ADR aggiunti quattro obblighi: dipendenze dichiarate (`core.md` §6.8, mini), condizioni di sicurezza per auth, upload e dati personali (mini, si attiva con la funzionalità), chiavi IT/EN (standard), test di architettura (strutturato, solo Clean). Il paragrafo «Regole» del `CLAUDE.md` ora elenca i moduli per profilo.
**Dove:** `docs/adr/0001-profili.md`, `.claude/rules/core.md`, `.claude/rules/workflow.md`, `.claude/rules/qualita.md`, `CLAUDE.md`, `_template/avvio-progetto.md`, `_template/ci/ci.yml`, `plugins/kit/skills/verifica/frontend.md`, `plugins/kit/skills/revisione/temi/gdpr-dati.md`, `CHANGELOG.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149. Profilo `mini` sempre caricato: 13.997 byte. Profilo `standard` sempre caricato: 88.539 byte.
**Note:** il target dello `standard` (40 KB) non è raggiunto; la scelta (ridurre i moduli standard o alzare il target) è aperta.

### ADR dei profili accettata e mappa obbligo → profilo
**Perché:** le decisioni aperte di #83 sono chiuse (approccio a profili, deroga per le scelte a basso rischio, fusione delle skill, compatibilità dei progetti già avviati); la proposta di `0001-profili.md` non era ancora accettata.
**Cosa:** ADR accettata; aggiunte le decisioni di compatibilità (progetti già avviati su `strutturato`) e di basso rischio; i riferimenti a `PIANO.md` e `CHECKLIST.md` sostituiti con le issue (`core.md` §6.15 e §6.22).
**Dove:** `docs/adr/0001-profili.md`, `CHANGELOG.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 149/149.
**Note:** passo 2 di #83. La mappa va verificata con l'utente prima del passo 3 (spezzare `core.md`).

## 2026-11-22

### Rilascio 2.0.1
**Corretto:** `copia-regole` scrive nel `CLAUDE.md` il profilo scelto nel campo «Profilo» (issue #73, PR #75 e #77).

### Profilo salvato da `copia-regole`
**Perché:** la risposta sul profilo restava nel riepilogo e il campo «Profilo» del `CLAUDE.md` non veniva scritto quando il progetto non passava da `avvia-progetto` (issue #73).
**Cosa:** `copia-regole` scrive il campo «Profilo» del `CLAUDE.md` con il profilo scelto (nel caso «No»); se il campo è già dichiarato non lo cambia. Se il `CLAUDE.md` esiste, si tocca solo quella riga.
**Dove:** `plugins/kit/skills/copia-regole/SKILL.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`. La skill non è stata rilanciata su una cartella di prova dopo la modifica.
### Rilascio 2.0.0
**Aggiunto:** profili `mini`, `standard` e `strutturato` dichiarati nel `CLAUDE.md`, con i default del profilo `mini`; `/kit:revisione <tema>`; moduli `workflow.md`, `qualita.md`, `git-avanzato.md`, `security-avanzata.md`; piani e problemi in issue GitHub (issue padre e sub-issue) al posto di `PIANO.md` e `CHECKLIST.md`.
**Modificato:** `core.md` (v3.53) più leggero, con i moduli caricati solo quando servono; `gh` autorizzato per issue, sub-issue, PR e rilasci, con il via dell'utente per PR, push, tag e rilasci; `avvio-progetto`, `copia-regole` e `aggiorna-regole` chiedono e rispettano il profilo.
**Corretto:** la cancellazione dei branch di lavoro avviene solo dopo la verifica dello stato `MERGED` della PR.
**Sicurezza:** nessuna modifica alle regole di sicurezza; `security.md` diviso in `security.md` e `security-avanzata.md`, senza testo perso.
**Breaking change:** rimossi o rinominati `/kit:sicurezza`, `/kit:gdpr-dati`, `/kit:verifica-frontend`, `/kit:aggiorna-docs`, `/kit:accessi-api`, `/kit:dati-efcore`, `/kit:accessibilita-ui`, `/kit:colori-tema`, `/kit:localizzazione`, `/kit:qualita-test`, `/kit:review-regole`. Usare `/kit:revisione <tema>` e `/kit:verifica`.

### Skill accorpate: da 22 a 12
**Perché:** molte skill di revisione ripetevano regole e `/code-review` o `/security-review`; ventidue comandi erano troppi da ricordare.
**Cosa:** le nove revisioni tematiche (`accessi-api`, `dati-efcore`, `gdpr-dati`, `accessibilita-ui`, `colori-tema`, `localizzazione`, `qualita-test`, `review-regole`, `sicurezza`) diventano `/kit:revisione <tema>` con una procedura per tema in `revisione/temi/`; `verifica-frontend` entra in `verifica` (`frontend.md`); `aggiorna-docs` entra in `buonasera` (`documentazione.md`). `modelli` resta invariato: ha un registro che `session-close` usa.
**Dove:** `plugins/kit/skills/`, `docs/skill.md`, `README.md`, `plugins/kit/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.claude/rules/core.md` (v3.53: il rimando alla wiki non cita più `aggiorna-docs`).
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 146/146. Le skill non sono state lanciate su un progetto di prova.
**Note:** `/kit:sicurezza`, `/kit:gdpr-dati` e simili ora sono `/kit:revisione <tema>`; `/kit:verifica-frontend` è `/kit:verifica` su un frontend Angular.

### Profili nelle procedure di avvio, copia e aggiornamento
**Perché:** le procedure non conoscevano ancora il profilo né i quattro moduli nuovi (`workflow.md`, `qualita.md`, `git-avanzato.md`, `security-avanzata.md`); la modalità solo Git perdeva le regole del piano e delle PR a cui `git.md` rimanda.
**Cosa:** domanda 10 (profilo) in `avvio-progetto.md` §1, con il suo effetto sui moduli; tabella dei moduli e nota solo Git aggiornate; `copia-regole` chiede il profilo nel caso «No» e copia `git-avanzato.md` e `workflow.md` in solo Git; `aggiorna-regole` propone i moduli nuovi e controlla il posto nel profilo `mini`, senza spostare nulla senza ok.
**Dove:** `_template/avvio-progetto.md`, `plugins/kit/skills/copia-regole/SKILL.md`, `plugins/kit/skills/aggiorna-regole/SKILL.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 146/146. Le skill non sono state lanciate su un progetto di prova.
**Note:** in solo Git si copiano anche `workflow.md` e `git-avanzato.md` (scelta del kit, reversibile).

### Default del profilo `mini` nel `CLAUDE.md`
**Perché:** il profilo `mini` deve evitare decine di domande di avvio; l'utente ha approvato i default per le voci reversibili.
**Cosa:** riga «Default del profilo `mini`» in «Progetto» del `CLAUDE.md`; eccezione alla regola «chiedi» in `core.md` §6.5 (v3.52).
**Dove:** `CLAUDE.md`, `.claude/rules/core.md`.
**Verifica:** `node --test plugins/kit/tests/*.test.mjs`, 146/146.
**Note:** il profilo `mini` pesa circa 67 KB di file sempre caricati; il limite di 15 KB del piano è stato abbandonato per decisione dell'utente.

### Sicurezza avanzata in `security-avanzata.md`

**Perché:** `security.md` (21 KB) si caricava in ogni sessione. Per uno script o un tool interno bastano i principi che valgono sempre (segreti, log senza dati personali, security review quando serve); ASVS, progettazione, crittografia, mobile, supply chain, DAST e test automatici servono ai progetti standard e strutturati.

**Cosa:** nuovo `.claude/rules/security-avanzata.md` con le sezioni «Mappa ASVS 5.0 e livelli», «Progettazione sicura e fail closed», «Crittografia», «Mobile (sezione minima)», «Supply chain», «Scansione dinamica, segnalazioni e risposta agli incidenti» e «Test di sicurezza automatici», con gli stessi titoli. `security.md` v2.6 tiene «Dati e Segreti» e «Regola operativa». `core.md` v3.51 e `CLAUDE.md` elencano il nuovo modulo; profilo `mini`: `security-avanzata.md` in `rules-optional/`.

**Dove:** `.claude/rules/security-avanzata.md` (nuovo), `.claude/rules/security.md`, `.claude/rules/core.md`, `CLAUDE.md`, `plugins/kit/skills/copia-regole/SKILL.md`.

**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi. Nessuna riga persa: confronto riga per riga con la versione precedente. Misura: `security.md` da 21,5 a 5,9 KB; `security-avanzata.md` 16,4 KB.

**Note:** `CLAUDE.md` template (16,5 KB) è il prossimo peso fisso del profilo `mini`: i campi «chiesto, non presunto» vanno ridotti con i default per profilo (passo 3, dopo questo lavoro).

### Pull request, rilascio e skill in `git-avanzato.md`

**Perché:** `git.md` (26 KB) si caricava in ogni sessione, anche per uno script che non apre PR né rilasci. Le sezioni su pull request, rilascio, skill del plugin ed esempio servono solo ai progetti con remoto e flusso di rilascio (standard e strutturato).

**Cosa:** nuovo `.claude/rules/git-avanzato.md` con le sezioni «Pull Request», «Rilascio», «Skill del plugin `kit` per commit e PR» ed «Esempio di riferimento», con gli stessi titoli. `git.md` v2.1 mantiene integrazione GitHub, branch, Conventional Commits, granularità, commit multipli, repository e hook, cosa non entra mai, sicurezza della cronologia, con un puntatore alle sezioni spostate. Profilo `mini`: `git-avanzato.md` in `rules-optional/`. `core.md` v3.50 elenca il nuovo modulo. `CLAUDE.md` e `copia-regole` aggiornati.

**Dove:** `.claude/rules/git-avanzato.md` (nuovo), `.claude/rules/git.md`, `.claude/rules/core.md`, `CLAUDE.md`, `plugins/kit/skills/copia-regole/SKILL.md`.

**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi. Nessuna riga persa: confronto riga per riga con la versione precedente. Misura: `git.md` da 26,2 a 17,8 KB; `git-avanzato.md` 9,0 KB.

**Note:** `git.md` resta sopra i 17 KB perché contiene l'integrazione GitHub e i branch, che servono a ogni progetto. `security.md` (21 KB) è la prossima decisione.

### Checklist e test in `qualita.md`

**Perché:** nel profilo `mini` (script, tool interno, prototipo) `core.md` caricava ancora circa 29 KB, con la checklist di consegna e le regole di test, che per uno script senza test pesano poco.

**Cosa:** nuovo `.claude/rules/qualita.md` con §0b (checklist di consegna) e §4 (test e qualità) di `core.md`, con la stessa numerazione. `core.md` v3.49 mantiene un puntatore. Il profilo `mini` sposta `qualita.md` in `rules-optional/`, insieme a `workflow.md`. `CLAUDE.md` e `copia-regole` aggiornati.

**Dove:** `.claude/rules/qualita.md` (nuovo), `.claude/rules/core.md`, `CLAUDE.md`, `plugins/kit/skills/copia-regole/SKILL.md`.

**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi. Nessuna riga di §0b e §4 persa: confronto riga per riga. Misura: `core.md` da 29,1 a 22,1 KB.

**Note:** i messaggi dei hook che citano «core.md §4» o «§0b» restano validi grazie al puntatore. `core.md` profilo `mini` ora pesa circa 22 KB, contro il bersaglio di 15 KB: le sezioni rimaste da valutare sono §3, §1–§2 e §5b (documentazione).

### Workflow esteso in `workflow.md`

**Perché:** §6 di `core.md` pesava 12,5 KB, e circa 6 KB riguardano scelte di codice e di architettura che non servono a ogni passo. Si separa il minimo (regola inviolabile, verifica, git, piano, sessione, fine attività, problemi) dal resto.

**Cosa:** nuovo `.claude/rules/workflow.md` con i punti 1–4, 6, 10, 12, 13, 17, 18, 20, 23 e la parte 15b (piano già scritto), con la stessa numerazione di §6, così i riferimenti «§6.N» restano validi. `core.md` v3.48 mantiene la regola inviolabile e i punti 5, 7, 8, 9, 11, 14, 15a, 15c, 15d, 16, 19, 21, 22, con un puntatore al workflow. `CLAUDE.md`: campo «Profilo» (default `strutturato`; `mini` sposta `workflow.md` in `rules-optional/`). `copia-regole` applica la regola del profilo.

**Dove:** `.claude/rules/workflow.md` (nuovo), `.claude/rules/core.md`, `CLAUDE.md`, `plugins/kit/skills/copia-regole/SKILL.md`.

**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi. Nessuna riga di §6 persa: confronto riga per riga con la versione precedente. Misura: `core.md` da 34,1 a 29,1 KB; `workflow.md` 5,6 KB.

**Note:** nel profilo `mini` `core.md` pesa ancora circa 29 KB, sopra il bersaglio di 15 KB del piano. Le sezioni da spostare sono §0b (3,3 KB), §4 (3,9 KB), §3 (2,2 KB) e §1–§2: da valutare nel passo successivo. `aggiorna-regole` non sa ancora di `workflow.md` (passo 4).

### Logging e osservabilità in un modulo a parte

**Perché:** `core.md` si carica in ogni sessione, anche per uno script senza backend; il logging, lo shutdown e lo stack di osservabilità servono solo ai progetti con backend o Docker.

**Cosa:** nuovo `.claude/rules/osservabilita.md` (`paths:` su `.cs`, `.csproj`, `.props`, Dockerfile, compose e `observability/`), con il contenuto di `core.md` §5 sul logging, shutdown, più container, OpenTelemetry e stack. `core.md` v3.47: §5 diventa «Operatività e CI» (restano CI/CD e Git). Riferimenti aggiornati in `backend.md`, `frontend.md`, `security.md`, `docker.md`, `CLAUDE.md`, template di avvio, ADR 0001, skill `copia-regole`, `aggiorna-regole`, `gdpr-dati` e nel commento di `check-write.mjs`.

**Dove:** `.claude/rules/core.md`, `.claude/rules/osservabilita.md` (nuovo), `.claude/rules/backend.md`, `.claude/rules/frontend.md`, `.claude/rules/security.md`, `.claude/rules-optional/docker.md`, `CLAUDE.md`, `_template/avvio-progetto.md`, `docs/adr/0001-profili.md`, `plugins/kit/scripts/check-write.mjs`, `plugins/kit/skills/copia-regole/SKILL.md`, `plugins/kit/skills/aggiorna-regole/SKILL.md`, `plugins/kit/skills/gdpr-dati/SKILL.md`.

**Verifica:** `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi. Misura: `core.md` da 37,4 KB a 34,1 KB sempre caricati; `osservabilita.md` (4,1 KB) solo sui file backend e Docker.

**Note:** §5b (documentazione) resta in `core.md`: va applicato a ogni passo che cambia codice. La sezione più pesante è §6 (12,5 KB): da valutare a parte.

### Rilascio 1.17.0

**Modificato:** piani e problemi in issue GitHub al posto di `PIANO.md` e `CHECKLIST.md`; `gh` esteso a issue, sub-issue e commit autonomi, con PR, push, tag e rilasci al via dell'utente; gestione del repository vietata a Claude; cancellazione dei branch di lavoro solo dopo verifica della PR `MERGED`.

**Aggiunto:** ADR 0001 con la mappa obbligo → profilo minimo.

**Corretto:** nessuna correzione in questo rilascio.

### Piani e problemi in issue, `gh` esteso

**Perché:** `PIANO.md` e `CHECKLIST.md` vivevano nel repository e si disallineavano dal lavoro reale. Ogni progetto ha un repository remoto su GitHub, quindi il piano è una issue padre con le sub-issue come passi, e i problemi sono issue. `gh` può ora fare il lavoro corrente (issue, sub-issue, commit, PR, tag, rilasci, branch) senza chiedere per ogni operazione, con il confine della gestione del repository, che resta all'utente.

**Cosa:** `git.md` v2.0 (ambito di `gh`, cancellazione dei branch dopo verifica `MERGED`, un commit alla volta senza ok). `core.md` v3.46 (§0b, §5c, §6.15, §6.16, §6.20, §6.22: piano e problemi in issue). Hook: rimossi `check-plan` e `plan-reminder`; `guard-commands` gate per `gh issue`, blocco di `gh pr merge`, `gh repo` in scrittura, `gh secret`, `gh variable`, `gh ruleset` e `gh api` in scrittura su impostazioni. Skill: `buongiorno`, `buonasera`, `commit-passo`, `pr-main`, `avvia-progetto`, `consegna`, `copia-regole`, `pr-develop`. Eliminato `_template/CHECKLIST.md`.

**Dove:** `.claude/rules/git.md`, `.claude/rules/core.md`, `.claude/rules/lavoro.md`, `.claude/rules/frontend.md`, `.claude/rules/backend-architecture.md`, `.claude/rules-optional/feature-workflow.md`, `_template/avvio-progetto.md`, `CLAUDE.md`, `plugins/kit/scripts/` (`check-write`, `session-close`, `prompt-start`, `guard-commands`), `plugins/kit/skills/`, `plugins/kit/tests/`, `plugins/kit/.claude-plugin/plugin.json`, `README.md`, `docs/skill.md`.

**Verifica:** nessuna build (regole e script del plugin). `node --test plugins/kit/tests/*.test.mjs`: 146/146 verdi.

**Note:** la versione del plugin non è stata alzata: sarà una decisione separata. I progetti già avviati con `PIANO.md` lo migrano in issue quando `buonasera` lo chiede. `gh pr merge` è ora bloccato sempre, perché il merge resta all'utente.

### Mappa obbligo → profilo minimo (ADR 0001)

**Perché:** le regole sono pensate per un progetto grande e applicate uguali a uno script interno, con circa 105 KB caricati in ogni sessione. Serve dichiarare il profilo del progetto e applicare solo gli obblighi che servono.

**Cosa:** nuovo `docs/adr/0001-profili.md` con i tre profili (mini, standard, strutturato), la regola «il profilo fissa il minimo, la funzionalità fa scattare l'obbligo» e la tabella obbligo → profilo minimo. Stato: proposta, in attesa della decisione sulla deroga alla regola inviolabile.

**Dove:** `docs/adr/0001-profili.md` (nuovo). Nessuna regola modificata in questo passo.

**Verifica:** documento, nessuna build. `node --test plugins/kit/tests/*.test.mjs`: 148/148 verdi.

**Note:** il passo 3 del piano spezzerà `core.md` e userà questa tabella. Il campo `Profilo:` nel `CLAUDE.md` non è ancora stato aggiunto.

## 2026-11-17

### Unit test per livello in Clean Architecture

**Perché:** un unico progetto di unit test non impone le dipendenze tra i livelli: un test che referenzia l'`Infrastructure` dal `Domain` compila lo stesso. Un progetto per livello rende la regola verificabile dalla compilazione. Il progetto `PersonalIdp` lo ha adottato per primo, e la scelta va ora nel template, così ogni progetto non deve ricordarla.

**Cosa:** `core.md` §4 (3.44 → 3.45): struttura `[Solution].UnitTests.<Livello>` in Clean, `[Solution].UnitTests.Architecture` per i test di architettura, `[Solution].UnitTests.Shared` per fake e builder condivisi solo se servono a più livelli, unico `[Solution].UnitTests` in Vertical Slice. `backend-app.md` §4.5 (1.5 → 1.6): riferimento alla nuova struttura. `backend-architecture.md` §2b (1.0 → 1.1): i test di architettura vanno nel progetto `.Architecture` invece che nel progetto di unit test generico.

**Dove:** `.claude/rules/core.md`, `.claude/rules/backend-app.md`, `.claude/rules/backend-architecture.md`.

**Verifica:** documento di regole, nessuna build. Riferimenti incrociati riletti (§4, §4.5 e §2b).

**Note:** il `CLAUDE.md` di ogni progetto che importa queste regole va aggiornato con la nuova versione di `core.md` (`/kit:aggiorna-regole`). Il nome `[Solution].UnitTests.Architecture` è una scelta di questo passo, da confermare.
