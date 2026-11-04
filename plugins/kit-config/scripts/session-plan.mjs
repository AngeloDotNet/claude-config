#!/usr/bin/env node
// Hook SessionStart: a inizio sessione (startup, resume, clear, compact) inserisce nel
// contesto di Claude (lo stdout in chiaro di SessionStart viene aggiunto al contesto):
//  1. il piano di lavoro del progetto (core.md §6.16): prime 80 righe di PIANO.md più
//     tutte le righe con caselle aperte ("[ ]" e "[~]"); nulla se PIANO.md non esiste;
//  2. l'elenco dei file di regole cambiati dall'ultima sessione (CLAUDE.md e
//     .claude/rules/*.md), con l'ordine di rileggerli prima di agire. Le impronte
//     (SHA-256) stanno in ~/.claude/session-rules-state.json, per cartella di progetto.
//     Se la cartella è un repository git, registra anche l'hash di HEAD e allega il
//     `git diff` dei soli file cambiati (limite di caratteri rispettato; senza git, solo
//     l'elenco). Alla prima sessione di un progetto si registra e basta (le regole sono già caricate
//     all'avvio da Claude Code). Se nulla è cambiato, nessun testo in più.
// L'hook può ordinare la rilettura ma non obbligare Claude a farla.
// Fail-open: qualunque errore -> nessun output, nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit-config`. Richiede Node.js.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { headKey, loadState, projectKey, recordSnapshot, ruleFingerprints, rulesDiff, saveState } from "./lib/rules.mjs";

const HEAD_LINES = 80;
const MAX_CHARS = 9000; // il contesto accetta al massimo 10.000 caratteri per stringa
const MAX_TOTAL = 9800; // limite sull'output complessivo (regole + diff + piano)
const MIN_DIFF_BUDGET = 300; // sotto questo spazio residuo il diff si omette
const OPEN_BOX = /^\s*(?:[-*]\s*)?\[( |~)\]/;

function planSection(cwd) {
  const file = path.join(cwd, "PIANO.md");
  if (!existsSync(file)) return null;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  let body = lines.slice(0, HEAD_LINES).join("\n");
  if (lines.length > HEAD_LINES) {
    const open = lines.slice(HEAD_LINES).filter((l) => OPEN_BOX.test(l));
    body += `\n\n[...PIANO.md continua: ${lines.length - HEAD_LINES} righe omesse; qui sotto solo i passi con casella aperta]\n` + open.join("\n");
  }
  if (body.length > MAX_CHARS) body = body.slice(0, MAX_CHARS) + "\n[...troncato]";
  return (
    "[Promemoria di inizio sessione: PIANO.md del progetto] Il piano è qui sotto. Prima di agire dai un riepilogo di 3-4 righe " +
    "(passo corrente, decisioni aperte), come da core.md §6.16. Se hai un dubbio, una sola domanda.\n\n" +
    body
  );
}

function rulesSection(cwd, budget) {
  const current = ruleFingerprints(cwd);
  if (!Object.keys(current).length) return null;
  const key = projectKey(cwd);
  const state = loadState();
  const previous = state[key];
  const previousHead = state[headKey(cwd)];
  recordSnapshot(state, cwd, current);
  saveState(state);
  if (!previous || typeof previous !== "object") return null; // prima sessione: solo registrazione

  const changed = Object.keys(current).filter((f) => previous[f] !== current[f]);
  const removed = Object.keys(previous).filter((f) => !(f in current));
  if (!changed.length && !removed.length) return null;

  const text = rulesText(changed, removed);
  const diff = rulesDiff(cwd, previousHead, [...changed, ...removed]);
  const room = budget - text.length - 60; // 60 = intestazione del diff e a capo
  if (!diff || room < MIN_DIFF_BUDGET) return text;
  const body = diff.length > room ? diff.slice(0, room) + "\n[...diff troncato]" : diff;
  return `${text}\n\nDifferenze rispetto all'ultima sessione (git diff):\n${body}`;
}

function rulesText(changed, removed) {
  let text =
    "[Regole cambiate dall'ultima sessione] Prima di agire rileggi con Read questi file, perché potrebbero contenere regole nuove o modificate: " +
    changed.join(", ") +
    ".";
  if (!changed.length) text = "[Regole cambiate dall'ultima sessione]";
  if (removed.length) text += ` File di regole rimossi: ${removed.join(", ")}.`;
  return text;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    let cwd = process.cwd();
    try {
      cwd = JSON.parse(raw)?.cwd || cwd;
    } catch {
      // stdin non JSON: si usa la cartella corrente
    }
    const plan = planSection(cwd);
    const rules = rulesSection(cwd, MAX_TOTAL - (plan ? plan.length + 2 : 0));
    const parts = [rules, plan].filter(Boolean);
    if (parts.length) process.stdout.write(parts.join("\n\n") + "\n");
  } catch {
    // fail-open
  }
});
