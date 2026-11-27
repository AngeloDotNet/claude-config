---
description: Salva lo stato dei lavori della giornata nelle issue del progetto (chiude le sub-issue verificate, registra la ripartenza sulla issue padre, apre le issue dei problemi nuovi), aggiorna senza conferma README.md, CHANGELOG.md e la wiki del progetto (se presente), così il giorno dopo /kit:buongiorno sa da dove ripartire. Prima di chiudere cerca i file non più utili (cancella solo quelli che l'utente conferma) e ricorda `/clear` o `/compact`. Non salva la conversazione. Si lancia solo su richiesta, a fine giornata.
model: sonnet
disable-model-invocation: true
---

# Buonasera: salvataggio dello stato

Rispondi in italiano. Non committare nulla (nemmeno la wiki).

1. Rileggi la riga «GitHub CLI (gh) installata» nel `CLAUDE.md` (sezione «Eccezioni alle regole globali»). Se manca, dice «no» o `gh` non è autenticata (`gh auth status`), non scrivere nelle issue: dillo, chiedi una sola domanda su come salvare lo stato, e salta i passi 3 e 4 (`git-flusso.md`, «Integrazione GitHub»).
2. Leggi in sola lettura le issue aperte (`gh issue list --state open`) e `git status --short`. La **issue padre** è quella aperta che ha sub-issue aperte; se ce n'è più di una, chiedi con una sola domanda quale aggiornare. Tre casi:
   - **nessuna issue padre e nessuna modifica non committata:** non c'è lavoro in corso, non creare nulla, dillo e termina;
   - **nessuna issue padre ma modifiche non committate:** prosegui senza i passi 3 e 4; nel riepilogo elenca le modifiche non committate come stato di ripartenza;
   - **issue padre con tutte le sub-issue chiuse:** non aggiornare la ripartenza; riepiloga cosa è stato fatto e chiedi con una sola domanda se chiudere la issue padre.
3. Priorità, per questo progetto: leggi in `~/.claude/kit-progetti.json` la voce del progetto (chiave: il percorso assoluto della radice del repository, con `/` al posto di `\`). Se la voce `priorita` manca, chiedi una sola domanda: vuoi gestire le priorità in questo progetto (sì/no)? Salva la risposta nella voce del progetto; crea il file se non esiste e aggiorna solo quella voce, senza toccare le altre. Se `priorita: true`, ogni sub-issue aperta deve avere una sola etichetta `P1`, `P2` o `P3`: aggiungi quella mancante solo dopo aver chiesto all'utente (una domanda per volta).
4. Aggiorna le issue (con `gh`, senza conferma, `git-flusso.md`):
   - **Sub-issue dei passi verificati** (build e test dove si applicano): chiudile con un commento che riporta l'esito della verifica. Non chiudere quelle non verificate.
   - **Ripartenza:** aggiungi alla issue padre un commento «Ripartenza» con: data, passo in corso, ultimo passo completato, prossimo passo, decisioni aperte, file toccati oggi, test rotti. Se il commento di ripartenza di oggi esiste già, aggiornalo invece di aggiungerne un altro.
   - **Problemi nuovi:** apri una issue per ciascuno, con titolo chiaro e corpo che dice cosa, dove e perché. Non chiudere né modificare quelle esistenti.
   - Dei commit: raccogli `git log --oneline` dei commit di oggi e, se li hai eseguiti oggi, l'esito dei test (altrimenti scrivi «non eseguiti»).
5. **Documentazione, senza chiedere conferma.** Solo se il lavoro di oggi ha cambiato comportamento, configurazione o struttura del progetto (`core.md` §5b); altrimenti dillo e salta il passo.
   - Segui `documentazione.md` in questa cartella (passi 1-5, fonte unica): voce del `CHANGELOG.md` nel formato di `core.md` §5b, `README.md` solo dove il lavoro cambia ciò che dice (creato se manca), pagine della wiki se la voce `sito` ha `esiste: true`, verifica del formato. Il file di versione non si tocca.
   - Lingua: la lingua dei documenti è quella del campo «Lingua della documentazione» del `CLAUDE.md` (`core.md` §5b). Se il campo manca o è un segnaposto, non indovinare: poni una sola domanda.
   - Se la voce `sito` manca, non fare domande: la chiede già il hook `prompt-start`, una volta per progetto.
6. **File legacy.** Se nella radice esistono ancora `PIANO.md`, `CHECKLIST.md` o `piano-commit.md` (progetti non ancora migrati alle issue), chiedi con una sola domanda se migrarne il contenuto in issue o lasciarli com'è. Non cancellarli né migrarli senza la risposta.
7. **File non più utili.** In sola lettura (`git status --short`, `git ls-files`, ricerca dei riferimenti con Grep) cerca file che non servono più, anche `.md`. Candidati tipici: file temporanei o di backup non tracciati (`*.bak`, `*.orig`, `*.tmp`, `*.log`), bozze e note `.md` senza riferimenti da altri file, file generati non ignorati. Non proporre mai: `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SECURITY.md`, `.env*`, `.claude/`, `docs/adr/`, lock file. Per gli altri candidati mostra un elenco con il motivo di ciascuno e chiedi con una sola domanda quali cancellare; cancella solo quelli confermati, uno per file (mai `rm -rf`), e non committare. Se non ci sono candidati, dillo in una riga.
8. **Promemoria `/clear` o `/compact`.** Dopo la pulizia ricorda in una riga il comando adatto, col criterio di `lavoro.md` («`/clear` o `/compact`»): `/clear` se lo stato di ripartenza sta già nelle issue (caso tipico di questa skill, che lo ha appena salvato), `/compact` solo se il lavoro continua nella stessa sessione (comandi interni: non puoi eseguirli né simularli, `core.md` §6.19).
9. In fondo alla risposta stampa il prompt da copiare nella sessione successiva, esattamente così: «Riprendi il lavoro: usa /kit:buongiorno».
