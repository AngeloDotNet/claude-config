# Regole Git avanzate: pull request, rilascio e skill (versione standard)

> Versione 1.0 — ultima revisione: 2026-11-23.
> Versione breve per il profilo `standard`. Il testo completo è in `.claude/rules-optional/dettaglio/git-avanzato.md`, da leggere su richiesta. Richiede `git-flusso.md` e `core.md`.

## Pull Request
- Claude apre PR con `gh` solo se la GitHub CLI è installata (riga nel `CLAUDE.md`), con il lancio di `/kit:pr-develop` o `/kit:pr-main` o su richiesta esplicita.
- Una PR per issue o funzionalità, con titolo Conventional Commits; la serie di commit resta leggibile.
- La descrizione riporta cosa cambia e perché, come è stato testato, gli impatti (migrazioni, variabili d'ambiente, breaking change) e `Closes #N`.
- **Strategia di merge (a cura dell'utente):** `feature/*` e `bugfix/*` verso `develop` con squash; ogni PR che coinvolge `main` (`develop`, `release/*`, `hotfix/*` verso `main`, e il ritorno in `develop`) con merge commit, mai squash o rebase.
- Se `main` ha commit che `develop` non ha, si sincronizza prima con una PR dedicata (`bugfix/sync-main-into-develop`, o il primo nome libero `-2`, `-3`) chiusa con merge commit.
- Il lint dei commit si esegue solo sulle PR verso `develop`.

## Rilascio
- Versionamento SemVer; la versione vive in un solo punto (per esempio `Directory.Build.props`).
- Voce `### Rilascio X.Y.Z` in `CHANGELOG.md`, con le etichette in grassetto **Aggiunto:**, **Modificato:**, **Corretto:**, **Sicurezza:** solo quando servono.
- Commit di rilascio isolato: `chore(release): bump version to X.Y.Z`.
- Tag annotato `X.Y.Z` senza prefisso `v`, solo dopo il merge su `main` del rilascio. Claude verifica il merge e la coerenza di versione e changelog, poi chiede il via prima di creare e pubblicare il tag.
- Il rilascio con `gh release` viene dopo il tag, con il via esplicito dell'utente.
- A fine piano concluso Claude valuta se il rilascio è giustificato e propone la versione con il motivo; il commit di bump va su un branch `release/X.Y.Z` o `hotfix/X.Y.Z`, mai su `main` o `develop`.

## Skill del plugin `kit`
- `/kit:commit-passo`: commit locali in sequenza, senza conferme intermedie, sul branch di lavoro.
- `/kit:pr-develop`: PR da `feature/*` o `bugfix/*` verso `develop`; prerequisito `gh` installata e autenticata.
- `/kit:pr-main`: PR da `develop` (o `release/*`, `hotfix/*`) verso `main`; dopo il merge, pulizia dei branch di lavoro confermati e allineamento con `git pull --ff-only`.
