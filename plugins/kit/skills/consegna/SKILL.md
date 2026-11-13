---
description: Controlla il lavoro corrente contro la checklist di consegna (core.md §0b) e segnala le voci mancanti, prima di dichiarare chiuso un compito. Non scrive file. Si lancia solo su richiesta.
model: sonnet
---

# Consegna: controllo prima di chiudere

Rispondi in italiano. Non modificare nessun file.

1. Leggi la checklist di consegna in `.claude/rules/core.md`, sezione «0b. Checklist di consegna». Se il file manca, dillo e fermati.
2. Raccogli il lavoro corrente in sola lettura: `git status --short`, `git diff --stat` e `git diff --cached --stat`, il branch corrente, `PIANO.md` se esiste, e l'esito dei test se sono stati eseguiti nella sessione.
3. Per ogni voce della checklist decidi: «ok» (verificata sul lavoro), «manca» (non fatta), «non pertinente» (il progetto o il lavoro non la riguardano). Le voci «non pertinente» non si commentano una per una: si elencano solo nel gruppo del passo 4.
4. Presenta il risultato in tre gruppi: ok, manca, non pertinente. Per ogni voce «manca» indica una riga di cosa fare.
5. Se una voce non si può verificare senza eseguire qualcosa (per esempio build o test), dillo: non segnarla come ok, e indica la skill che la verifica eseguendola: `/kit:verifica` (backend .NET), `/kit:verifica-frontend` (Angular), `/kit:sicurezza` (voci di sicurezza, se il lavoro tocca autenticazione, autorizzazione, upload, URL esterni o dati personali), `/code-review` per i difetti.
6. Non dichiarare chiuso il compito: il giudizio finale resta all'utente.
