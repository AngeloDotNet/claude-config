// Test degli script uniti (check-write, session-close): più controlli dello stesso gruppo emettono
// un solo JSON, e il blocco di check-plan resta exit 2. Eseguire con:
// node --test plugins/kit/tests/merged.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

function run(script, input, cwd) {
  const r = spawnSync(process.execPath, [path.join(scripts, script)], {
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 15000,
    cwd,
  });
  return { code: r.status, out: r.stdout ?? "", err: r.stderr ?? "" };
}

/** Progetto del kit (con .claude/rules/core.md) in una cartella temporanea, passato a fn. */
function kitProject(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-merged-"));
  try {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n", "utf8");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("check-write: avvisi di qualità e di pratica escono in un solo JSON", () => {
  kitProject((dir) => {
    const file = path.join(dir, "src", "app", "foo.ts");
    const content = "const x: any = 1;\nconsole.log(x);\n";
    const r = run("check-write.mjs", { tool_name: "Write", cwd: dir, tool_input: { file_path: file, content } });
    assert.equal(r.code, 0);
    const json = JSON.parse(r.out);
    assert.match(json.systemMessage, /Avviso di qualità/);
    assert.match(json.systemMessage, /Avviso di pratica/);
    assert.match(json.hookSpecificOutput.additionalContext, /non bloccante/);
  });
});

test("check-write: PIANO.md con [x] senza esito blocca con exit 2 anche con il piano scritto", () => {
  kitProject((dir) => {
    const file = path.join(dir, "PIANO.md");
    writeFileSync(file, "- [x] 1. Passo senza verifiche\n", "utf8");
    const r = run("check-write.mjs", { tool_input: { file_path: file } }, dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /senza esito di build e di test/);
  });
});

test("session-close: il promemoria del piano esce come un solo JSON con systemMessage", () => {
  kitProject((dir) => {
    writeFileSync(path.join(dir, "PIANO.md"), "- [ ] 1. Da fare\n", "utf8");
    const r = run("session-close.mjs", { cwd: dir }, dir);
    assert.equal(r.code, 0);
    const json = JSON.parse(r.out);
    assert.match(json.systemMessage, /PIANO\.md: restano 1 passi aperti/);
  });
});
