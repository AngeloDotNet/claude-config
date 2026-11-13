# CLAUDE.md — [NOME PROGETTO]

<!--
Copia questo file nella radice del progetto come `CLAUDE.md` e compila i campi tra [parentesi].
I moduli delle regole stanno in `.claude/rules/` e Claude Code li carica da solo, senza import: `core`, `lavoro`, `git` e `security` all'avvio; `frontend`, `security-frontend`, `backend`, `security-backend` e `docker` solo quando si legge o modifica un file corrispondente (`paths:` nell'intestazione). I moduli opzionali stanno in `.claude/rules-optional/` (non si caricano): `feature-workflow` (solo fullstack e solo se confermato all'avvio, domanda 8), `backend-email` e `backend-infra` (non all'avvio: si attivano spostandoli in `.claude/rules/` quando servono invio email o messaggistica/cache/eventi).
Il modulo non scelto all'avvio si sposta in `.claude/rules-optional/` (es. `frontend.md` in un progetto solo API), poi si compilano i campi tra [parentesi].
In modalità "solo Git" (progetto esistente) restano solo le sezioni "Regole", "Progetto", "Git" ed "Eccezioni alle regole globali", con i moduli `core` e `git`.
Questo file PREVALE sulle regole globali in caso di conflitto. Tienilo breve: solo ciò che è specifico del progetto.
-->

## Regola inviolabile (prevale su tutto, sempre attiva)
Nel dubbio Claude **non decide in autonomia**: pone **una sola domanda alla volta** e **attende la risposta**. Il testo completo, con le eccezioni, è in `core.md` (sezione in testa e §6, punto 5), che prevale su questo riepilogo solo per i dettagli.

## Regole
I moduli sono in `.claude/rules/` e Claude Code li carica da solo: `core.md`, `lavoro.md`, `git.md` e `security.md` all'avvio; `frontend.md` (`**/*.{ts,html,css,scss}`, `angular.json`, `tsconfig*.json`), `backend.md`, `backend-architecture.md` e `backend-app.md` (tutti e tre `**/*.{cs,csproj,props}`) `security-backend.md` (come i moduli backend, `**/*.{cs,csproj,props}`), `security-frontend.md` (come `frontend.md`) e `docker.md` (Dockerfile, `docker-compose*`/`compose*` `.yml`/`.yaml`, `.dockerignore`, `docker/**`) quando si legge o modifica un file corrispondente (`paths:` nell'intestazione). I moduli opzionali stanno in `.claude/rules-optional/` (non si caricano): si attivano spostandoli in `.claude/rules/` e annotandolo qui; hanno già il loro `paths:` (backend per `backend-email.md` e `backend-infra.md`, backend e frontend per `feature-workflow.md`), quindi attivati si caricano solo sui file corrispondenti. Per verificare cosa è caricato: `/context`. Non aggiungere altri `.md` in `.claude/rules/` se non sono regole: vengono caricati tutti.

- **Versione delle regole copiate:** `core.md` v[x.y] del [data]
- **Moduli rimossi o non attivati (fuori ambito):** [nessuno | security | docker | frontend | backend | feature-workflow | backend-email | backend-infra]

## Progetto
- **Scopo:** [una frase: cosa fa l'applicazione e per chi]
- **Tipo:** [fullstack | solo API | solo frontend | solo Git (progetto esistente)]
- **Stato:** [nuovo progetto | esistente] — se esistente, NON migrare a zoneless né ristrutturare senza chiedere.

## Scelte architetturali (decise una volta per progetto)
- **Architettura backend:** [Vertical Slice | Clean Architecture] (chiesta una volta per progetto; in un progetto esistente rilevata dal codice e confermata)
- **Livelli Clean Architecture (se Clean):** [Domain, Application, Infrastructure, Api | nomi diversi come deroga: .. (rinomina pianificata in `PIANO.md`: sì/no)]
- **Entità di riferimento (solo se si usa `feature-workflow.md`):** [nessuna ancora | `NomeEntità`] — spunto di configurazione per le nuove entità, **non un modello da clonare**: se ne riprendono le convenzioni (interfaccia/classe base per l'id, audit, soft delete, tenant, configurazione EF, forma di DTO/endpoint/UI), non campi né regole di business; vedi `feature-workflow.md` §1.
- **Modello del dominio (se Clean):** [anemico per i CRUD (default) | ricco: entità/aggregati: ..] (valutato a ogni progetto, non presunto; vedi `backend-architecture.md` §2b)
- **Repository (Clean e Vertical Slice):** [no (default) | sì: per aggregato o generico `IRepository<T>`, motivo, ambito] (valutato a ogni progetto, non presunto; vedi `backend-architecture.md` §2b e §2c)
- **Specification pattern:** [no (default: metodi di estensione su `IQueryable<T>`) | sì: motivo, ambito] (valutato a ogni progetto, non presunto; vedi `backend-architecture.md` §2c)
- **Gestione errori/risultati:** OperationResults (Marco Minerva) — scelta fissa; la variante AppEngine è sospesa fino a nuova modifica delle regole (vedi `backend.md` §1)
- **Validazione backend:** [FluentValidation (default, preferita alle Data Annotation) | deroga: .. (motivo)]
- **Esposizione del documento OpenAPI:** [solo build (nessun endpoint) | solo Development | anche produzione: protezione ..] (chiesto ogni volta, non presunto; la UI Swagger resta solo in Development)
- **Tecnologia frontend:** [Angular | Blazor (nessun modulo di regole: da creare)] (chiesto, non presunto)
- **Sviluppo mobile:** [no | PWA | Ionic + Capacitor | .NET MAUI | Flutter | React Native | altro: ..] (chiesto, non presunto)
- **ORM:** [EF Core (default) | Dapper | EF Core + Dapper per: ..] (chiesto, non presunto; Dapper si valuta ogni volta)
- **Database:** [SQL Server | PostgreSQL] — versione [..] (chiesto, non presunto)
- **Database nei test:** [nessuno | progetto `IntegrationTests` con database reale di prova (stesso motore, istanza: ..., un database per esecuzione) | SQLite] (chiesto, non presunto)
- **Mock EF nei test unitari:** [no (default) | sì: mock di `DbContext` e `DbSet` solo per la logica che non tocca il `DbContext`; i servizi che lo usano restano sul database reale] (chiesto, non presunto; vedi `backend-app.md` §4.5)
- **Multi-tenancy:** [no | sì, per colonna `TenantId` con global query filter]
- **Soft delete:** [no | sì]
- **Sicurezza backend:** [da chiedere a Claude | nessuna (endpoint pubblici) | ASP.NET Core Identity | Keycloak o altro IdP self-hosted gratuito]
- **Livello ASVS:** [1 | 2 | 3] (chiesto, non presunto; vedi `security.md`)
- **Indirizzo pubblico e host ammessi:** `App:PublicBaseUrl` [dominio pubblico], `AllowedHosts` [elenco] (chiesto, non presunto; valori reali da variabile d'ambiente; vedi `security-backend.md`, «Host header e URL assoluti»)
- **Utenti del database:** applicativo (senza DDL) e utente separato per le migrazioni (`ConnectionStrings:Migrations`), valori solo da variabili d'ambiente valorizzate da `.env`, elencati in `.env.example`; connessione cifrata [Encrypt=True | SslMode=VerifyFull], CA fidata [..] (chiesto, non presunto; vedi `backend-app.md` §4.4)
- **Upload di file:** [non previsto | previsto: tipi ammessi, limiti, antivirus/disarmo dei contenuti sì/no] (chiesto, non presunto; vedi `security-backend.md`, «Upload e parsing di file»)
- **Eccezioni a `npm ci --ignore-scripts`:** [nessuna | pacchetto: motivo e script lanciato a parte] (vedi `security.md`, «Supply chain»)
- **Limiti e rate limiting:** `pageSize` predefinito e massimo [20 / 100 | ..], limiti per IP e per utente [..], timeout database e HTTP [..] (concordati, non presunti; vedi `security-backend.md`, «Abuso di risorse»)
- **Allerta sugli eventi di sicurezza:** [solo log strutturati, controllati da: .. | alert su Grafana/Prometheus, canale: ..]; retention dei log di audit [..] (concordata, non presunta; vedi `security.md`, «Log di sicurezza e allerta»)
- **DAST (OWASP ZAP baseline):** [no | sì, in CI su istanza di prova] (opzionale; vedi `security.md`, «Scansione dinamica, segnalazioni e risposta agli incidenti»); `SECURITY.md` e `docs/runbook-sicurezza.md` [presenti | da creare]
- **CSP della SPA statica:** [hash alla build con `autoCsp` (default) | nonce inserito dal server | deroga: ..] (vedi `security-backend.md`, «Protezione dell'API»)
- **Token JWT (se Identity e solo API):** [no | sì — ciclo di vita: solo creazione e verifica | anche rinnovo | anche rinnovo e revoca; algoritmo, durata access token]
- **Granularità (se Identity):** [solo autenticazione | ruoli | policy/claim | permessi granulari] — extra: [registrazione, conferma email, reset password, MFA, login esterni, lockout, multi-tenancy, UI amministrativa]
- **Sessione SPA (se c'è un frontend con autenticazione):** [cookie HttpOnly | BFF]
- **Cache:** [nessuna | FusionCache solo L1 (preferita) | memory cache nativa `IMemoryCache` | con L2 Redis (istanza singola, volume e sola password) o altra configurazione avanzata: ..] (chiesto ogni volta, non presunto; L2 e configurazioni complesse valutati di volta in volta; vedi `backend-infra.md`)
- **File storage:** [non usato | da chiedere a Claude | disco su volume Docker | MinIO | altro self-hosted]
- **Invio email:** [non previsto | MailKit (confermato) | altra libreria: ..] — sezione `Smtp` in appsettings, valori reali solo da variabili d'ambiente valorizzate da `.env`
- **Messaggistica:** [non usata | RabbitMQ]
- **Job in background:** [non usati | BackgroundService | hosted service | Coravel] — tipo di job: [ricorrente | a richiesta | avvio/arresto | ..] (chiesto, non presunto) — retry: [no | sì: tentativi, backoff] (chiesto, non presunto)
- **Disaccoppiamento invio email:** [n/a | RabbitMQ | job in background (vedi sopra)]
- **Outbox/retry email:** [n/a | nessuno | solo retry | outbox + retry: tentativi, backoff] (chiesto, non presunto)
- **Logging:** provider dietro `ILogger` [nessuno | Serilog | provider standard .NET | OpenTelemetry | combinazione: ..] (concordato, non presunto); se Serilog: sink [console | file | database | OTLP | ..], formato [template testuale | JSON | ..], livelli minimi [..], rotazione/retention file [..] (concordati, non presunti)
- **SMTP di prova (test/sviluppo):** [nessuno | Mailpit (default per i test che richiedono un mail server; istanza già presente nell'infrastruttura, host/porta forniti dall'utente) | altro: ..]
- **Preferenze utente (tema, fuso orario, consenso cookie):** [profilo a database | altra sede: .. (chiesta, non presunta)]
- **Lingue supportate:** [it, en] — lingua di default: [it]
- **Temi disponibili:** [light, dark, ...]
- **Tailwind:** [non usato | usato]
- **SSR / PWA:** [no | sì: motivo]
- **Browser supportati:** [default delle regole globali | diverso: ...]

## Nomi e struttura
- **Solution:** `[Azienda.Progetto].sln`
- **Namespace radice:** `[Azienda.Progetto]`
- **Cartelle:** backend in `[src/Api]`, frontend in `[src/web]`
- **File di configurazione .NET:** `.editorconfig` e `NuGet.config` valgono solo per il backend .NET e sono nella root del template; se il progetto non ha backend .NET (solo frontend) vanno rimossi. `NuGet.config` [tenuto | rimosso | deroga: ..], `.editorconfig` [tenuto | rimosso | deroga: ..] (chiesto, non presunto). Per il frontend non c'è un file nel template: lint e formattazione si decidono nel progetto Angular.
- **Prefisso selettori Angular:** `[app]`
- **Naming file Angular:** componenti con suffisso `.component` e file separati `.ts`/`.html`/`.css`/`.spec.ts`, senza template o stili inline (regola fissa di `frontend.md` §2; qui solo un'eventuale deroga motivata: ..)
- **Micro frontend:** [no (default) | sì: motivo (team/rilasci indipendenti), Native Federation, ADR: ..] (chiesto, non presunto; vedi `frontend.md` §12)

## Comandi
| Azione | Comando |
|---|---|
| Avvio ambiente locale (Redis, RabbitMQ; il DB è preesistente) | `docker compose up -d` |
| Build backend | `dotnet build` |
| Test backend | `dotnet test` |
| Avvio backend | `dotnet run --project [src/Api]` |
| Installazione frontend | `npm ci` |
| Avvio frontend | `npm start` |
| Lint frontend | `npm run lint` |
| Test unitari frontend | `npm test` |
| Test E2E | `npx playwright test` |
| Generazione client API | `[comando NSwag / OpenAPI Generator]` |
| Nuova migrazione EF | `dotnet ef migrations add [Nome] --project [..] --startup-project [..]` |

## Operatività
- **Deploy:** sempre Dockerfile + docker-compose (regole in `docker.md`). Server gestiti dall'utente.
- **Ambienti:** [dev + prod | dev + staging + prod] — file compose: base, `override` (dev), `prod`
- **Reverse proxy / TLS:** nginx preconfigurato sul server, gestito dall'utente (nessuna configurazione nginx generata da Claude) [note]
- **Porta applicazione nel container:** [8080]
- **Database:** preesistente sul server (SQL Server o PostgreSQL), mai nel compose; host/porta/rete forniti dall'utente
- **Servizi nel compose:** [Redis, RabbitMQ, ...] (mai database né reverse proxy)
- **Osservabilità:** [nessuna | stack OpenTelemetry + Prometheus/Jaeger/Grafana (`docker-compose.observability.yml`) | altro: ..] (concordata, non presunta; i log seguono la voce "Logging")
- **Backup:** [da valutare in ogni progetto: servizio `db-backup` generato (dump pianificato (default) | PITR con pgBackRest) | già coperto sul server, nessun servizio generato] — frequenza [..], pianificazione e copia fuori host a cura dell'utente
- **RPO / RTO e retention backup:** [..]
- **Scadenza/rotazione segreti:** [..]
- **Soglie di performance diverse dal default:** [nessuna | ...]

## Git
- **Modello branch (git flow):** git flow completo con `develop`, obbligatorio in ogni progetto (`feature`/`bugfix`/`release` da `develop`, `hotfix` da `main`; vedi `git.md`) — Claude crea da solo il branch di lavoro quando serve, senza chiederti conferma; se `develop` manca, chiede se crearlo
- **Branch principale:** [main]
- **Strategia di merge:** come da `git.md` (squash verso `develop`, merge commit per ogni PR che coinvolge `main`)
- **Ticket nei branch/commit:** [no | sì, formato `ABC-123`]
- **Scope Conventional Commits ammessi:** [liberi | elenco: ..]
- **File della versione e changelog:** [`Directory.Build.props` + `CHANGELOG.md` | ...] — `CHANGELOG.md` e `README.md` si aggiornano a ogni step del piano (`core.md` §5b)
- **Lingua della documentazione (README.md, CHANGELOG.md):** [italiano | inglese | altro: ..] (chiesta, non presunta)
- **Fine riga:** [`.gitattributes` con `* text=auto` | altro: .. | nessuno: motivo] (valutato caso per caso, non presunto)
- **Hook pre-commit:** [nessuno | husky + lint-staged | `.githooks/`] — attivazione a cura dell'utente
- **Push, PR, tag, release ed esecuzione delle pipeline:** come da `git.md` («Integrazione GitHub»); PR e rilasci con `gh` solo se installata (riga in «Eccezioni alle regole globali»).
- **Attribuzione Claude nei commit:** [no | trailer Co-Authored-By]

## Eccezioni alle regole globali
<!-- Ogni deroga va motivata. Se vuota, vale tutto il resto. -->
- [nessuna]
<!-- GitHub CLI: riga fissa letta dal hook guard-commands (git.md, «Integrazione GitHub»). Si scrive con la risposta dell'utente alla domanda unica per progetto, aggiungendo la data tra parentesi. Push e tag non la richiedono. -->
- **GitHub CLI (gh) installata:** sì (2026-11-08)

## Note per Claude
- [Particolarità del dominio, termini di business, vincoli del cliente, aree del codice delicate]
