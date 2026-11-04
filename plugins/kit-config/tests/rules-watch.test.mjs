// Test degli hook che sorvegliano le regole (rules-watch.mjs, session-plan.mjs e lib/).
// Esecuzione, dalla root del repository:  node --test "plugins/kit-config/tests/*.test.mjs"
// Richiede Node.js e git. Nessuna dipendenza esterna (node:test).
//
// Ogni test lavora in cartelle temporanee e con una "home" finta (USERPROFILE/HOME), così
// non tocca ~/.claude/session-rules-state.json. I casi con git usano un clone locale di
// questo repository (nessun `git init`) su un branch di prova: i test vanno quindi eseguiti
// dentro il repository, che deve avere almeno un commit con .claude/rules.

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { compareVersions } from "../scripts/lib/template.mjs";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
const repoRoot = path.resolve(scripts, "..", "..", "..");
const sandboxes = [];

function sandbox() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-rules-"));
  sandboxes.push(dir);
  return dir;
}

function write(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/** Progetto finto con CLAUDE.md e le regole indicate ({ "core.md": "testo" }). */
function makeProject(root, rules = { "core.md": "> Versione 3.20 — rev\n# core\n", "git.md": "# git\n" }) {
  write(path.join(root, "CLAUDE.md"), "# progetto\n");
  for (const [name, text] of Object.entries(rules)) write(path.join(root, ".claude", "rules", name), text);
  return root;
}

/** Esegue uno script degli hook come farebbe Claude Code: JSON su stdin, stato in una home finta. */
function run(script, { cwd, home, template, session = "s1" }) {
  const env = { ...process.env, USERPROFILE: home, HOME: home };
  if (template === undefined) delete env.KIT_CONFIG_TEMPLATE_DIR;
  else env.KIT_CONFIG_TEMPLATE_DIR = template;
  const result = spawnSync(process.execPath, [path.join(scripts, script)], {
    input: JSON.stringify({ cwd, session_id: session }),
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0, `exit ${result.status}: ${result.stderr}`);
  return result.stdout;
}

function setup() {
  const base = sandbox();
  const home = path.join(base, "home");
  mkdirSync(path.join(home, ".claude"), { recursive: true });
  // Template finto alla stessa versione del progetto: silenzioso, salvo i test dedicati.
  const template = makeProject(path.join(base, "template"), { "core.md": "> Versione 3.20 — rev\n# core\n", "git.md": "# git\n" });
  const project = makeProject(path.join(base, "project"));
  return { base, home, template, project };
}

function git(cwd, ...args) {
  return execFileSync("git", ["-C", cwd, "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { encoding: "utf8" });
}

/**
 * Clona il repository in `target`. Se le regole non sono ancora committate (il clone parte da HEAD),
 * le copia dalla cartella di lavoro e le committa nel clone di prova: i test non dipendono dai commit.
 */
function cloneWithRules(target) {
  execFileSync("git", ["clone", "--quiet", repoRoot, target]);
  if (!existsSync(path.join(target, ".claude", "rules", "core.md"))) {
    mkdirSync(path.join(target, ".claude"), { recursive: true });
    cpSync(path.join(repoRoot, ".claude", "rules"), path.join(target, ".claude", "rules"), { recursive: true });
    git(target, "add", ".claude");
    git(target, "commit", "--quiet", "-m", "test: regole di prova");
  }
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true }); // solo le cartelle create da questi test
});

describe("rules-watch: regole cambiate durante la sessione", () => {
  test("prima volta e nessun cambio: silenzio", () => {
    const { home, template, project } = setup();
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template }), "");
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template }), "");
  });

  test("file modificato: lo nomina una volta sola", () => {
    const { home, template, project } = setup();
    run("rules-watch.mjs", { cwd: project, home, template });
    writeFileSync(path.join(project, ".claude", "rules", "git.md"), "# git modificato\n");
    const out = run("rules-watch.mjs", { cwd: project, home, template });
    assert.match(out, /\[Regole cambiate durante la sessione\]/);
    assert.match(out, /\.claude\/rules\/git\.md/);
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template }), "");
  });

  test("file aggiunto e file rimosso", () => {
    const { home, template, project } = setup();
    run("rules-watch.mjs", { cwd: project, home, template });
    write(path.join(project, ".claude", "rules", "docker.md"), "# docker\n");
    assert.match(run("rules-watch.mjs", { cwd: project, home, template }), /docker\.md/);
    rmSync(path.join(project, ".claude", "rules", "docker.md"));
    assert.match(run("rules-watch.mjs", { cwd: project, home, template }), /rimossi: \.claude\/rules\/docker\.md/);
  });

  test("progetto senza regole e input non JSON: silenzio, exit 0", () => {
    const { base, home, template } = setup();
    const empty = path.join(base, "empty");
    mkdirSync(empty);
    assert.equal(run("rules-watch.mjs", { cwd: empty, home, template: path.join(base, "non-esiste") }), "");
    const result = spawnSync(process.execPath, [path.join(scripts, "rules-watch.mjs")], { input: "non json", encoding: "utf8", cwd: empty, env: { ...process.env, USERPROFILE: home, HOME: home } });
    assert.equal(result.status, 0);
    assert.equal(result.stdout, "");
  });
});

describe("diff con git (clone locale del repository)", () => {
  let clone;
  let home;
  let template;
  before(() => {
    const ctx = setup();
    home = ctx.home;
    template = ctx.template;
    clone = path.join(ctx.base, "clone");
    cloneWithRules(clone);
    git(clone, "checkout", "--quiet", "-b", "test/rules-watch");
    // Il template finto deve avere la versione delle regole del clone, per restare silenzioso.
    const version = /^>\s*Versione\s+(\d+(?:\.\d+)*)/m.exec(readFileSync(path.join(clone, ".claude", "rules", "core.md"), "utf8"))?.[1] ?? "0";
    write(path.join(template, ".claude", "rules", "core.md"), `> Versione ${version} — rev\n`);
  });

  const watch = (session = "s1") => run("rules-watch.mjs", { cwd: clone, home, template, session });

  test("modifica non committata: il diff compare", () => {
    assert.equal(watch(), "");
    writeFileSync(path.join(clone, ".claude", "rules", "git.md"), readFileSync(path.join(clone, ".claude", "rules", "git.md"), "utf8") + "- riga di prova A\n");
    const out = watch();
    assert.match(out, /git diff/);
    assert.match(out, /^\+- riga di prova A$/m);
  });

  test("dopo un commit e una nuova modifica, il diff riguarda solo il file nuovo", () => {
    git(clone, "add", ".claude/rules/git.md");
    git(clone, "commit", "--quiet", "-m", "test: rule");
    writeFileSync(path.join(clone, ".claude", "rules", "core.md"), readFileSync(path.join(clone, ".claude", "rules", "core.md"), "utf8") + "- riga di prova B\n");
    const out = watch();
    assert.match(out, /^\+- riga di prova B$/m);
    assert.doesNotMatch(out, /riga di prova A/);
  });

  test("hash non valido o sconosciuto nello stato: ripiego sull'elenco, nessun effetto collaterale", () => {
    const stateFile = path.join(home, ".claude", "session-rules-state.json");
    const injected = path.join(os.tmpdir(), `kit-rules-injection-${process.pid}`);
    for (const bad of [`--output=${injected}`, "0".repeat(40)]) {
      const state = JSON.parse(readFileSync(stateFile, "utf8"));
      for (const key of Object.keys(state)) if (key.endsWith("#head")) state[key] = bad;
      writeFileSync(stateFile, JSON.stringify(state));
      writeFileSync(path.join(clone, ".claude", "rules", "security.md"), readFileSync(path.join(clone, ".claude", "rules", "security.md"), "utf8") + `- ${bad.length}\n`);
      const out = watch();
      assert.match(out, /security\.md/);
      assert.doesNotMatch(out, /git diff/);
    }
    assert.equal(existsSync(injected), false);
  });

  test("cartella senza git: solo l'elenco dei file", () => {
    const ctx = setup();
    run("rules-watch.mjs", { cwd: ctx.project, home: ctx.home, template: ctx.template });
    writeFileSync(path.join(ctx.project, ".claude", "rules", "git.md"), "# cambiato\n");
    const out = run("rules-watch.mjs", { cwd: ctx.project, home: ctx.home, template: ctx.template });
    assert.match(out, /git\.md/);
    assert.doesNotMatch(out, /git diff/);
  });
});

describe("confronto con il template", () => {
  test("template più recente: segnala versioni e file diversi, una volta per sessione", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "core.md"), "> Versione 3.21 — rev\n# core nuovo\n");
    const first = run("rules-watch.mjs", { cwd: project, home, template, session: "a" });
    assert.match(first, /\[Regole del template più recenti\]/);
    assert.match(first, /v3\.21 nel template, v3\.20 nel progetto/);
    assert.match(first, /\.claude\/rules\/core\.md/);
    assert.doesNotMatch(first, /CLAUDE\.md\b.*File diversi/);
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template, session: "a" }), "");
    assert.match(run("rules-watch.mjs", { cwd: project, home, template, session: "b" }), /Regole del template più recenti/);
  });

  test("stessa versione o versione minore (3.9 contro 3.20): silenzio", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "git.md"), "# git diverso\n");
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template, session: "a" }), "");
    write(path.join(template, ".claude", "rules", "core.md"), "> Versione 3.9 — rev\n");
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template, session: "b" }), "");
  });

  test("cartella del template mancante: avviso una volta per sessione", () => {
    const { base, home, project } = setup();
    const missing = path.join(base, "non-esiste");
    const out = run("rules-watch.mjs", { cwd: project, home, template: missing, session: "a" });
    assert.match(out, /\[Template delle regole non trovato\]/);
    assert.ok(out.includes(missing));
    assert.match(out, /KIT_CONFIG_TEMPLATE_DIR/);
    assert.equal(run("rules-watch.mjs", { cwd: project, home, template: missing, session: "a" }), "");
  });

  test("il progetto è il template: silenzio", () => {
    const { home, template } = setup();
    assert.equal(run("rules-watch.mjs", { cwd: template, home, template: path.join(template, "..", "template"), session: "a" }), "");
  });

  test("senza variabile d'ambiente nessun percorso personale: avviso che chiede di impostarla", () => {
    const { home, project } = setup();
    const out = run("rules-watch.mjs", { cwd: project, home, template: undefined, session: "a" });
    assert.match(out, /Template delle regole non configurato/);
    assert.match(out, /KIT_CONFIG_TEMPLATE_DIR/);
    assert.doesNotMatch(out, /E:\\\\Disco_E|E:\\Disco_E/);
  });

  test("compareVersions: confronto numerico per segmenti", () => {
    assert.ok(compareVersions("3.9", "3.20") < 0);
    assert.ok(compareVersions("3.21", "3.20") > 0);
    assert.equal(compareVersions("3.20", "3.20.0"), 0);
    assert.ok(compareVersions("4", "3.99") > 0);
  });
});

describe("session-plan: regole e piano a inizio sessione", () => {
  test("prima sessione silenzio; regola cambiata nominata; PIANO.md incluso", () => {
    const { home, project } = setup();
    assert.equal(run("session-plan.mjs", { cwd: project, home }), "");
    writeFileSync(path.join(project, ".claude", "rules", "core.md"), "> Versione 3.20 — rev\n# core cambiato\n");
    write(path.join(project, "PIANO.md"), "# Piano\n- [ ] passo uno\n");
    const out = run("session-plan.mjs", { cwd: project, home });
    assert.match(out, /\[Regole cambiate dall'ultima sessione\].*core\.md/);
    assert.match(out, /\[Promemoria di inizio sessione: PIANO\.md/);
    assert.match(out, /passo uno/);
  });

  test("piano e diff grandi: l'output resta sotto il limite di 10.000 caratteri", () => {
    const base = sandbox();
    const home = path.join(base, "home");
    mkdirSync(path.join(home, ".claude"), { recursive: true });
    const clone = path.join(base, "clone");
    cloneWithRules(clone);
    git(clone, "checkout", "--quiet", "-b", "test/session-plan");
    run("session-plan.mjs", { cwd: clone, home });
    write(path.join(clone, "PIANO.md"), Array.from({ length: 120 }, (_, i) => `- [ ] passo ${i} ${"x".repeat(80)}`).join("\n"));
    writeFileSync(path.join(clone, ".claude", "rules", "security.md"), readFileSync(path.join(clone, ".claude", "rules", "security.md"), "utf8") + Array.from({ length: 150 }, (_, i) => `- riga ${i} ${"y".repeat(90)}`).join("\n") + "\n");
    const out = run("session-plan.mjs", { cwd: clone, home });
    assert.ok(out.length <= 10000, `output di ${out.length} caratteri`);
    assert.match(out, /security\.md/);
    assert.match(out, /PIANO\.md/);
  });
});
