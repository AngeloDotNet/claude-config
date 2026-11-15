// Test del log dei modelli (lib/modelli.mjs, modelli.mjs, avviso in session-close.mjs).
// Esecuzione, dalla root del repository:  node --test "plugins/kit/tests/modelli.test.mjs"
// Registri sintetici in cartelle temporanee e home finta: non toccano ~/.claude né registri reali.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { findTranscript, formatTotals, hasModelChange, modelLog, modelRuns, readModelRows } from "../scripts/lib/modelli.mjs";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
const sandboxes = [];

function sandbox() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-models-"));
  sandboxes.push(dir);
  return dir;
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

/** Riga di risposta del registro; `extra` aggiunge campi (isSidechain, attributionSkill). */
function reply(model, time, extra = {}) {
  return JSON.stringify({ type: "assistant", timestamp: time, message: { model, role: "assistant", content: [] }, ...extra });
}

function writeTranscript(file, lines) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, lines.join("\n") + "\n");
  return file;
}

const SONNET = "claude-sonnet-5-5";
const HAIKU = "claude-haiku-5-5";
const T1 = "2026-11-14T13:00:00.000Z";
const T2 = "2026-11-14T13:16:00.000Z";
const T3 = "2026-11-14T13:20:00.000Z";

function mixed(dir) {
  return writeTranscript(path.join(dir, "projects", "p", "s1.jsonl"), [
    reply(SONNET, T1),
    reply(SONNET, T1),
    reply(HAIKU, T2, { attributionSkill: "kit:verifica" }),
    reply(HAIKU, T2, { attributionSkill: "kit:verifica" }),
    reply(SONNET, T3),
    reply(HAIKU, T3, { isSidechain: true }),
  ]);
}

function localHm(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

describe("lettura del registro", () => {
  test("origine: sessione, skill (/plugin:skill) e subagent; righe non valide e non di risposta saltate", () => {
    const dir = sandbox();
    const file = writeTranscript(path.join(dir, "t.jsonl"), [
      "non json",
      "",
      JSON.stringify({ type: "user", message: { content: "ciao" } }),
      JSON.stringify({ type: "assistant", message: { role: "assistant" } }), // senza modello
      JSON.stringify({ type: "assistant", timestamp: T1, message: { model: "<synthetic>" } }),
      reply(SONNET, T1),
      reply(HAIKU, T2, { attributionSkill: "kit:verifica" }),
      reply(HAIKU, T3, { isSidechain: true, attributionSkill: "kit:verifica" }),
    ]);
    const rows = readModelRows(file);
    assert.deepEqual(rows.map((r) => [r.model, r.origin]), [
      [SONNET, "sessione"],
      [HAIKU, "/kit:verifica"],
      [HAIKU, "subagent"],
    ]);
  });

  test("file mancante, percorso non valido: nessuna riga, nessun errore", () => {
    assert.deepEqual(readModelRows(path.join(sandbox(), "non-esiste.jsonl")), []);
    assert.deepEqual(readModelRows(undefined), []);
    assert.deepEqual(readModelRows(42), []);
  });
});

describe("sequenza e testo", () => {
  test("un solo modello: nessun cambio", () => {
    const rows = readModelRows(writeTranscript(path.join(sandbox(), "t.jsonl"), [reply(SONNET, T1), reply(SONNET, T2)]));
    assert.equal(hasModelChange(rows), false);
  });

  test("più modelli: una voce per ogni cambio di modello o di origine, con ora locale e nome breve", () => {
    const rows = readModelRows(mixed(sandbox()));
    assert.equal(hasModelChange(rows), true);
    const runs = modelRuns(rows);
    assert.deepEqual(runs.map((r) => [r.model, r.origin]), [
      [SONNET, "sessione"],
      [HAIKU, "/kit:verifica"],
      [SONNET, "sessione"],
      [HAIKU, "subagent"],
    ]);
    const text = modelLog(rows);
    assert.match(text, /^Modelli usati in questa sessione:/);
    assert.ok(text.includes(`${localHm(T2)}  haiku-5-5   (/kit:verifica)`), text);
    assert.match(text, /\(subagent\)/);
    assert.doesNotMatch(text, /claude-/);
    assert.doesNotMatch(text, /Risposte per modello/);
  });

  test("totali per modello, dal più usato", () => {
    const rows = readModelRows(mixed(sandbox()));
    assert.match(formatTotals(rows), /^(sonnet-5-5: 3, haiku-5-5: 3|haiku-5-5: 3, sonnet-5-5: 3)$/);
    assert.equal(formatTotals(readModelRows(writeTranscript(path.join(sandbox(), "t.jsonl"), [reply(HAIKU, T1), reply(SONNET, T2), reply(SONNET, T3)]))), "sonnet-5-5: 2, haiku-5-5: 1");
    assert.match(modelLog(rows, { totals: true }), /Risposte per modello: .*3.*3\./);
  });

  test("registro senza risposte: messaggio esplicito", () => {
    assert.match(modelLog([]), /Nessuna risposta trovata/);
  });
});

describe("ricerca del registro per id di sessione", () => {
  test("trova <home>/.claude/projects/*/<id>.jsonl", () => {
    const home = sandbox();
    const file = writeTranscript(path.join(home, ".claude", "projects", "proj", "abcd1234-ef56.jsonl"), [reply(SONNET, T1)]);
    assert.equal(findTranscript("abcd1234-ef56", home), file);
    assert.equal(findTranscript("zzzz9999-0000", home), null);
  });

  test("id con separatori di percorso o troppo corto: rifiutato", () => {
    const home = sandbox();
    writeTranscript(path.join(home, ".claude", "projects", "proj", "secret.jsonl"), [reply(SONNET, T1)]);
    assert.equal(findTranscript("../proj/secret", home), null);
    assert.equal(findTranscript("..\\proj\\secret", home), null);
    assert.equal(findTranscript("abc", home), null);
    assert.equal(findTranscript(undefined, home), null);
  });
});

describe("comando modelli.mjs", () => {
  function runCli(args, home) {
    return spawnSync(process.execPath, [path.join(scripts, "modelli.mjs"), ...args], {
      encoding: "utf8",
      env: { ...process.env, USERPROFILE: home, HOME: home },
    });
  }

  test("--file: stampa sequenza e totali, exit 0", () => {
    const r = runCli(["--file", mixed(sandbox())], sandbox());
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Modelli usati in questa sessione:/);
    assert.match(r.stdout, /Risposte per modello:/);
  });

  test("id di sessione nella home finta; id sconosciuto: messaggio, exit 0", () => {
    const home = sandbox();
    writeTranscript(path.join(home, ".claude", "projects", "p", "abcd1234-ef56.jsonl"), [reply(SONNET, T1), reply(HAIKU, T2)]);
    assert.match(runCli(["abcd1234-ef56"], home).stdout, /haiku-5-5/);
    const unknown = runCli(["nonesiste-0000"], home);
    assert.equal(unknown.status, 0);
    assert.match(unknown.stdout, /Registro della sessione non trovato/);
    assert.equal(runCli([], home).status, 0);
  });
});

describe("avviso in session-close", () => {
  function close(home, cwd, input) {
    const r = spawnSync(process.execPath, [path.join(scripts, "session-close.mjs")], {
      input: JSON.stringify({ cwd, ...input }),
      encoding: "utf8",
      env: { ...process.env, USERPROFILE: home, HOME: home },
    });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim() ? JSON.parse(r.stdout).systemMessage : "";
  }

  function setup() {
    const base = sandbox();
    const home = path.join(base, "home");
    const cwd = path.join(base, "project");
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    mkdirSync(cwd, { recursive: true });
    return { base, home, cwd };
  }

  test("cambio di modello: avviso una sola volta per sessione; una sessione nuova lo ripropone", () => {
    const { base, home, cwd } = setup();
    const transcript = mixed(base);
    const first = close(home, cwd, { session_id: "s-one", transcript_path: transcript });
    assert.match(first, /Cambio di modello nella sessione/);
    assert.match(first, /\(\/kit:verifica\)/);
    assert.match(first, /Dettagli con \/kit:modelli/);
    assert.equal(close(home, cwd, { session_id: "s-one", transcript_path: transcript }), "");
    assert.match(close(home, cwd, { session_id: "s-two", transcript_path: transcript }), /Cambio di modello/);
  });

  test("un solo modello, registro mancante o senza session_id: silenzio (fail-open)", () => {
    const { base, home, cwd } = setup();
    const single = writeTranscript(path.join(base, "single.jsonl"), [reply(SONNET, T1), reply(SONNET, T2)]);
    assert.equal(close(home, cwd, { session_id: "s-a", transcript_path: single }), "");
    assert.equal(close(home, cwd, { session_id: "s-b", transcript_path: path.join(base, "non-esiste.jsonl") }), "");
    assert.equal(close(home, cwd, { transcript_path: mixed(base) }), "");
    assert.equal(close(home, cwd, { session_id: "s-c" }), "");
  });
});
