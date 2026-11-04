#!/usr/bin/env node
// Hook PostToolUse su Write, Edit e MultiEdit: quando si modifica PIANO.md controlla che ogni
// passo spuntato `[x]` riporti nel proprio blocco l'esito di build e di test (core.md §6.21:
// il passo si spunta solo dopo i test). Il blocco di un passo va dalla riga della casella
// fino alla casella successiva, a un titolo o alla fine del file. Se manca l'esito, exit 2 e il
// motivo su stderr: Claude lo riceve e corregge il piano. Il file già scritto non viene annullato.
// Fail-open: file assente, input illeggibile o errore interno -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const CHECKBOX = /^\s*(?:[-*]|\d+\.)\s+\[[ x~]\]/i;
const CHECKED = /^\s*(?:[-*]|\d+\.)\s+\[x\]/i;
const HEADING = /^#{1,6}\s/;

/** Passi spuntati senza esito di build e di test: restituisce il titolo di ciascuno. */
function uncheckedVerifications(text) {
  const lines = text.split(/\r?\n/);
  const missing = [];
  for (let i = 0; i < lines.length; i++) {
    if (!CHECKED.test(lines[i])) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && !CHECKBOX.test(lines[j]) && !HEADING.test(lines[j]); j++) block.push(lines[j]);
    const body = block.join("\n");
    const hasBuild = /\b(build|compil\w*)\b/i.test(body);
    const hasTest = /\btest\b/i.test(body);
    if (!hasBuild || !hasTest) missing.push(lines[i].replace(CHECKED, "").trim().slice(0, 80));
  }
  return missing;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let missing = [];
  try {
    const input = JSON.parse(raw);
    const file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    if (path.basename(file) !== "PIANO.md" || !existsSync(file)) process.exit(0);
    missing = uncheckedVerifications(readFileSync(file, "utf8"));
  } catch {
    process.exit(0);
  }
  if (missing.length) {
    process.stderr.write(
      `PIANO.md: passo spuntato [x] senza esito di build e di test: ${missing.map((t) => `"${t}"`).join(", ")}. ` +
        "Riporta nel passo l'esito della verifica (es. \"Verifica: build senza errori, test 12/12 verdi\") oppure riportalo " +
        "come [ ] finché i test non sono eseguiti (core.md §6.21).\n"
    );
    process.exit(2);
  }
  process.exit(0);
});
