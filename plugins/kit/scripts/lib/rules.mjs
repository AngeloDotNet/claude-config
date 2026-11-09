// Funzioni condivise dagli hook che sorvegliano i file di regole (CLAUDE.md e
// .claude/rules/*.md): impronte SHA-256 e stato salvato in ~/.claude/session-rules-state.json
// (una voce per cartella di progetto). Usato da session-plan.mjs e prompt-start.mjs.
// Fail-open: loadState/saveState non lanciano mai.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export const STATE_FILE = path.join(os.homedir(), ".claude", "session-rules-state.json");

/** Chiave stabile di un progetto nello stato: percorso assoluto con barre dritte, senza barra finale. */
export function projectKey(cwd) {
  return path.resolve(cwd).replace(/\\/g, "/").replace(/\/+$/, "");
}

/** Impronte SHA-256 di CLAUDE.md e di .claude/rules/*.md, ordinate per nome. */
export function ruleFingerprints(cwd) {
  const files = [];
  if (existsSync(path.join(cwd, "CLAUDE.md"))) files.push("CLAUDE.md");
  const rulesDir = path.join(cwd, ".claude", "rules");
  if (existsSync(rulesDir)) {
    for (const entry of readdirSync(rulesDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith(".md")) files.push(`.claude/rules/${entry.name}`);
    }
  }
  const result = {};
  for (const rel of files.sort()) {
    result[rel] = createHash("sha256").update(readFileSync(path.join(cwd, rel))).digest("hex");
  }
  return result;
}

const HASH = /^[0-9a-f]{40,64}$/;
const MAX_DIFF_CHARS = 6000;

function git(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    timeout: 5000,
    maxBuffer: 1024 * 1024,
    windowsHide: true,
    stdio: ["ignore", "pipe", "ignore"],
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
  });
}

/** Hash di HEAD se `cwd` è in un repository git con almeno un commit; altrimenti null. */
export function gitHead(cwd) {
  try {
    const head = git(cwd, ["rev-parse", "HEAD"]).trim();
    return HASH.test(head) ? head : null;
  } catch {
    return null;
  }
}

/** Chiave dello stato che conserva l'hash di HEAD (separata dalle impronte, che sono per file). */
export function headKey(cwd) {
  return `${projectKey(cwd)}#head`;
}

/**
 * Differenze dei file indicati (percorsi relativi a `cwd`) tra il commit `since` e la cartella
 * di lavoro (commit successivi e modifiche non ancora committate). Stringa vuota se non c'è nulla da mostrare; null se git,
 * il repository o il commit non sono disponibili (il chiamante ripiega sulle sole impronte).
 * File non tracciati non compaiono: restano nell'elenco ricavato dalle impronte.
 */
export function rulesDiff(cwd, since, files) {
  if (typeof since !== "string" || !HASH.test(since)) return null; // valore dallo stato: mai passato a git se non è un hash
  if (!Array.isArray(files) || !files.length) return null;
  try {
    git(cwd, ["cat-file", "-e", `${since}^{commit}`]);
    // `files` sono solo i file cambiati dall'ultima registrazione: il diff non ripete ciò che è già stato segnalato.
    let diff = git(cwd, ["diff", "--no-color", "--no-ext-diff", since, "--", ...files]).trim();
    if (diff.length > MAX_DIFF_CHARS) diff = diff.slice(0, MAX_DIFF_CHARS) + "\n[...diff troncato]";
    return diff;
  } catch {
    return null;
  }
}

/** Registra nello stato impronte e hash di HEAD correnti (HEAD omesso se non c'è git). */
export function recordSnapshot(state, cwd, fingerprints) {
  state[projectKey(cwd)] = fingerprints;
  const head = gitHead(cwd);
  if (head) state[headKey(cwd)] = head;
  else delete state[headKey(cwd)];
}

export function loadState() {
  try {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    return state && typeof state === "object" && !Array.isArray(state) ? state : {};
  } catch {
    return {};
  }
}

export function saveState(state) {
  try {
    const tmp = `${STATE_FILE}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(state, null, 2));
    renameSync(tmp, STATE_FILE);
  } catch {
    // stato non scrivibile: si riproverà alla prossima volta
  }
}
