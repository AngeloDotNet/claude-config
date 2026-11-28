---
description: Prepara e, passo per passo, esegue il rilascio di un progetto secondo git-flusso.md («Rilascio»). Tre passi con argomento: bump X.Y.Z (commit di bump su release/X.Y.Z, con voce del CHANGELOG), tag X.Y.Z (annotato, solo sul merge commit su main dopo la PR), gh (GitHub release con le note della voce di rilascio). Ogni passo che scrive o pubblica chiede un sì prima di agire. Richiede la GitHub CLI installata e autenticata per il passo gh. Si lancia solo su richiesta.
model: sonnet
argument-hint: bump X.Y.Z | tag | gh
disable-model-invocation: true
---

# Rilascio

Rispondi in italiano. Una sola domanda per messaggio e attendi la risposta. Non fare mai `push --force`, non fare merge di PR, non cancellare branch, non creare tag o rilasci senza il sì dell'utente per quel passo specifico: il lancio della skill non è il via al tag o alla release.

**Regole di riferimento:** `git-flusso.md`, sezione «Rilascio», e `core.md` §5c. Il tag è `X.Y.Z` senza `v`, annotato, e si crea solo su `main`: l'hook `guard-commands` lo impone già.

## Passo 0 · Lettura dello stato (sempre, sola lettura)

1. `git rev-parse --show-toplevel` e `git branch --show-current`. Se il repository non c'è, dillo e fermati.
2. Leggi la versione del file di versione del progetto (per il plugin `plugins/kit/.claude-plugin/plugin.json`, altrimenti `Directory.Build.props` o il file indicato in `CLAUDE.md`, sezione «File della versione e changelog»).
3. Leggi l'ultima voce `### Rilascio X.Y.Z` in `CHANGELOG.md`.
4. Riporta in tre righe: versione attuale, branch corrente, ultimo tag (`git tag --list --sort=-v:refname | head -1`).

## Argomento `bump X.Y.Z` · commit di bump

1. Verifica che `X.Y.Z` sia maggiore dell'attuale in SemVer e dillo (minor per `feat`, patch per `fix`, major per breaking change). Se l'utente ha dato una versione che non rispetta SemVer rispetto alle modifiche, chiedi con una domanda sola.
2. Verifica che il branch corrente non sia `main` né `develop`: il bump si fa su `release/X.Y.Z` (da `develop`), creato da te senza conferma se non esiste. Se esiste ed è di un altro lavoro, fermati e chiedi.
3. Verifica che `CHANGELOG.md` abbia la sottosezione `### Rilascio X.Y.Z` nel titolo del giorno del rilascio; se manca, scrivila con le categorie **Aggiunto:**, **Modificato:**, **Corretto:**, **Sicurezza:** (solo quelle che servono), come da `git-flusso.md`.
4. Modifica la versione nel file di versione del progetto.
5. Mostra `git diff` e la voce di rilascio, poi chiedi: «Confermi il commit `chore(release): bump version to X.Y.Z`?». Solo con il sì, crea il commit aggiungendo i file per nome (mai `git add -A`), con il trailer `Co-Authored-By`.

## Argomento `tag` · tag annotato su main

1. Verifica che il merge sia su `main`: `git switch main` (se c'è lavoro non committato, fermati), `git pull --ff-only`, poi che l'ultimo commit di `main` sia il merge della PR di rilascio (`git log -1 --merges`).
2. Verifica che la versione del file di versione su `main` e la voce `### Rilascio X.Y.Z` coincidano con il tag richiesto.
3. Chiedi: «Creo il tag annotato `X.Y.Z` sul commit `<hash>` (<oggetto>)?». Solo con il sì: `git tag -a X.Y.Z -m "<riga di rilascio>"`.
4. Dopo il tag chiedi separatamente: «Pubblico il tag `X.Y.Z` su origin?». Solo con il sì: `git push origin X.Y.Z`.

## Argomento `gh` · GitHub release

1. Verifica `gh --version` e `gh auth status` (sola lettura). Verifica nel `CLAUDE.md` del progetto la riga «GitHub CLI (gh) installata: sì». Se manca o dice no, fermati e dillo.
2. Verifica che il tag `X.Y.Z` esista su origin (`git ls-remote --tags origin X.Y.Z`).
3. Prepara titolo `X.Y.Z` e note dalla sola sottosezione `### Rilascio X.Y.Z` del CHANGELOG (dal titolo escluso).
4. Chiedi: «Creo la GitHub release `X.Y.Z` con queste note?» (mostra le note). Solo con il sì: `gh release create X.Y.Z --title "X.Y.Z" --notes-file <file temporaneo>`. Il file temporaneo sta nella cartella scratchpad, non nel repository.

## Cosa non fa mai

- Non fa il merge della PR di rilascio: è dell'utente.
- Non cancella branch e non sposta tag esistenti.
- Non avvia pipeline (`gh workflow run`): quelle richiedono una conferma separata per ogni esecuzione.
