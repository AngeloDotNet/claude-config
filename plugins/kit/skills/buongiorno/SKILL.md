---
description: Riprende il lavoro del giorno precedente. Legge dalle issue del progetto (issue padre e sue sub-issue, con gh) il piano e i problemi, riassume dove si è arrivati, cosa fare e le priorità, e propone il primo passo da cui ripartire. Si lancia solo su richiesta, all'inizio della giornata di lavoro.
model: haiku
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Buongiorno: ripartenza

Non modificare nessun file e non modificare nessuna issue. Rispondi in italiano.

1. Rileggi `CLAUDE.md` (regola di inizio sessione, `core.md` §6.16) e leggi la riga «GitHub CLI (gh) installata» nella sezione «Eccezioni alle regole globali». Se manca, dice «no» o `gh` non è autenticata (`gh auth status`), non leggere le issue: dillo e chiedi una sola domanda su come riprendere (`git-flusso.md`, «Integrazione GitHub»).
2. Leggi in sola lettura le issue aperte del repository (`gh issue list --state open`) e le sub-issue di ognuna, aperte e chiuse (`gh api "repos/{owner}/{repo}/issues/<numero>/sub_issues"`, sola lettura). La **issue padre** è una issue aperta che ha sub-issue, in quest'ordine:
   - se ci sono issue con sub-issue aperte, la padre è tra queste;
   - altrimenti è tra le issue aperte con le sub-issue tutte chiuse: il lavoro non è concluso finché la padre resta aperta. Dillo in una riga.
   Se nel gruppo scelto ce n'è più di una, chiedi con una sola domanda quale riprendere. Se nessuna issue aperta ha sub-issue, dillo e chiedi se c'è un altro punto di ripartenza o si parte da zero.
3. Controlla lo stato di git in sola lettura: branch corrente (`git branch --show-current`) e modifiche non committate (`git status --short`). Se ci sono modifiche non committate, segnalale.
4. Controlla in `~/.claude/kit-progetti.json` (sulla macchina dell'utente) la voce di questo progetto, chiave `priorita`. Se è `true`, ordina le sub-issue aperte per etichetta di priorità `P1`, `P2`, `P3` (a parità, l'ordine della issue padre). Se è assente o `false`, usa l'ordine della issue padre. Se con `priorita: true` una sub-issue aperta non ha l'etichetta, segnalalo e non la ordina.
5. Riassumi in 3-4 righe: ultima sub-issue chiusa, sub-issue in corso, prossima sub-issue, decisioni ancora aperte (dal corpo o dai commenti della issue padre). Leggi tutti i commenti: lo stato valido è quello del più recente, e ciò che un commento successivo supera non si riporta. Con le sub-issue tutte chiuse, al posto della sub-issue in corso e della prossima riporta i punti ancora da fare scritti nell'ultimo commento «Ripartenza» o, se manca, nel corpo; se non ce ne sono, chiedi con una sola domanda se chiudere la issue padre (la chiusura avviene dopo la risposta, fuori da questa skill).
6. Proponi il primo passo da cui ripartire, con una riga di motivazione.
7. Fermati e attendi l'ok dell'utente. Non iniziare il passo senza il suo ok. Se hai dubbi su una scelta, fai una sola domanda.
