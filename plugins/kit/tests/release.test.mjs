// Test della lettura delle regole dall'ultimo tag di rilascio (lib/release.mjs): scelta del tag,
// lettura dal database git senza checkout, casi senza tag o senza manifest.
// Eseguire con: node --test plugins/kit/tests/release.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { compareRelease, latestReleaseTag, readAtTag, releaseSource } from "../scripts/lib/release.mjs";

const GIT = ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false"];
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...GIT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** Crea un repository temporaneo con un commit, eseguito `fn`, poi lo elimina. */
function withRepo(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-release-"));
  try {
    git(dir, "init", "-q", "-b", "main");
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const commit = (repo, relative, content, message = "chore: test") => {
  const file = path.join(repo, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  git(repo, "add", "--", relative);
  git(repo, "commit", "-q", "-m", message);
};

const manifest = (...names) => JSON.stringify({ schema: 1, moduli: names.map((nome) => ({ nome, cartella: "rules", applicabilita: "sempre", descrizione: "prova di modulo" })) });

test("compareRelease confronta X.Y.Z numericamente, non come testo", () => {
  assert.ok(compareRelease("3.10.0", "3.9.0") > 0);
  assert.ok(compareRelease("3.4.1", "3.4.0") > 0);
  assert.equal(compareRelease("3.4.0", "3.4.0"), 0);
});

test("sceglie il tag X.Y.Z più alto e ignora v-prefissi, suffissi e tag a due parti", () => {
  withRepo((repo) => {
    commit(repo, "a.txt", "1");
    for (const t of ["3.9.0", "3.10.0", "v9.0.0", "3.11.0-rc1", "4.0", "3.4.1"]) git(repo, "tag", t);
    assert.equal(latestReleaseTag(repo), "3.10.0");
  });
});

test("annotated tag contano come tag di rilascio", () => {
  withRepo((repo) => {
    commit(repo, "a.txt", "1");
    git(repo, "tag", "-a", "2.0.0", "-m", "release 2.0.0");
    assert.equal(latestReleaseTag(repo), "2.0.0");
  });
});

test("legge il manifest e i file dal tag anche se il disco e il branch sono cambiati", () => {
  withRepo((repo) => {
    commit(repo, "_template/moduli.json", manifest("core"));
    commit(repo, ".claude/rules/core.md", "versione del tag");
    git(repo, "tag", "1.0.0");
    // Dopo il tag: nuovo commit, modifica non committata sul disco e un branch diverso.
    commit(repo, ".claude/rules/core.md", "versione successiva al tag");
    writeFileSync(path.join(repo, ".claude", "rules", "core.md"), "modifica non committata");
    git(repo, "checkout", "-q", "-b", "altro");
    const source = releaseSource(repo);
    assert.equal(source.tag, "1.0.0");
    assert.deepEqual(source.moduli.map((m) => m.nome), ["core"]);
    assert.equal(source.leggi(".claude/rules/core.md"), "versione del tag");
    // La lettura non tocca il disco né il branch.
    assert.equal(readFileSync(path.join(repo, ".claude", "rules", "core.md"), "utf8"), "modifica non committata");
    assert.equal(git(repo, "branch", "--show-current").trim(), "altro");
  });
});

test("senza tag di rilascio non legge nulla e lo dice", () => {
  withRepo((repo) => {
    commit(repo, "_template/moduli.json", manifest("core"));
    assert.equal(latestReleaseTag(repo), null);
    const source = releaseSource(repo);
    assert.equal(source.tag, undefined);
    assert.match(source.errore, /nessun tag di rilascio/);
  });
});

test("con un tag senza manifest non legge nulla e lo dice", () => {
  withRepo((repo) => {
    commit(repo, "a.txt", "1");
    git(repo, "tag", "1.0.0");
    const source = releaseSource(repo);
    assert.match(source.errore, /non contiene _template\/moduli.json/);
    assert.equal(readAtTag(repo, "1.0.0", "_template/moduli.json"), null);
  });
});

test("un manifest del tag non valido non viene usato", () => {
  withRepo((repo) => {
    commit(repo, "_template/moduli.json", "{ non è json");
    git(repo, "tag", "1.0.0");
    assert.match(releaseSource(repo).errore, /non è JSON valido/);
    commit(repo, "_template/moduli.json", JSON.stringify({ schema: 1 }));
    git(repo, "tag", "1.0.1");
    assert.match(releaseSource(repo).errore, /non ha l'elenco dei moduli/);
  });
});

test("una cartella che non è un repository git non dà tag", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-nogit-"));
  try {
    assert.equal(latestReleaseTag(dir), null);
    assert.match(releaseSource(dir).errore, /nessun tag di rilascio/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
