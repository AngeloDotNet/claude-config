// Test dei hook di inizio messaggio e di inizio sessione: ask-one-question (promemoria),
// limit-one-question (una domanda per chiamata) e session-plan (PIANO.md nel contesto).
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
  const r = run("ask-one-question.mjs", {});
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

test("session-plan: PIANO.md con passi aperti entra nel contesto di inizio sessione", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kit-plan-"));
  writeFileSync(path.join(cwd, "PIANO.md"), "# Piano\n\n- [x] 1. Fatto\n  Verifica: build ok, test ok\n- [ ] 2. Da fare\n", "utf8");
  const r = run("session-plan.mjs", { cwd, session_id: "s1" });
  assert.equal(r.code, 0);
  assert.match(r.out, /PIANO\.md/);
  assert.match(r.out, /\[ \] 2\. Da fare/);
  rmSync(cwd, { recursive: true, force: true });
});

test("session-plan: senza PIANO.md e senza regole non aggiunge nulla al contesto", () => {
  const cwd = mkdtempSync(path.join(os.tmpdir(), "kit-noplan-"));
  const r = run("session-plan.mjs", { cwd, session_id: "s2" });
  assert.equal(r.code, 0);
  assert.equal(r.out.trim(), "");
  rmSync(cwd, { recursive: true, force: true });
});
