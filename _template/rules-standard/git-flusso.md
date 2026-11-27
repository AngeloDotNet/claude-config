# Regole Git: flusso, commit e integrazione GitHub (versione standard)

> Versione 1.1 — ultima revisione: 2026-11-26.
> Versione breve per il profilo `standard`, sintesi di `git.md` (sezioni di flusso). Il testo completo è in `.claude/rules-optional/dettaglio/git-flusso.md`, da leggere su richiesta. Pull request, rilascio e skill: `git-avanzato.md`.

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
