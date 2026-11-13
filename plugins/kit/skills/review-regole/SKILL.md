---
description: Revisione del codice scritto contro le regole presenti in .claude/rules/ del progetto. È un'integrazione del code review integrato, non un suo sostituto. Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [percorso-o-branch]
---

# Revisione del codice secondo le regole del progetto

Rispondi in italiano. Non modificare nessun file.

1. Leggi il `CLAUDE.md` della radice (per le scelte specifiche del progetto). Se `.claude/rules/` manca, dillo e fermati.
2. Scegli il codice da rivedere, in sola lettura:
   - se è passato un argomento, capisci se è un branch (`git rev-parse --verify --quiet <argomento>`) o un percorso: per un branch usa `git diff <base>...<branch>`, dove `<base>` è `develop` (se non esiste, il branch principale del `CLAUDE.md`); per un percorso rivedi i file indicati;
   - altrimenti usa le modifiche non committate (`git diff` e `git diff --cached`) **più i file nuovi non tracciati** (`git status --short`, righe `??`, che `git diff` non mostra: leggili); se non ci sono modifiche, usa l'ultimo commit (`git show --stat HEAD` e il suo diff).
   - Dai file toccati ricava i moduli pertinenti: `core.md`, `lavoro.md`, `git.md` e `security.md` si applicano sempre; gli altri in `.claude/rules/` hanno un `paths:` nell'intestazione e valgono solo per i file che corrispondono (per esempio i moduli backend per `*.cs`). Leggi solo quelli, non tutta la cartella.
3. Controlla il codice contro le regole applicabili ai file toccati. Per ogni problema riporta: file e riga, regola violata (file e sezione), gravità (bloccante, importante, suggerimento: scala di `lavoro.md`, «Gravità dei rilievi»), e una riga su come correggerlo.
4. Segnala anche ciò che non si può verificare leggendo il codice (per esempio il comportamento a runtime): non segnarlo come problema.
5. Chiudi con il conteggio per gravità e con un giudizio indicativo (pronto, oppure da correggere prima del commit): la decisione finale resta all'utente. Questa revisione controlla solo le regole del progetto: non cerca difetti di correttezza né vulnerabilità. Ricorda all'utente `/code-review` per i difetti e `/security-review` se il codice tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali (`lavoro.md`, `security.md` «Regola operativa»).
6. Non modificare file e non creare commit: le correzioni le decide l'utente.
