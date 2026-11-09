#!/usr/bin/env node
// Hook UserPromptSubmit: unisce due controlli che aggiungono testo al contesto di Claude a ogni messaggio.
// Lo stdout di un hook UserPromptSubmit viene aggiunto al contesto di Claude.
// - ask-one-question: ricorda la regola inviolabile di core.md ("nel dubbio, una domanda alla volta").
//   Il testo qui sotto va tenuto allineato a core.md.
// - rules-watch: confronta le impronte di CLAUDE.md e .claude/rules/*.md con quelle salvate in
//   ~/.claude/session-rules-state.json. Se qualcosa è cambiato
//   durante la sessione (per esempio dopo un `git pull`), ordina di rileggere i file cambiati e allega
//   il `git diff` dei soli file cambiati, calcolato dall'hash di HEAD salvato. Una volta per sessione
//   confronta anche le regole del progetto con quelle del template (KIT_CONFIG_TEMPLATE_DIR, vedi
//   lib/template.mjs). Non copia nulla e non obbliga Claude a rileggere.
// Ogni controllo è isolato: una sezione che fallisce non nasconde l'altra. Fail-open: nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import { headKey, loadState, projectKey, recordSnapshot, ruleFingerprints, rulesDiff, saveState } from "./lib/rules.mjs";
import { templateSection } from "./lib/template.mjs";

const REMINDER = `[Regola inviolabile, sempre attiva] Se hai un dubbio, un'ambiguità o più strade ragionevoli, NON decidere in autonomia e NON procedere per assunzione: fermati, poni UNA SOLA domanda (anche con AskUserQuestion: una domanda per chiamata, mai più insieme) e attendi la risposta prima di fare altro che ne dipenda. Dettagli: core.md, sezione in testa e §6 punto 5. Prima di modificare codice tieni il piano in PIANO.md (con le conclusioni dell'analisi); i problemi trovati lavorando vanno in CHECKLIST.md senza interrompere il lavoro (core.md §6 punti 20-22).`;

// `state` è lo stato letto una sola volta da main: le sezioni lo modificano, main lo salva.
function rulesChangedSection(cwd, state) {
  const current = ruleFingerprints(cwd);
  if (!Object.keys(current).length) return null;
  const key = projectKey(cwd);
  const previous = state[key];
  if (!previous || typeof previous !== "object") {
    recordSnapshot(state, cwd, current); // prima volta: solo registrazione
    return null;
  }

  const changed = Object.keys(current).filter((f) => previous[f] !== current[f]);
  const removed = Object.keys(previous).filter((f) => !(f in current));
  if (!changed.length && !removed.length) return null;

  // Il diff si calcola prima di aggiornare lo stato: parte dall'hash di HEAD salvato.
  const diff = rulesDiff(cwd, state[headKey(cwd)], [...changed, ...removed]);
  recordSnapshot(state, cwd, current);

  let text = "[Regole cambiate durante la sessione]";
  if (changed.length) {
    text += ` Prima di rispondere rileggi con Read questi file, perché contengono regole nuove o modificate: ${changed.join(", ")}.`;
  }
  if (removed.length) text += ` File di regole rimossi: ${removed.join(", ")}.`;
  if (diff) text += `\n\nDifferenze rispetto all'ultima registrazione (git diff):\n${diff}`;
  return text;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const parts = [REMINDER];
  try {
    let cwd = process.cwd();
    let sessionId = "";
    try {
      const input = JSON.parse(raw);
      cwd = input?.cwd || cwd;
      sessionId = typeof input?.session_id === "string" ? input.session_id : "";
    } catch {
      // stdin non JSON: si usa la cartella corrente
    }
    const state = loadState();
    const before = JSON.stringify(state);
    for (const section of [() => rulesChangedSection(cwd, state), () => templateSection(cwd, sessionId, state)]) {
      try {
        const text = section();
        if (text) parts.push(text);
      } catch {
        // una sezione che fallisce non deve nascondere l'altra
      }
    }
    if (JSON.stringify(state) !== before) saveState(state);
  } catch {
    // fail-open: resta il promemoria
  }
  process.stdout.write(parts.join("\n\n") + "\n");
});
