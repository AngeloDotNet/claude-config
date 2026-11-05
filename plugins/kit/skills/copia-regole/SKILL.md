---
description: Copia le regole del template in un progetto che non le ha ancora, con i moduli scelti in conversazione. Equivale alla voce 1 di copia-regole.bat. Si lancia solo su richiesta.
argument-hint: [cartella-progetto]
disable-model-invocation: true
---

# Copia delle regole in un progetto

Rispondi in italiano. Una sola domanda per messaggio. Il template è la cartella indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR`.

1. Se la variabile non è impostata o la cartella non contiene `.claude/rules/core.md`, dillo e fermati.
2. Chiedi il percorso del progetto (se non è stato passato come argomento). Verifica che la cartella esista e non coincida con il template.
3. Se il progetto ha già `.claude/rules/`, fermati e suggerisci `/kit:aggiorna-regole`.
4. Copia sempre `core.md` e `git.md` in `.claude/rules/` del progetto.
5. Chiedi, una per volta, se includere: `security.md` (regole di sicurezza), backend (`backend.md`, `backend-architecture.md`, `backend-app.md`: tre file sempre insieme), `frontend.md`, `docker.md`, e tra i moduli opzionali `feature-workflow.md`, `backend-email.md`, `backend-infra.md` (questi tre in `.claude/rules-optional/`, non caricati).
6. File di root, uno per volta: `CLAUDE.md` (copiato solo se manca; se esiste non va toccato), `NuGet.config`, `.editorconfig`, `.gitignore`, `.gitattributes` (questi ultimi quattro solo se l'utente li vuole, e solo se mancano).
7. Crea `_template/avvio-progetto.md` nel progetto, copiandolo dal template.
8. Chiudi con il riepilogo di cosa è stato copiato e con il prossimo passo: aprire Claude Code nel progetto e scrivere «Applica le regole di questo progetto», poi verificare con `/context`.
9. Non creare commit.
