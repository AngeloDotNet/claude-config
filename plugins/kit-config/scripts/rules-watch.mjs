#!/usr/bin/env node
// Hook UserPromptSubmit: a ogni messaggio dell'utente confronta le impronte di CLAUDE.md e
// .claude/rules/*.md con quelle salvate in ~/.claude/session-rules-state.json (le stesse
// usate da session-plan.mjs). Se qualcosa è cambiato durante la sessione (per esempio dopo
// un `git pull`), inserisce nel contesto l'ordine di rileggere i file cambiati e aggiorna
// lo stato, così il promemoria compare una volta sola. In un repository git allega il
// `git diff` dei soli file cambiati, calcolato dall'hash di HEAD salvato (commit successivi
// e modifiche non committate); senza git o con hash non valido, solo l'elenco dei file. Se nulla è cambiato, nessun output.
// Alla prima volta in un progetto si registra e basta.
// Una volta per sessione confronta anche le regole del progetto con quelle del template
// (cartella nella variabile KIT_CONFIG_TEMPLATE_DIR, nessun default: se manca, avvisa): se il template
// ha un core.md più recente lo segnala, se la cartella manca avvisa; non copia nulla
// (vedi lib/template.mjs). L'hook può ordinare la rilettura
// ma non obbligare Claude a farla.
// Fail-open: qualunque errore -> nessun output, nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit-config`. Richiede Node.js.

import { headKey, loadState, projectKey, recordSnapshot, ruleFingerprints, rulesDiff, saveState } from "./lib/rules.mjs";
import { templateSection } from "./lib/template.mjs";

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
    const parts = [];
    for (const section of [() => rulesChangedSection(cwd, state), () => templateSection(cwd, sessionId, state)]) {
      try {
        const text = section();
        if (text) parts.push(text);
      } catch {
        // una sezione che fallisce non deve nascondere l'altra
      }
    }
    if (JSON.stringify(state) !== before) saveState(state);
    if (parts.length) process.stdout.write(parts.join("\n\n") + "\n");
  } catch {
    // fail-open
  }
});
