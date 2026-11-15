// Log dei modelli usati in una sessione, letto dal registro della sessione (file .jsonl in
// ~/.claude/projects/<progetto>/<id>.jsonl, indicato ai hook da `transcript_path`).
// Ogni risposta ha `message.model` (il modello che l'ha generata), `isSidechain` (true per i
// subagent) e, se avviata da una skill, `attributionSkill` ("plugin:skill"). Il formato è interno a
// Claude Code e non è documentato: ogni lettura è fail-open (righe o campi non validi si saltano).
// Sola lettura: non scrive nulla. Usato da session-close.mjs e da modelli.mjs (comando /kit:modelli).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Righe di risposta del registro: { time, model, origin }; `origin` è «sessione», «/plugin:skill» o «subagent». */
export function readModelRows(transcriptPath) {
  if (typeof transcriptPath !== "string" || !existsSync(transcriptPath)) return [];
  const rows = [];
  for (const line of readFileSync(transcriptPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    const model = entry?.type === "assistant" ? entry.message?.model : null;
    if (typeof model !== "string" || !model || model.startsWith("<")) continue; // «<synthetic>» e simili
    const skill = typeof entry.attributionSkill === "string" && entry.attributionSkill ? entry.attributionSkill : null;
    rows.push({
      time: typeof entry.timestamp === "string" ? entry.timestamp : null,
      model,
      origin: entry.isSidechain === true ? "subagent" : skill ? `/${skill}` : "sessione",
    });
  }
  return rows;
}

/** true se nella sessione compare più di un modello (subagent compresi). */
export function hasModelChange(rows) {
  return new Set(rows.map((r) => r.model)).size > 1;
}

/** Sequenza compatta: una voce per ogni cambio di modello o di origine rispetto alla risposta precedente. */
export function modelRuns(rows) {
  const runs = [];
  for (const row of rows) {
    const last = runs[runs.length - 1];
    if (last && last.model === row.model && last.origin === row.origin) continue;
    runs.push({ time: row.time, model: row.model, origin: row.origin });
  }
  return runs;
}

function shortModel(model) {
  return model.replace(/^claude-/, "");
}

function localTime(iso) {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "--:--";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Righe di testo della sequenza: «13:16  haiku-5-5  (/kit:verifica)». */
export function formatRuns(runs) {
  const width = Math.max(0, ...runs.map((r) => shortModel(r.model).length));
  return runs.map((r) => ` ${localTime(r.time)}  ${shortModel(r.model).padEnd(width)}  (${r.origin})`);
}

/** Totale delle risposte per modello, dal più usato: «sonnet-5-5: 182, haiku-5-5: 8». */
export function formatTotals(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.model, (counts.get(row.model) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([model, n]) => `${shortModel(model)}: ${n}`).join(", ");
}

/** Testo del log (senza intestazione di contesto); `totals` aggiunge il totale per modello (comando su richiesta). */
export function modelLog(rows, { totals = false } = {}) {
  if (!rows.length) return "Nessuna risposta trovata nel registro della sessione.";
  const lines = ["Modelli usati in questa sessione:", ...formatRuns(modelRuns(rows))];
  if (totals) lines.push(`Risposte per modello: ${formatTotals(rows)}.`);
  return lines.join("\n");
}

/** Percorso del registro di una sessione dall'id, cercato in ~/.claude/projects/*; null se non c'è o l'id non è valido. */
export function findTranscript(sessionId, home = os.homedir()) {
  if (typeof sessionId !== "string" || !/^[0-9a-zA-Z-]{8,64}$/.test(sessionId)) return null; // niente separatori di percorso
  const projects = path.join(home, ".claude", "projects");
  if (!existsSync(projects)) return null;
  for (const dir of readdirSync(projects)) {
    const file = path.join(projects, dir, `${sessionId}.jsonl`);
    if (existsSync(file)) return file;
  }
  return null;
}
