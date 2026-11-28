#!/usr/bin/env node
// Hook Stop: unisce promemoria che non bloccano la chiusura: mostrano solo un systemMessage
// all'utente. Stop scatta a ogni risposta di Claude (non solo a fine sessione), quindi i promemoria
// tornano finché la situazione resta: non c'è uno stato per sessione.
// - site-reminder (core.md §5b, lib/sito.mjs): se CHANGELOG.md o README.md sono modificati e il sito
//   di documentazione della voce `sito` non ha modifiche, ricorda di aggiornarlo.
// - check-close (core.md §5b, qualita.md §0b, frontend-sicurezza-test.md §10): sulle modifiche non ancora committate ricorda
//   codice modificato senza CHANGELOG.md, modello EF cambiato senza migrazione, chiavi it.json /
//   en.json diverse. Usa `git status`; attivo solo nei progetti con il kit.
// - model-log (lib/modelli.mjs): una volta per sessione, al primo cambio di modello letto dal registro
//   (`transcript_path`), mostra la sequenza dei modelli; il dettaglio è nel comando /kit:modelli.
// Ogni controllo è isolato. Fail-open: qualunque errore -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js; git nel PATH per check-close.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { projectUsesKit } from "./lib/text.mjs";
import { readConfig, siteReminder } from "./lib/sito.mjs";
import { hasModelChange, modelLog, readModelRows } from "./lib/modelli.mjs";
import { loadState, projectKey, saveState } from "./lib/rules.mjs";

// --- model-log (una volta per sessione, al primo cambio di modello) ---

/** Avviso sul cambio di modello, o null: un solo modello, avviso già dato in questa sessione, registro illeggibile. */
function modelChangeNote(input, cwd) {
  const sessionId = typeof input?.session_id === "string" ? input.session_id : "";
  if (!sessionId) return null;
  const rows = readModelRows(input?.transcript_path);
  if (!hasModelChange(rows)) return null;
  const state = loadState();
  const markerKey = `${projectKey(cwd)}#models`;
  if (state[markerKey] === sessionId) return null;
  state[markerKey] = sessionId;
  saveState(state);
  return `Cambio di modello nella sessione.\n${modelLog(rows)}\nDettagli con /kit:modelli.`;
}

// --- check-close ---

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
    notes.push("modello EF modificato senza una nuova migrazione (qualita.md §0b)");
  }
  const i18nDirs = [...new Set(paths.filter((p) => I18N.test(p)).map((p) => path.posix.dirname(p)))];
  for (const dir of i18nDirs) notes.push(...parityNotes(root, dir));
  return notes;
}

/** Promemoria di chiusura sulle modifiche non committate (lista vuota se nulla o senza git). */
function closeNotes(cwd) {
  if (!projectUsesKit(cwd)) return [];
  const opts = { cwd, encoding: "utf8", timeout: 5000, windowsHide: true, stdio: ["ignore", "pipe", "ignore"] };
  const root = execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], opts).trim();
  const status = execFileSync("git", ["-C", cwd, "status", "--porcelain", "-uall"], opts);
  const paths = status
    .split("\n")
    .filter((l) => l.length > 3)
    .map((l) => l.slice(3).split(" -> ").pop().replace(/^"|"$/g, "").replace(/\\/g, "/"));
  return closeFindings(paths, root);
}

/** Esegue un controllo isolato: un errore restituisce il valore di ripiego. */
function attempt(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    const messages = [];
    const close = attempt(() => closeNotes(cwd), []);
    if (close.length) messages.push(`Promemoria prima di chiudere: ${close.join("; ")}.`);
    const site = attempt(() => siteReminder(cwd, readConfig()), null);
    if (site) messages.push(site);
    const models = attempt(() => modelChangeNote(input, cwd), null);
    if (models) messages.push(models);
    if (messages.length) process.stdout.write(JSON.stringify({ systemMessage: messages.join("\n") }) + "\n");
  } catch {
    process.exit(0);
  }
  process.exit(0);
});
