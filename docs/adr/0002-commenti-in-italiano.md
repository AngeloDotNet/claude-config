# 0002. Commenti di codice in italiano di default

**Stato:** accettata (2026-11-24), decisione dell'utente su #88. Supera in parte l'ADR 0001: le righe «Lingua: codice e commit in inglese» (mappa, riga 20) e «Commenti XML in inglese sui membri pubblici» (mappa, riga 30). L'ADR 0001 resta invariato come traccia della decisione precedente.

## Contesto
Le regole dicevano «codice, identificatori e commenti in inglese» (`core.md` §9), con i commenti XML `<summary>` in inglese (`documentazione.md` §5b, `qualita.md` §0b, versioni brevi nel template, `frontend.md` per i test). L'utente chiede che il default sia l'italiano per ogni commento di codice, non solo per quelli XML, perché la documentazione del codice va letta da chi lavora in italiano.

## Decisione
1. **Commenti di codice in italiano per default**, tutti (XML `<summary>` compresi, e i commenti nel corpo del codice, nei test e nei file di configurazione).
2. **Identificatori in inglese**: nomi di classi, metodi, variabili, file, endpoint e chiavi di traduzione restano in inglese. Restano in inglese anche i messaggi di commit (`core.md` §9).
3. **Deroga solo su richiesta esplicita** dell'utente, per il caso o il progetto indicato. Non diventa la regola generale.
4. **Ambito:** il default si applica a ogni progetto gestito con queste regole. La cronologia (CHANGELOG delle versioni passate, ADR accettati) non si riscrive.

## Conseguenze
- Le regole in `.claude/rules/` (`core.md` §9, `documentazione.md` §5b, `qualita.md` §0b, `frontend.md` nella sezione test) e le versioni brevi in `_template/rules-standard/` dichiarano il default italiano (passi 1–5 di #88).
- Il plugin `kit` non verifica la lingua dei commenti: la regola resta scritta, non automatica.
- Per l'ADR 0001, la riga 20 vale ancora per identificatori e commit; la riga 30 è superata da questo ADR.
- Un progetto che vuole commenti in inglese lo dichiara nel `CLAUDE.md` come deroga esplicita.
