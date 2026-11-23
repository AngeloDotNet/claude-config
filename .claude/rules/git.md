# Regole Git (profilo mini)

> Versione 3.0 — ultima revisione: 2026-11-23.
> Richiede `core.md`. Sono le regole minime per ogni progetto versionato. Il dettaglio (branch, messaggi, granularità, integrazione GitHub, repository e hook) è in `git-flusso.md`; pull request, rilascio e skill in `git-avanzato.md`. Entrambi si caricano nei profili standard e strutturato.

- **Branch (git flow):** `develop` è obbligatorio. Mai commit diretti su `main` o `develop`; il lavoro sta su `feature/`, `bugfix/` o `release/` (da `develop`) e `hotfix/` (da `main`). Il branch di lavoro lo crea Claude senza chiedere conferma.
- **Messaggi di commit in inglese, Conventional Commits:** `tipo(scope): descrizione`, con tipi `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`. Oggetto all'imperativo, minuscolo, senza punto finale, massimo 72 caratteri. Mai messaggi generici (`update`, `fix`, `wip`).
- **Contenuto dei commit:** aggiungi i file per nome, mai `git add -A` alla cieca. Prima di ogni commit controlla `git status` e `git diff --staged`. Nessun segreto, `.env`, dump di database o file generato entra nel repository; se compare qualcosa che sembra un segreto, fermati e segnalalo.
- **Vietati:** `push --force` (e varianti), `reset --hard`, `--no-verify`, `clean -f`. Per annullare un commit già pubblicato usa `git revert`.
- **Push, PR, tag e rilasci:** solo con il via dell'utente. La GitHub CLI (`gh`) si usa solo se il `CLAUDE.md` la dichiara installata.
