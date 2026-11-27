---
paths:
  - "**/.github/**"
---

# Operatività, Docker e CI

> Versione 1.4 — ultima revisione: 2026-11-27.
> Estratto da `core.md` §5 e §5a, con la stessa numerazione. Caricato nei profili standard e strutturato solo quando si toccano file sotto `.github/` (`paths:`).

## 5. Operatività e CI
- **Logging, shutdown, più container, OpenTelemetry e stack di osservabilità:** in `osservabilita.md`, caricato sui file backend, Docker e `observability/`.
- **Docker (opzionale):** le regole sono in `docker.md`, attivo solo su richiesta esplicita dell'utente (§5a). Server, host e orchestrazione sono gestiti dall'utente e fuori dallo scopo di Claude.
- **CI/CD:** build, test, lint, scansione vulnerabilità e formattazione a ogni PR. Supply chain: SAST (CodeQL), secret scanning (gitleaks), scansione delle immagini Docker (Trivy) e SBOM generato a ogni release. Claude può scrivere e committare i file di pipeline (workflow YAML, configurazione Dependabot/Renovate); l'avvio di una pipeline segue `git-flusso.md` («Integrazione GitHub») e la gestione dei segreti della CI resta all'utente.
  - **Controlli obbligatori per ogni PR (MUST):** build con avvisi trattati come errori (`TreatWarningsAsErrors` nel backend), test, lint, formattazione (`dotnet format --verify-no-changes --no-restore`, `npx prettier --check .`), audit dei pacchetti (`dotnet list package --vulnerable --include-transitive`, `npm audit --audit-level=high`). Un controllo rosso blocca la PR.
  - **Cache:** cache delle dipendenze (NuGet, npm) con chiave legata al lock file, così una modifica delle dipendenze invalida la cache.
  - **Pipeline di release:** si avvia solo con una conferma esplicita per ogni esecuzione (`git-flusso.md`, «Integrazione GitHub»); produce l'immagine e l'SBOM, e il bundle di migrazione del passo unico (ADR 0003).
  - **Punto di partenza:** `_template/ci/ci.yml`, da adattare a cartelle e comandi della tabella «Comandi» del `CLAUDE.md`. Le action restano fissate al commit SHA (`security-avanzata.md`, «Supply chain»).
- **Git:** vedi `git-flusso.md`.

---

## 5a. Docker e Docker Compose (modulo opzionale)
Il modulo **`docker.md`** sta in `.claude/rules-optional/`: non si chiede all'avvio e non si presume che il progetto sia distribuito con Docker. Si attiva solo se l'utente lo chiede esplicitamente (per esempio «crea un Dockerfile»), con la procedura di `avvio-progetto.md` §4 («Aggiunta di un modulo»). Finché non è attivo, i rimandi a `docker.md` nelle altre regole non si applicano. Una volta attivato, il deploy avviene con `Dockerfile` e `docker-compose`; le regole complete (Dockerfile multi-stage, compose per ambiente, reti, segreti, migrazioni, backup) sono nel modulo **`docker.md`**. L'host e la sua configurazione (rete, proxy, firewall, backup del server) sono gestiti dall'utente: Claude non li assume e non li configura, ma produce artefatti Docker che funzionino su qualsiasi host.

---

