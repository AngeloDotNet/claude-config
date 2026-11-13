# Comandi del plugin `kit`

Riepilogo delle ventuno skill del plugin, che si lanciano digitando `/kit:` seguito dal nome. Le skill che scrivono, committano, pubblicano o cancellano hanno `disable-model-invocation` e non partono mai da sole: `aggiorna-docs`, `aggiorna-regole`, `avvia-progetto`, `buonasera`, `commit-passo`, `copia-regole` e `pr-main`. Le altre quattordici (revisioni e controlli in sola lettura, più `/kit:pr-develop`, proposta da `/kit:commit-passo` dopo il sì dell'utente) possono essere lanciate anche da Claude; le loro descrizioni compaiono nell'elenco di ogni sessione. Nessun comando ha opzioni con nome (`--flag`): quando c'è, l'argomento è uno solo e facoltativo, e se manca la skill lo chiede o usa il lavoro corrente.

Ogni skill dichiara nel frontmatter il campo `model`: `haiku` per `avvia-progetto`, `copia-regole`, `verifica`, `verifica-frontend` e `buongiorno` (procedure brevi e meccaniche); `sonnet` per le altre sedici, comprese `pr-main`, `commit-passo`, `aggiorna-regole` (cancellano o sovrascrivono file e branch) e `colori-tema` (calcola i contrasti). Il modello vale solo per il turno in cui la skill parte: se la skill pone una domanda, dopo la risposta si torna al modello della sessione.

| Comando | Cosa fa | Argomento (facoltativo) |
|---|---|---|
| `/kit:buongiorno` | Riprende il lavoro dal piano e dalla checklist (`PIANO.md`, `CHECKLIST.md`), riassume dove si è arrivati e propone il primo passo. | Nessuno |
| `/kit:buonasera` | Salva lo stato dei lavori in `PIANO.md` e i nuovi problemi in `CHECKLIST.md`; aggiorna senza conferma `README.md`, `CHANGELOG.md` e la wiki (se presente); propone di cancellare i file non più utili (solo con conferma) e ricorda `/compact`. | Nessuno |
| `/kit:avvia-progetto` | Avvia un progetto nuovo: domande di avvio una per messaggio e compilazione del `CLAUDE.md`. | `[nome-progetto]`: nome del progetto |
| `/kit:copia-regole` | Copia le regole del template in un progetto che non le ha, con i moduli scelti in conversazione. | `[cartella-progetto]`: cartella di destinazione; se manca usa la cartella corrente quando è valida, altrimenti la chiede |
| `/kit:aggiorna-regole` | Confronta le regole di un progetto con il template; ogni file diverso si sovrascrive solo con conferma. I moduli rimossi dal template si cancellano (con `.bak`) dopo un solo ok, e le righe del `CLAUDE.md` legate alle regole (sezione «Regole», versione copiata, moduli rimossi) si allineano con conferma. Nel dubbio una domanda alla volta. | `[cartella-progetto]`: progetto da aggiornare; se manca la chiede |
| `/kit:consegna` | Controlla il lavoro corrente contro la checklist di consegna (`core.md` §0b) e segnala le voci mancanti. | Nessuno |
| `/kit:review-regole` | Revisione del codice contro le regole del progetto, in sola lettura. | `[percorso-o-branch]`: percorso o branch da rivedere; se manca usa il lavoro corrente |
| `/kit:commit-passo` | Crea i commit locali in sequenza e senza conferme intermedie (il lancio è il via libera), mai su `main` o `develop` (crea il branch di lavoro); piano in `piano-commit.md`; non richiede la GitHub CLI. | nessuno |
| `/kit:pr-develop` | Apre con `gh` la PR dal branch di lavoro (`feature/*`, `bugfix/*`) verso `develop`; richiede la GitHub CLI installata e autenticata. | Nessuno |
| `/kit:pr-main` | Apre con `gh` la PR da `develop` (o `release/*`, `hotfix/*`) verso il branch principale; dopo il merge (da te confermato) pulisce i branch di lavoro che confermi e allinea `main` e `develop`; richiede la GitHub CLI installata e autenticata. | `[branch-sorgente]`: branch di partenza; se manca, il branch corrente se è `release/*` o `hotfix/*`, altrimenti `develop` |
| `/kit:aggiorna-docs` | Aggiorna `README.md`, `CHANGELOG.md` e, se esiste, il sito di documentazione. | `[cartella-progetto]`: progetto da aggiornare |
| `/kit:verifica` | Esegue i controlli di una soluzione .NET (ripristino, formattazione, build senza avvisi, test, pacchetti vulnerabili, modello EF, compose, spazi bianchi) senza modificare file. | `[cartella-soluzione]`: cartella con il `.sln`; se manca cerca nella radice del repository |
| `/kit:verifica-frontend` | Esegue i controlli di un frontend Angular (installazione, lint, formattazione, test con copertura, build, audit npm, `any`, colori fissi, traduzioni) senza modificare file. | `[cartella-frontend]`: cartella con il `package.json`; se manca la ricava dal `CLAUDE.md` o cerca nel repository |
| `/kit:sicurezza` | Controlla le voci di sicurezza della consegna sul lavoro corrente (threat model, test con input ostili, fail closed, abuso di risorse, log e alert, `SECURITY.md`), lancia `/security-review` e unisce i risultati, senza modificare file. | `[percorso-o-branch]`: ambito da esaminare; se manca usa il lavoro corrente |
| `/kit:qualita-test` | Revisiona i test (falsa sicurezza, fragilità, duplicati) e propone test xUnit parametrici. | `[cartella-o-file]`: ambito dei test |
| `/kit:dati-efcore` | Revisiona e guida il lavoro con EF Core (letture senza tracking, migrazioni, `DbContext`, query); propone, non modifica file. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:accessi-api` | Revisiona e guida autenticazione e autorizzazione di un'API ASP.NET Core; propone, non modifica file. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:gdpr-dati` | Revisiona il backend rispetto ai principi GDPR; non è consulenza legale. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:accessibilita-ui` | Revisiona l'accessibilità dell'interfaccia rispetto a WCAG 2.2 e propone le correzioni, senza modificare file. | `[cartella-o-componente]`: parte dell'interfaccia da esaminare |
| `/kit:colori-tema` | Costruisce o verifica la palette per i temi chiaro e scuro, con il contrasto misurato. | `[cartella-progetto]`: progetto da esaminare |
| `/kit:localizzazione` | Verifica il layout per testi tradotti più lunghi, RTL, ordine di lettura e zoom. | `[cartella-progetto]`: progetto da esaminare |

Dettagli di ogni comando: [README](../README.md) e pagina [Plugin](http://wiki.aepserver.it/claude-config/plugin) della wiki.
