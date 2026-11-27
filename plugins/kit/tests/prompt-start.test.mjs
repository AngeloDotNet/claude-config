// Test dei hook di inizio messaggio e di inizio sessione: ask-one-question (promemoria),
// limit-one-question (una domanda per chiamata).
// Usano cartelle temporanee e una home finta: non toccano ~/.claude.
// Eseguire con: node --test plugins/kit/tests/prompt-start.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

/** Esegue uno script con input su stdin e una home finta (USERPROFILE/HOME). */
function run(script, input, { home, cwd } = {}) {
  const fakeHome = home ?? mkdtempSync(path.join(os.tmpdir(), "kit-home-"));
  const r = spawnSync(process.execPath, [path.join(scripts, script)], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
    timeout: 15000,
    cwd: cwd ?? os.tmpdir(),
    env: { ...process.env, USERPROFILE: fakeHome, HOME: fakeHome },
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

test("ask-one-question: il promemoria della regola inviolabile esce su stdout con exit 0", () => {
  const r = run("prompt-start.mjs", {});
  assert.equal(r.code, 0);
  assert.match(r.out, /Regola inviolabile/);
  assert.match(r.out, /UNA SOLA domanda/);
});

test("limit-one-question: una sola domanda passa, due o più bloccano con exit 2", () => {
  const one = { tool_input: { questions: [{ question: "Quale branch?" }] } };
  const two = { tool_input: { questions: [{ question: "Quale branch?" }, { question: "Quale lingua?" }] } };
  assert.equal(run("limit-one-question.mjs", one).code, 0);
  const blocked = run("limit-one-question.mjs", two);
  assert.equal(blocked.code, 2);
  assert.match(blocked.err, /una domanda alla volta|una sola domanda/i);
});

test("limit-one-question: input malformato o senza domande non blocca (fail-open)", () => {
  assert.equal(run("limit-one-question.mjs", "non json").code, 0);
  assert.equal(run("limit-one-question.mjs", { tool_input: {} }).code, 0);
});

/** Cartella temporanea di progetto: con o senza le regole del kit e con il CLAUDE.md indicato. */
function project({ kit = true, claudeMd } = {}) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-prj-"));
  if (kit) {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n");
  }
  if (claudeMd !== undefined) writeFileSync(path.join(dir, "CLAUDE.md"), claudeMd);
  return dir;
}

/** Riga del promemoria emessa per il progetto indicato. */
function reminderFor(options) {
  const dir = project(options);
  try {
    const r = run("prompt-start.mjs", { cwd: dir }, { cwd: dir });
    assert.equal(r.code, 0);
    return r.out.split("\n").find((line) => line.startsWith("[Regola inviolabile")) ?? "";
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const PLAN = /issue padre/;

test("promemoria: con standard, strutturato o profilo non dichiarato richiama il piano per il lavoro non piccolo", () => {
  const cases = [
    undefined,
    "- **Profilo:** standard\n",
    "- **Profilo:** strutturato\n",
    "- **Profilo:** [strutturato (default) | standard | mini] — `mini` (script)\n",
  ];
  for (const claudeMd of cases) {
    const line = reminderFor({ claudeMd });
    assert.match(line, PLAN, String(claudeMd));
    assert.match(line, /lavoro non piccolo/, String(claudeMd));
  }
});

test("promemoria: con il profilo mini non richiama piano e issue", () => {
  for (const claudeMd of ["- **Profilo:** mini — `mini` (script, tool interno)\n", "- **Profilo:** `mini`\r\n", "Profilo: mini\n"]) {
    const line = reminderFor({ claudeMd });
    assert.match(line, /UNA SOLA domanda/, claudeMd);
    assert.doesNotMatch(line, PLAN, claudeMd);
  }
});

test("promemoria: in un progetto senza le regole del kit resta solo la regola della domanda unica", () => {
  const line = reminderFor({ kit: false, claudeMd: "- **Profilo:** strutturato\n" });
  assert.match(line, /UNA SOLA domanda/);
  assert.doesNotMatch(line, PLAN);
});
