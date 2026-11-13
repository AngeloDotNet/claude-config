---
description: Controlla il lavoro corrente contro la checklist di consegna (core.md §0b) e segnala le voci mancanti, prima di dichiarare chiuso un compito. Non scrive file. Si lancia solo su richiesta.
model: sonnet
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Consegna: controllo prima di chiudere

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Non modificare nessun file.

1. Leggi la checklist di consegna in `.claude/rules/core.md`, sezione «0b. Checklist di consegna». Se il file manca, dillo e fermati.
2. Raccogli il lavoro corrente in sola lettura: `git status --short`, `git diff --stat` e `git diff --cached --stat`, il branch corrente, `PIANO.md` se esiste, e l'esito dei test se sono stati eseguiti nella sessione.
3. Per ogni voce della checklist decidi: «ok» (verificata sul lavoro), «manca» (non fatta), «non verificata» (si può dire solo eseguendo qualcosa) o «non pertinente» (il progetto o il lavoro non la riguardano). Le voci «non pertinente» non si commentano una per una: si elencano solo nel gruppo del passo 4.
4. Presenta il risultato in quattro gruppi: ok, manca, non verificata, non pertinente. Per ogni voce «manca» indica una riga di cosa fare; per ogni voce «non verificata» indica la skill del passo 5 che la verifica; l'elenco dei comandi da lanciare è al passo 6.
5. Questa skill non esegue nulla. Se una voce non si può verificare senza eseguire qualcosa (per esempio build o test), mettila in «non verificata»: non segnarla come ok. La skill che la verifica eseguendola si ricava dai file del diff e di `git status`:
   - file `*.cs`, `*.csproj`, `*.props` o `*.sln`: `/kit:verifica` (backend .NET);
   - file `*.ts`, `*.html`, `*.css`, `*.scss`, `angular.json` o `package.json`: `/kit:verifica-frontend` (Angular);
   - il lavoro tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali: `/kit:sicurezza`;
   - `/code-review` sempre, per i difetti;
   - dati personali: anche `/kit:gdpr-dati`, solo se il lavoro li riguarda davvero.
6. **Da lanciare.** Chiudi con un blocco «Da lanciare» che elenca, nell'ordine in cui conviene eseguirle, le sole skill del passo 5 che servono a questo lavoro, ognuna con una riga sul perché (per esempio «`/kit:verifica`: il diff tocca `*.cs`»). Se non serve nessuna, scrivilo. Non lanciarle tu: sono a lancio manuale dell'utente.
7. Non dichiarare chiuso il compito: il giudizio finale resta all'utente.
