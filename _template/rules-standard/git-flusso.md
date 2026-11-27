# Regole Git: flusso, commit, pull request, rilascio e skill (versione standard)

> Versione 1.2 — ultima revisione: 2026-11-27.
> Versione breve per il profilo `standard`. Il testo completo è in `.claude/rules-optional/dettaglio/git-flusso.md`, da leggere su richiesta. Richiede `core.md`.

## Integrazione GitHub
- **Autonomo, senza conferma:** issue, sub-issue, commit e branch locale di lavoro.
- **Con il via dell'utente:** PR, push (incluso il primo push di un branch), tag e rilasci. Per tag, push del tag e rilascio Claude propone l'operazione e chiede il via.
- **Gestione del repository mai da Claude:** impostazioni, accessi, protezione dei branch, segreti della CI, webhook, eliminazione o trasferimento.
- **GitHub CLI:** alla prima operazione che passa da `gh` Claude chiede una sola volta se è installata e scrive la riga fissa nella sezione «Eccezioni alle regole globali» del `CLAUDE.md`. Con `sì` verifica `gh auth status`; con `no` non propone operazioni `gh`.
- **Pipeline:** si avviano solo con una domanda di conferma per ogni esecuzione.
- **Sempre vietati:** `push --force` (e varianti), `reset --hard`, `--no-verify`, `clean -f`, `rm -rf`. La cancellazione di branch remoti è solo per i branch di lavoro, dopo aver verificato che la PR sia `MERGED`.

## Branch (git flow)
- Git flow obbligatorio: `develop` è il branch di integrazione; `feature/`, `bugfix/`, `release/` partono da `develop`; `hotfix/` parte da `main`.
- Nomi `tipo/descrizione-breve` in minuscolo con trattini; l'ID del ticket entra nel nome se il progetto lo usa.
- Mai commit diretti su `main` o `develop`. Se `develop` manca, Claude chiede se crearlo da `main`, senza altre conferme.
- Se il branch di partenza è avanzato o ci sono conflitti, Claude lo segnala e non committa finché non sono risolti; applica una risoluzione solo dopo l'ok.
- Merge, aggiornamento del branch e chiusure di git flow sono a cura dell'utente.

## Messaggi di commit
- Conventional Commits in inglese: `tipo(scope): descrizione`, tipi `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Oggetto all'imperativo, minuscolo, senza punto finale, massimo 72 caratteri. Mai messaggi generici.
- Il corpo spiega il perché; per un `fix` indica la causa radice. Riferimenti `(#NNN)` nel corpo o nell'oggetto.
- Dipendenze dei bot: `build(deps)` per la produzione, `chore(deps-dev)` per lo sviluppo.
- Il trailer `Co-Authored-By` solo se richiesto o configurato; mai nell'oggetto.

## Granularità e sequenza
- Una funzionalità è una serie di commit piccoli, ciascuno che builda e passa i test: modello, configurazione EF e migrazione; poi endpoint o UI; poi test in un commit `test(scope)` separato; poi documentazione.
- Un `fix` è un commit a sé. Non mescolare refactoring, formattazione e cambi di comportamento.
- Si riscrive solo un commit proprio non ancora pubblicato.

## Commit multipli
- Piano della serie: se il lavoro ha già una issue padre, la si commenta con gli hash; altrimenti con almeno tre commit si apre una issue padre con una sub-issue per commit, chiusa dopo ogni commit; con uno o due commit, o senza `gh`, il piano resta in chat.
- Un commit alla volta: file per nome, `git status` e `git diff --staged` controllati, build e test verdi.
- Se un file ha modifiche destinate a commit diversi, Claude chiede come separarle prima di committare.
- Se un hook fallisce o un test è rosso, Claude corregge la causa e ricrea il commit; non passa al successivo.

## Cosa non entra mai nel repository
- Segreti, `.env`, certificati, chiavi, dump di database, file generati (`bin`, `obj`, `node_modules`, `dist`), file di IDE personali.
- Controlli prima del commit: `git diff --cached --check`; file grandi o binari inattesi segnalati. I lock file si committano; i file di build no.

## Repository, fine riga e hook
- Claude non esegue mai `git init`: se la cartella non è un repository, lo segnala e non committa.
- `.gitattributes` con `* text=auto` va valutato con l'utente prima di proporlo.
- Gli hook pre-commit si scrivono se richiesti; la loro attivazione è dell'utente.
- Un commit con build o test rossi (WIP) si fa solo su richiesta esplicita, con oggetto `chore(wip): ...`.

## Sicurezza della cronologia
- Nessuna riscrittura di cronologia pubblicata senza conferma; mai `push --force`.
- Per annullare una modifica pubblicata si usa `git revert`.
- Se un segreto finisce in un commit, la rotazione del segreto viene prima di qualsiasi pulizia della cronologia.

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
- `/kit:pr-main`: PR da `develop` (o `release/*`, `hotfix/*`) verso `main`; dopo il merge, con `/kit:pr-main pulizia`, pulizia dei branch di lavoro con PR mergiata e allineamento con `git pull --ff-only`.
