# Operatività, Docker e CI

> Versione 1.0 — ultima revisione: 2026-11-23.
> Estratto da `core.md` §5 e §5a, con la stessa numerazione. Caricato nei profili standard e strutturato.

## 5. Operatività e CI
- **Logging, shutdown, più container, OpenTelemetry e stack di osservabilità:** in `osservabilita.md`, caricato sui file backend, Docker e `observability/`.
- **Docker (opzionale):** le regole sono in `docker.md`, attivo solo su richiesta esplicita dell'utente (§5a). Server, host e orchestrazione sono gestiti dall'utente e fuori dallo scopo di Claude.
- **CI/CD:** build, test, lint, scansione vulnerabilità e formattazione a ogni PR. Supply chain: SAST (CodeQL), secret scanning (gitleaks), scansione delle immagini Docker (Trivy) e SBOM generato a ogni release. Claude può scrivere e committare i file di pipeline (workflow YAML, configurazione Dependabot/Renovate); l'avvio di una pipeline segue `git.md` («Integrazione GitHub») e la gestione dei segreti della CI resta all'utente.
- **Git:** vedi `git.md`.

---

## 5a. Docker e Docker Compose (modulo opzionale)
Il modulo **`docker.md`** sta in `.claude/rules-optional/`: non si chiede all'avvio e non si presume che il progetto sia distribuito con Docker. Si attiva solo se l'utente lo chiede esplicitamente (per esempio «crea un Dockerfile»), con la procedura di `avvio-progetto.md` §4 («Aggiunta di un modulo»). Finché non è attivo, i rimandi a `docker.md` nelle altre regole non si applicano. Una volta attivato, il deploy avviene con `Dockerfile` e `docker-compose`; le regole complete (Dockerfile multi-stage, compose per ambiente, reti, segreti, migrazioni, backup) sono nel modulo **`docker.md`**. L'host e la sua configurazione (rete, proxy, firewall, backup del server) sono gestiti dall'utente: Claude non li assume e non li configura, ma produce artefatti Docker che funzionino su qualsiasi host.

---

