---
paths:
  - "**/*.{cs,csproj,props}"
  - "**/Dockerfile"
  - "**/docker-compose*.{yml,yaml}"
  - "**/compose*.{yml,yaml}"
  - "observability/**"
---

# Osservabilità (logging, OpenTelemetry, stack)

> Versione 1.0 — ultima revisione: 2026-11-22.

> Richiede `core.md`. Estratto da `core.md` §5 («Operatività e CI», dove restano CI/CD e Git). Si carica sui file backend, Docker e `observability/`; un progetto senza backend dichiara il logging nel `CLAUDE.md`.

- **Logging strutturato: si concorda ogni volta, senza dare per scontato né Serilog né OpenTelemetry.** Claude chiede prima *se e con quale soluzione* fare il logging strutturato; il codice scrive sempre tramite `ILogger`, e ciò che si concorda è il provider/implementazione dietro di esso: l'opzione da proporre per prima è **Serilog** (pacchetti NuGet, che si integra nativamente con `ILogger`), ma sono possibili anche i provider standard di .NET o **OpenTelemetry** (anch'esso accoppiabile a `ILogger`). Le soluzioni non si escludono a vicenda e possono essere combinate (es. Serilog con un sink OTLP). Se si sceglie Serilog, la configurazione si concorda comunque ogni volta, senza presumerla dal progetto precedente: Serilog ha molti output (sink: console, file, database, OTLP, ecc.) e formati (template testuale, JSON compatto, ecc.). Claude chiede almeno: quali sink, quale formato/`outputTemplate`, livelli minimi per namespace, rotazione e retention dei file se c'è un sink su file, eventuale arricchimento (`traceId`, nome applicazione, ambiente). La scelta va nel `CLAUDE.md`; la configurazione sta in `appsettings.json` (sezione `Serilog`) dove possibile. Verifica licenza gratuita e permissiva di ogni sink prima di proporlo. In un container i log vanno su stdout (vedi `docker.md`); un sink su file richiede quindi una conferma esplicita. Nessun dato personale o segreto nei log. Il `traceId` è propagato dal frontend al backend.
- **Shutdown:** arresto graduale (graceful shutdown) con `CancellationToken` rispettato da `BackgroundService` e hosted service; i job in corso terminano o vengono ripresi.
- **Più container:** l'app deve poter girare in più repliche senza stato locale (sessione, file, cache, scheduler); vedi `backend.md` §5b.
- **OpenTelemetry (da concordare ogni volta, non presunto):** se adottato, tracce, metriche e log, esportati in OTLP verso un Collector (`OTEL_EXPORTER_OTLP_ENDPOINT`, mai un indirizzo fisso nel codice).
- **Stack di osservabilità self-hosted (da proporre ai progetti con backend, da confermare ogni volta; presuppone OpenTelemetry):** OpenTelemetry Collector → Prometheus (metriche) e Jaeger (tracce), con Grafana come UI, tutti container nel file `docker-compose.observability.yml` (caricato in aggiunta al compose base) e configurazioni in `observability/` (`otel-collector.yaml`, `prometheus.yml`, provisioning Grafana).
  - **Log:** salvo la scelta concordata per il logging, su stdout con rotazione di Docker (`docker.md`); nessun sistema centralizzato di log di default. Loki si aggiunge solo su richiesta.
  - **Licenze:** Collector, Prometheus e Jaeger sono Apache-2.0; Grafana è AGPLv3 e rientra nell'eccezione dei servizi di infrastruttura esterni non modificati (`core.md` §3). Licenze verificate il 2026-10-25 sui repository ufficiali (Prometheus, OpenTelemetry Collector, Jaeger: Apache-2.0; Grafana: AGPL-3.0-only). Per Grafana usa l'immagine OSS (`grafana/grafana-oss`), mai l'edizione Enterprise. Per ogni altra immagine non elencata, verifica la licenza al primo utilizzo. Mai SigNoz (funzioni essenziali nel tier a pagamento).
  - **Regole:** immagini con tag fissi, volumi nominati per Prometheus e Grafana, porte non esposte all'esterno tranne la UI di Grafana dietro il reverse proxy dell'utente, password di Grafana tramite variabile d'ambiente valorizzata da `.env`. Nessun dato personale in tracce, metriche e log.
  - Se il progetto non ne ha bisogno (app piccola, un solo container), lo dichiara in `CLAUDE.md`; i log seguono la scelta concordata per il logging (vedi il primo punto di questa sezione).
