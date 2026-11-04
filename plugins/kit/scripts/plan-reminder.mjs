#!/usr/bin/env node
// Hook Stop: se in PIANO.md (root del progetto) restano passi con casella `[ ]` o `[~]`, mostra
// all'utente un promemoria (systemMessage) prima di chiudere la sessione, così il piano non si
// lascia a metà senza che nessuno se ne accorga (core.md §6.15-16). Non blocca la chiusura.
// Fail-open: file assente, input illeggibile o errore interno -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const OPEN_STEP = /^\s*(?:[-*]|\d+\.)\s+\[[ ~]\]/;

/** Numero di passi con casella aperta (`[ ]` o `[~]`). */
function openSteps(text) {
  return text.split(/\r?\n/).filter((line) => OPEN_STEP.test(line)).length;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    const file = path.join(cwd, "PIANO.md");
    if (!existsSync(file)) process.exit(0);
    const open = openSteps(readFileSync(file, "utf8"));
    if (open > 0) {
      process.stdout.write(
        JSON.stringify({
          systemMessage: `PIANO.md: restano ${open} passi aperti. Prima di chiudere aggiorna le caselle o annota dove riprendere.`,
        }) + "\n"
      );
    }
  } catch {
    process.exit(0);
  }
  process.exit(0);
});
