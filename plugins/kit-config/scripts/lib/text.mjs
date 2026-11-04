// Funzioni condivise dai hook che leggono il testo scritto da Claude (Write, Edit, MultiEdit).
// Fail-open: nessuna funzione lancia eccezioni verso il chiamante.

import { existsSync } from "node:fs";
import path from "node:path";

/** Testo scritto dallo strumento: Write -> content; Edit -> new_string; MultiEdit -> edits[].new_string. */
export function writtenText(toolInput) {
  if (typeof toolInput?.content === "string") return toolInput.content;
  if (typeof toolInput?.new_string === "string") return toolInput.new_string;
  if (Array.isArray(toolInput?.edits)) {
    return toolInput.edits.map((e) => (typeof e?.new_string === "string" ? e.new_string : "")).join("\n");
  }
  return "";
}

// Deroga: "kit-allow: <id> — <motivo>" (il trattino può essere -, – o —). Motivo di almeno 8 caratteri.
const WAIVER = /kit-allow:\s*([\w-]+)\s*[—–-]\s*(\S.{6,})/;

/** True se la riga `index` o quella subito sopra dichiara la deroga `id` con un motivo. */
export function isWaived(lines, index, id) {
  for (const i of [index, index - 1]) {
    if (i < 0) continue;
    const m = WAIVER.exec(lines[i] ?? "");
    if (m && m[1] === id) return true;
  }
  return false;
}

/** I controlli valgono solo nei progetti che usano le regole del template (marcatore: .claude/rules/core.md). */
export function projectUsesKit(cwd) {
  try {
    return existsSync(path.join(cwd, ".claude", "rules", "core.md"));
  } catch {
    return false;
  }
}
