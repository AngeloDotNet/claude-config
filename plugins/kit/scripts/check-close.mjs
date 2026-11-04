#!/usr/bin/env node
// Hook Stop (batch C): promemoria a fine sessione su ciò che risulta non fatto nelle modifiche
// non ancora committate. Non blocca la chiusura: mostra solo un systemMessage all'utente.
// - codice modificato senza CHANGELOG.md aggiornato (core.md §5b).
// - modello EF (DbContext, Configuration, Entity) modificato senza una nuova migrazione (core.md §0b).
// - file di traduzione modificati con chiavi it.json / en.json diverse (core.md §0b, frontend.md §10).
// Usa `git status` (senza git o con errori: nessun output). Attivo solo nei progetti con .claude/rules/core.md.
// Fail-open: qualunque errore -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js e git nel PATH.

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { projectUsesKit } from "./lib/text.mjs";

const CODE = /\.(cs|csproj|props|ts|html|scss|css)$/i;
const MODEL = /(?:DbContext|Configuration|Entity|Entities|Configurations)[^/]*\.cs$|(?:^|\/)(?:Entities|Configurations)\//i;
const MIGRATION = /(?:^|\/)Migrations\//;
const I18N = /(?:^|\/)(?:i18n|locale|lang)\/[^/]+\.json$/i;

/** Chiavi di un oggetto JSON, con percorso puntato (es. "orders.title"). */
function flatKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

/** Chiavi presenti solo in una delle due lingue, per la cartella dei file i18n. */
function parityNotes(root, dir) {
  const itFile = path.join(root, dir, "it.json");
  const enFile = path.join(root, dir, "en.json");
  if (!existsSync(itFile) || !existsSync(enFile)) return [];
  try {
    const it = new Set(flatKeys(JSON.parse(readFileSync(itFile, "utf8"))));
    const en = new Set(flatKeys(JSON.parse(readFileSync(enFile, "utf8"))));
    const onlyIt = [...it].filter((k) => !en.has(k));
    const onlyEn = [...en].filter((k) => !it.has(k));
    const notes = [];
    if (onlyIt.length) notes.push(`chiavi in it.json e non in en.json (${dir}): ${onlyIt.slice(0, 3).join(", ")}`);
    if (onlyEn.length) notes.push(`chiavi in en.json e non in it.json (${dir}): ${onlyEn.slice(0, 3).join(", ")}`);
    return notes;
  } catch {
    return [];
  }
}

/** Promemoria per l'elenco dei file modificati (percorsi relativi alla radice del repository). */
function closeFindings(paths, root) {
  const notes = [];
  const docsFolder = (p) => p.startsWith(".claude/") || p.startsWith("docs/");
  const codeChanged = paths.some((p) => CODE.test(p) && !docsFolder(p));
  if (codeChanged && !paths.some((p) => /(?:^|\/)CHANGELOG\.md$/i.test(p))) {
    notes.push("codice modificato senza CHANGELOG.md aggiornato (core.md §5b)");
  }
  if (paths.some((p) => MODEL.test(p)) && !paths.some((p) => MIGRATION.test(p))) {
    notes.push("modello EF modificato senza una nuova migrazione (core.md §0b)");
  }
  const i18nDirs = [...new Set(paths.filter((p) => I18N.test(p)).map((p) => path.posix.dirname(p)))];
  for (const dir of i18nDirs) notes.push(...parityNotes(root, dir));
  return notes;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    if (!projectUsesKit(cwd)) process.exit(0);
    const opts = { cwd, encoding: "utf8", timeout: 5000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] };
    const root = execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], opts).trim();
    const status = execFileSync("git", ["-C", cwd, "status", "--porcelain", "-uall"], opts);
    const paths = status
      .split("\n")
      .filter((l) => l.length > 3)
      .map((l) => l.slice(3).split(" -> ").pop().replace(/^"|"$/g, "").replace(/\\/g, "/"));
    const notes = closeFindings(paths, root);
    if (notes.length) {
      process.stdout.write(JSON.stringify({ systemMessage: `Promemoria prima di chiudere: ${notes.join("; ")}.` }) + "\n");
    }
  } catch {
    process.exit(0);
  }
  process.exit(0);
});
