// Test del sito di documentazione (lib/sito.mjs e i due hook che lo usano).
// Eseguire dalla root del repository: node --test "plugins/kit/tests/*.test.mjs"
// Ogni test lavora in cartelle temporanee e con una "home" finta (USERPROFILE/HOME), così non
// tocca ~/.claude/kit-progetti.json reale. I repository git sono creati nelle cartelle temporanee.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { projectKey } from "../scripts/lib/rules.mjs";
import { siteQuestion, siteReminder } from "../scripts/lib/sito.mjs";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
const sandboxes = [];

function sandbox() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-sito-"));
  sandboxes.push(dir);
  return dir;
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

/** Repository git con un commit, con le regole del kit (serve a projectUsesKit). */
function project(dir, { files = {} } = {}) {
  mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
  writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n");
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(dir, name), text);
  execFileSync("git", ["-C", dir, "init", "-q"]);
  execFileSync("git", ["-C", dir, "add", "-A"]);
  execFileSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "init"]);
  return dir;
}

/** Cartella del sito come repository git con un commit (senza modifiche non committate). */
function siteRepo(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.md"), "# wiki\n");
  execFileSync("git", ["-C", dir, "init", "-q"]);
  execFileSync("git", ["-C", dir, "add", "-A"]);
  execFileSync("git", ["-C", dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "init"]);
  return dir;
}

/** Voce della configurazione per la radice del progetto. */
function config(root, sito) {
  return { [projectKey(root)]: { sito } };
}

describe("siteQuestion: quando chiedere la wiki", () => {
  test("voce mancante: domanda con la chiave del progetto", () => {
    const root = project(sandbox());
    const text = siteQuestion(root, {});
    assert.ok(text, "deve chiedere");
    assert.match(text, /sì\/no/);
    assert.ok(text.includes(projectKey(root)), "la chiave del progetto va nel testo");
  });

  test("esiste: false senza chiesto: domanda", () => {
    const root = project(sandbox());
    assert.ok(siteQuestion(root, config(root, { esiste: false })));
  });

  test("esiste: false con chiesto: true (dopo un no): nessuna domanda", () => {
    const root = project(sandbox());
    assert.equal(siteQuestion(root, config(root, { esiste: false, chiesto: true })), null);
  });

  test("esiste: true: nessuna domanda", () => {
    const root = project(sandbox());
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    assert.equal(siteQuestion(root, config(root, { esiste: true, percorso: wiki })), null);
  });

  test("progetto senza regole del kit: nessuna domanda", () => {
    const dir = sandbox();
    execFileSync("git", ["-C", dir, "init", "-q"]);
    assert.equal(siteQuestion(dir, {}), null);
  });

  test("configurazione malformata: domanda, nessun errore", () => {
    const root = project(sandbox());
    assert.ok(siteQuestion(root, { [projectKey(root)]: "non un oggetto" }));
  });
});

describe("siteReminder: promemoria di fine risposta", () => {
  test("CHANGELOG modificato e sito pulito: promemoria", () => {
    const root = project(sandbox());
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    writeFileSync(path.join(root, "CHANGELOG.md"), "# changelog\n");
    const text = siteReminder(root, config(root, { esiste: true, percorso: wiki }));
    assert.ok(text, "deve ricordare");
    assert.ok(text.includes(wiki));
  });

  test("README modificato e sito pulito: promemoria", () => {
    const root = project(sandbox(), { files: { "README.md": "# r\n" } });
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    writeFileSync(path.join(root, "README.md"), "# r2\n");
    assert.ok(siteReminder(root, config(root, { esiste: true, percorso: wiki })));
  });

  test("sito con modifiche non committate: nessun promemoria", () => {
    const root = project(sandbox());
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    writeFileSync(path.join(root, "CHANGELOG.md"), "# changelog\n");
    writeFileSync(path.join(wiki, "index.md"), "# wiki modificata\n");
    assert.equal(siteReminder(root, config(root, { esiste: true, percorso: wiki })), null);
  });

  test("nessun CHANGELOG né README modificato: nessun promemoria", () => {
    const root = project(sandbox());
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    writeFileSync(path.join(root, "altro.cs"), "class A {}\n");
    assert.equal(siteReminder(root, config(root, { esiste: true, percorso: wiki })), null);
  });

  test("esiste: false: nessun promemoria", () => {
    const root = project(sandbox());
    writeFileSync(path.join(root, "CHANGELOG.md"), "# changelog\n");
    assert.equal(siteReminder(root, config(root, { esiste: false })), null);
  });

  test("percorso del sito inesistente o non git: nessun promemoria, nessun errore", () => {
    const root = project(sandbox());
    writeFileSync(path.join(root, "CHANGELOG.md"), "# changelog\n");
    const notGit = sandbox();
    assert.equal(siteReminder(root, config(root, { esiste: true, percorso: notGit })), null);
    assert.equal(siteReminder(root, config(root, { esiste: true, percorso: path.join(notGit, "nope") })), null);
  });
});

describe("hook: prompt-start e session-close", () => {
  function run(script, cwd, home) {
    return spawnSync(process.execPath, [path.join(scripts, script)], {
      input: JSON.stringify({ cwd, session_id: "sito-test" }),
      encoding: "utf8",
      env: { ...process.env, USERPROFILE: home, HOME: home },
    });
  }

  test("prompt-start chiede la wiki quando manca la voce", () => {
    const home = sandbox();
    const root = project(sandbox());
    const result = run("prompt-start.mjs", root, home);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Sito di documentazione: domanda da fare/);
  });

  test("prompt-start non chiede dopo un no", () => {
    const home = sandbox();
    const root = project(sandbox());
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    writeFileSync(path.join(home, ".claude", "kit-progetti.json"), JSON.stringify(config(root, { esiste: false, chiesto: true })));
    const result = run("prompt-start.mjs", root, home);
    assert.doesNotMatch(result.stdout, /Sito di documentazione: domanda da fare/);
  });

  test("session-close ricorda il sito quando il progetto è cambiato", () => {
    const home = sandbox();
    const root = project(sandbox());
    const wiki = siteRepo(path.join(sandbox(), "wiki"));
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    writeFileSync(path.join(home, ".claude", "kit-progetti.json"), JSON.stringify(config(root, { esiste: true, percorso: wiki })));
    writeFileSync(path.join(root, "CHANGELOG.md"), "# changelog\n");
    const result = run("session-close.mjs", root, home);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Sito di documentazione: CHANGELOG\.md o README\.md/);
  });

  test("session-close con file di configurazione illeggibile: nessun errore", () => {
    const home = sandbox();
    const root = project(sandbox());
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    writeFileSync(path.join(home, ".claude", "kit-progetti.json"), "{ non json");
    const result = run("session-close.mjs", root, home);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(path.join(home, ".claude", "kit-progetti.json"), "utf8"), "{ non json");
  });
});
