#!/usr/bin/env node
// Hook PreToolUse su AskUserQuestion: blocca la chiamata se contiene più di una
// domanda, per far rispettare la regola inviolabile di core.md ("nel dubbio, una
// domanda alla volta"). Claude riceve il motivo (stderr, exit 2) e riformula.
// Fail-open: input illeggibile o formato inatteso -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit-config`. Richiede Node.js.

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let count = 0;
  try {
    const input = JSON.parse(raw);
    const questions = input?.tool_input?.questions;
    count = Array.isArray(questions) ? questions.length : 0;
  } catch {
    process.exit(0);
  }

  if (count > 1) {
    process.stderr.write(
      `Bloccato: AskUserQuestion contiene ${count} domande. Regola inviolabile (core.md): una sola domanda per chiamata. ` +
        "Poni la domanda più bloccante, attendi la risposta, poi passa alla successiva.\n"
    );
    process.exit(2);
  }
  process.exit(0);
});
