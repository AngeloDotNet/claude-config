---
description: Copia le regole del template in un progetto che non le ha ancora, con i moduli scelti in conversazione; con la modalità solo Git copia soltanto core.md, lavoro.md e git.md. Si lancia solo su richiesta.
model: haiku
argument-hint: [cartella-progetto]
disable-model-invocation: true
---

# Copia delle regole in un progetto

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio. Il template è la cartella indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR`.

1. Se la variabile non è impostata o la cartella non contiene `.claude/rules/core.md`, dillo e fermati.
2. **Progetto di destinazione.** Se è stato passato un argomento, è quello (con precedenza su tutto). Altrimenti usa la cartella corrente se è valida: non coincide con il template (`KIT_CONFIG_TEMPLATE_DIR`), non ha ancora `.claude/rules/` ed è un repository git (`git rev-parse --show-toplevel`); in tal caso scrivi in una riga «Copio le regole in `<cartella>`» e prosegui senza chiedere. Se la cartella corrente non è valida (per esempio è il template), chiedi il percorso con una sola domanda. In ogni caso verifica che la cartella esista e non coincida con il template.
3. Se il progetto ha già `.claude/rules/`, fermati e suggerisci `/kit:aggiorna-regole`.
4. Chiedi se il progetto è **solo Git** (solo branch e commit: nessun backend, frontend o sicurezza previsti).
   - **Sì, solo Git:** copia `core.md`, `lavoro.md` e `git.md` in `.claude/rules/`. Non chiedere i moduli facoltativi (punto 5) né `NuGet.config` e `.editorconfig` (punto 6). Dei file di root (punto 6) chiedi solo `CLAUDE.md` (se manca), `.gitignore` e `.gitattributes`, uno per volta, se mancano.
   - **No:** copia sempre `core.md`, `lavoro.md` e `git.md` in `.claude/rules/` del progetto, poi continua con il punto 5.
5. Chiedi, una per volta e in quest'ordine, se includere: backend (`backend.md`, `backend-architecture.md`, `backend-app.md`: tre file sempre insieme), `frontend.md` (Angular), `security.md` (principi di sicurezza) e tra i moduli opzionali `feature-workflow.md`, `backend-email.md`, `backend-infra.md` (questi tre in `.claude/rules-optional/`, non caricati). `docker.md` non si chiede: è un modulo opzionale che si attiva solo su richiesta esplicita dell'utente (per esempio «crea un Dockerfile»), quindi si copia sempre in `.claude/rules-optional/`, non caricato, perché sia disponibile quando serve; dillo nel riepilogo. `security-backend.md` e `security-frontend.md` non si chiedono: seguono le risposte già date (`security-backend.md` se hai incluso il backend, `security-frontend.md` se hai incluso `frontend.md`) e solo se hai incluso `security.md`; dillo nel riepilogo. Solo nel caso «No» del punto 4.
6. File di root, uno per volta: `CLAUDE.md` (copiato solo se manca; se esiste non va toccato), `NuGet.config`, `.editorconfig`, `.gitignore`, `.gitattributes` (questi ultimi quattro solo se l'utente li vuole, e solo se mancano). Nel caso solo Git si chiedono solo `CLAUDE.md`, `.gitignore` e `.gitattributes`.
7. Crea la cartella `_template/` nel progetto copiando dal template `avvio-progetto.md` e i file di riferimento che esso cita (§ «Permessi di Claude Code» e «Lint e CI di riferimento»): `settings.example.json`, `eslint.config.example.js` e la cartella `ci/` (`ci.yml`, `kit-allow.yml`, `kit-allow-report.mjs`, `kit-allow-report.test.mjs`). Sono file di consultazione, non attivi: l'attivazione (per esempio `ci.yml` e `kit-allow.yml` in `.github/workflows/`) si decide dopo, con `avvio-progetto.md`. Non copiare `_template/CHECKLIST.md` né altri file del template.
8. Chiudi con il riepilogo di cosa è stato copiato e con il prossimo passo: aprire Claude Code nel progetto e scrivere «Applica le regole di questo progetto», poi verificare con `/context`.
9. Non creare commit.
