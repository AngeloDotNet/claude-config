#!/usr/bin/env node
// Controllo CI delle deroghe `kit-allow` (core.md §6, punto 23): elenca nel riepilogo del job e nelle
// annotazioni tutte le righe aggiunte nel diff della pull request che contengono `kit-allow:`, così la
// review le vede. Segnala anche le deroghe con formato non valido (id mancante o motivo troppo corto).
// Non blocca la pull request: l'approvazione resta alla review.
//
// Uso: node kit-allow-report.mjs   (variabile BASE_REF, default origin/main)
// In GitHub Actions scrive anche su GITHUB_STEP_SUMMARY. Usa solo Node.js e git.
// Errore di git (base non trovata, repository assente): exit 1 con messaggio, mai un elenco vuoto silenzioso.

import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = process.env.BASE_REF || "origin/main";
// Stessa forma del hook guard-patterns: kit-allow: <id> — <motivo di almeno 8 caratteri>.
const WAIVER = /kit-allow:\s*([\w-]+)\s*[—–-]\s*(\S.{6,})/;

/** Righe aggiunte con `kit-allow:` nel diff unificato, con file e numero di riga nel nuovo file. */
export function addedWaivers(diff) {
  const out = [];
  let file = "";
  let line = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      file = raw.slice(4).replace(/^b\//, "");
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(raw);
    if (hunk) {
      line = Number(hunk[1]);
      continue;
    }
    if (raw.startsWith("+") && !raw.startsWith("+++")) {
      const text = raw.slice(1);
      if (text.includes("kit-allow:")) {
        const m = WAIVER.exec(text);
        out.push({ file, line, text: text.trim(), valid: Boolean(m) });
      }
      line += 1;
    }
  }
  return out;
}

/** Tabella Markdown per il riepilogo del job. */
export function summaryMarkdown(waivers) {
  if (!waivers.length) return "## Deroghe kit-allow\n\nNessuna deroga `kit-allow` nel diff.\n";
  const rows = waivers.map((w) => `| ${w.file} | ${w.line} | ${w.valid ? "valida" : "**formato non valido**"} | \`${w.text.replace(/\|/g, "\\|")}\` |`);
  return ["## Deroghe kit-allow", "", "Da controllare in review: ogni deroga va approvata (core.md §6, punto 23).", "", "| File | Riga | Stato | Deroga |", "|---|---|---|---|", ...rows, ""].join("\n");
}

function main() {
  let diff;
  try {
    diff = execFileSync("git", ["diff", "--unified=0", `${BASE}...HEAD`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    process.stderr.write(`kit-allow-report: impossibile leggere il diff con ${BASE}...HEAD (${err.message.split("\n")[0]}). Imposta BASE_REF o recupera la storia (fetch-depth: 0).\n`);
    process.exit(1);
  }
  const waivers = addedWaivers(diff);
  const markdown = summaryMarkdown(waivers);
  process.stdout.write(markdown);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + "\n");
  for (const w of waivers) {
    const label = w.valid ? "deroga kit-allow" : "deroga kit-allow con formato non valido";
    process.stdout.write(`::notice file=${w.file},line=${w.line}::${label}: ${w.text}\n`);
  }
  process.exit(0);
}

main();
