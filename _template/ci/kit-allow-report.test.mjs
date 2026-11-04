// Test del controllo CI kit-allow-report: elenca le deroghe aggiunte nel diff e segnala quelle non valide.
// Ogni test usa un repository git temporaneo. Eseguire con: node --test _template/ci/kit-allow-report.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "kit-allow-report.mjs");

function git(cwd, ...args) {
  return execFileSync("git", ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args], { cwd, encoding: "utf8" }).trim();
}

/** Repository con un commit di base (file vuoto) e un secondo commit con `added` aggiunto a src/Repo.cs. */
function repoWith(added) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-allow-ci-"));
  git(dir, "init", "-q");
  writeFileSync(path.join(dir, "Repo.cs"), "class Repo\n{\n}\n");
  git(dir, "add", "Repo.cs");
  git(dir, "commit", "-q", "-m", "base");
  const base = git(dir, "rev-parse", "HEAD");
  appendFileSync(path.join(dir, "Repo.cs"), added);
  git(dir, "commit", "-q", "-am", "change");
  return { dir, base };
}

function report(dir, base) {
  return spawnSync(process.execPath, [script], {
    cwd: dir,
    encoding: "utf8",
    env: { ...process.env, BASE_REF: base, GITHUB_STEP_SUMMARY: "" },
  });
}

test("deroga valida aggiunta nel diff: compare nel riepilogo con file e riga, annotazione notice", () => {
  const { dir, base } = repoWith("    // kit-allow: soppressione — analyzer falso positivo verificato\n");
  try {
    const r = report(dir, base);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /\| Repo\.cs \| 4 \| valida \|/);
    assert.match(r.stdout, /::notice file=Repo\.cs,line=4::deroga kit-allow: /);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("deroga con motivo troppo corto o id mancante: segnalata come formato non valido", () => {
  const { dir, base } = repoWith("// kit-allow: skip — ok\n// kit-allow: —\n");
  try {
    const r = report(dir, base);
    assert.equal(r.status, 0);
    assert.equal((r.stdout.match(/formato non valido/g) ?? []).length >= 2, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("nessuna deroga nel diff: riepilogo vuoto, exit 0", () => {
  const { dir, base } = repoWith("class Nuova {}\n");
  try {
    const r = report(dir, base);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /Nessuna deroga `kit-allow` nel diff/);
    assert.doesNotMatch(r.stdout, /::notice/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("base inesistente: exit 1 con messaggio, non un elenco vuoto silenzioso", () => {
  const { dir } = repoWith("class Nuova {}\n");
  try {
    const r = report(dir, "rami-che-non-esistono");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /impossibile leggere il diff/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
