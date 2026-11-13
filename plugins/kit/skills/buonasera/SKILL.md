---
description: Salva lo stato dei lavori della giornata in PIANO.md e i nuovi problemi in CHECKLIST.md, aggiorna senza conferma README.md, CHANGELOG.md e la wiki del progetto (se presente), così il giorno dopo /kit:buongiorno sa da dove ripartire. Prima di chiudere cerca i file non più utili (cancella solo quelli che l'utente conferma) e ricorda `/compact`. Non salva la conversazione. Si lancia solo su richiesta, a fine giornata.
model: sonnet
disable-model-invocation: true
---

# Buonasera: salvataggio dello stato

Rispondi in italiano. Non committare nulla (nemmeno la wiki).

1. Leggi `PIANO.md` e `CHECKLIST.md` nella radice del repository. Se non c'è lavoro in corso (nessun `PIANO.md` e nessuna modifica non committata), non creare file: dillo e termina.
2. Priorità, per questo progetto: leggi in `~/.claude/kit-progetti.json` la voce del progetto (chiave: il percorso assoluto della radice del repository, con `/` al posto di `\`). Se la voce `priorita` manca, chiedi una sola domanda: vuoi gestire le priorità in questo progetto (sì/no)? Salva la risposta nella voce del progetto; crea il file se non esiste e aggiorna solo quella voce, senza toccare le altre.
3. Raccogli lo stato, in sola lettura: `git status --short`, `git log --oneline` dei commit di oggi, e l'esito dei test se li hai eseguiti oggi (altrimenti scrivi «non eseguiti»).
4. Aggiorna `PIANO.md`:
   - spunta solo i passi verificati (build e test dove si applicano);
   - aggiungi o sostituisci la sezione `## Ripartenza` con: data, passo in corso, ultimo passo completato, prossimo passo, decisioni aperte, file toccati oggi, test rotti;
   - se le priorità sono gestite (`priorita: true`), scrivi l'etichetta `[P1]`, `[P2]` o `[P3]` all'inizio di ogni passo aperto, dopo la casella (`- [ ] [P1] ...`); i passi chiusi non la portano.
5. Aggiorna `CHECKLIST.md` aggiungendo i problemi nuovi come voci `[ ]`. Non cancellare quelli esistenti.
6. **Documentazione, senza chiedere conferma.** Solo se il lavoro di oggi ha cambiato comportamento, configurazione o struttura del progetto (`core.md` §5b); altrimenti dillo e salta il passo.
   - Aggiorna `CHANGELOG.md` con la voce del giorno, nel formato di `core.md` §5b (giorno più recente in alto, una sottosezione per intervento con **Perché**, **Cosa / Dove**, **Verifica**, **Note**), e `README.md` solo dove il lavoro cambia ciò che dice. Se `README.md` o `CHANGELOG.md` mancano, creali come descritto in `/kit:aggiorna-docs` (passi 3 e 4). Non toccare il file di versione.
   - Leggi in `~/.claude/kit-progetti.json` la voce `sito` del progetto. Con `esiste: true` e un percorso, aggiorna senza chiedere conferma le pagine della wiki che descrivono ciò che è cambiato, e solo quelle; se nessuna lo descrive, non modificare il sito e dillo nel riepilogo. Se la voce `sito` manca, non fare domande: dillo nel riepilogo e suggerisci `/kit:aggiorna-docs`, che la chiede una volta.
7. **File non più utili.** In sola lettura (`git status --short`, `git ls-files`, ricerca dei riferimenti con Grep) cerca file che non servono più, anche `.md`. Candidati tipici: piani conclusi (`PIANO.md` con tutte le caselle spuntate, `piano-commit.md` completato: questi si cancellano senza chiedere, `core.md` §6.15), file temporanei o di backup non tracciati (`*.bak`, `*.orig`, `*.tmp`, `*.log`), bozze e note `.md` senza riferimenti da altri file, file generati non ignorati. Non proporre mai: `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SECURITY.md`, `.env*`, `.claude/`, `docs/adr/`, lock file, `CHECKLIST.md`. Per gli altri candidati mostra un elenco con il motivo di ciascuno e chiedi con una sola domanda quali cancellare; cancella solo quelli confermati, uno per file (mai `rm -rf`), e non committare. Se non ci sono candidati, dillo in una riga.
8. **Promemoria `/compact`.** Dopo la pulizia ricorda in una riga che è un buon momento per `/compact` (comando interno: non puoi eseguirlo né simularlo, `core.md` §6.19).
9. In fondo alla risposta stampa il prompt da copiare nella sessione successiva, esattamente così: «Riprendi il lavoro: usa /kit:buongiorno».
