#!/usr/bin/env node
// Hook SessionStart: sincronizza le regole del progetto all'avvio (ADR 0004, #142). Spento per default:
// si attiva per progetto con "sincronizzazione": true in ~/.claude/kit-progetti.json (lib/avvio.mjs).
// Il testo va nel contesto di Claude come additionalContext. Fail-open: senza testo non scrive nulla.
// Registrato in hooks/hooks.json con un tempo massimo. Richiede Node.js.

import { avvioSessione } from "./lib/avvio.mjs";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let testo = null;
  try {
    let input = {};
    try {
      input = JSON.parse(raw);
    } catch {
      // stdin non JSON: si usa la cartella corrente e nessuna sorgente, quindi nessuna azione
    }
    testo = avvioSessione({ cwd: input?.cwd || process.cwd(), source: input?.source });
  } catch {
    testo = null; // fail-open: nessuna modifica, nessun messaggio
  }
  if (testo) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: testo } }) + "\n");
  }
});
