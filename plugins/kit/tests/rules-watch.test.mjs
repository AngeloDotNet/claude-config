// Test degli hook che sorvegliano le regole (prompt-start.mjs e lib/).
// Esecuzione, dalla root del repository:  node --test "plugins/kit/tests/*.test.mjs"
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
import { projectKey } from "../scripts/lib/rules.mjs";

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

/** La domanda sulla wiki (core.md §5b) è già risolta con «no»: i test delle regole non la devono vedere. */
function answerWikiQuestion(cwd, home) {
  const file = path.join(home, ".claude", "kit-progetti.json");
  if (existsSync(file)) return;
  write(file, JSON.stringify({ [projectKey(cwd)]: { sito: { esiste: false, chiesto: true } } }));
}

/** Esegue uno script degli hook come farebbe Claude Code: JSON su stdin, stato in una home finta. */
function run(script, { cwd, home, template, session = "s1" }) {
  answerWikiQuestion(cwd, home);
  const env = { ...process.env, USERPROFILE: home, HOME: home };
  if (template === undefined) delete env.KIT_CONFIG_TEMPLATE_DIR;
  else env.KIT_CONFIG_TEMPLATE_DIR = template;
  const result = spawnSync(process.execPath, [path.join(scripts, script)], {
    input: JSON.stringify({ cwd, session_id: session }),
    encoding: "utf8",
    env,
  });
  assert.equal(result.status, 0, `exit ${result.status}: ${result.stderr}`);
  return withoutReminder(result.stdout);
}

/** prompt-start aggiunge sempre il promemoria della regola inviolabile: qui si confronta solo il resto. */
function withoutReminder(out) {
  return out
    .split("\n")
    .filter((line) => !line.startsWith("[Regola inviolabile"))
    .join("\n");
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
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template }), "");
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template }), "");
  });

  test("file modificato: lo nomina una volta sola", () => {
    const { home, template, project } = setup();
    run("prompt-start.mjs", { cwd: project, home, template });
    writeFileSync(path.join(project, ".claude", "rules", "git.md"), "# git modificato\n");
    const out = run("prompt-start.mjs", { cwd: project, home, template });
    assert.match(out, /\[Regole cambiate durante la sessione\]/);
    assert.match(out, /\.claude\/rules\/git\.md/);
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template }), "");
  });

  test("file aggiunto e file rimosso", () => {
    const { home, template, project } = setup();
    run("prompt-start.mjs", { cwd: project, home, template });
    write(path.join(project, ".claude", "rules", "docker.md"), "# docker\n");
    assert.match(run("prompt-start.mjs", { cwd: project, home, template }), /docker\.md/);
    rmSync(path.join(project, ".claude", "rules", "docker.md"));
    assert.match(run("prompt-start.mjs", { cwd: project, home, template }), /rimossi: \.claude\/rules\/docker\.md/);
  });

  test("progetto senza regole e input non JSON: silenzio, exit 0", () => {
    const { base, home, template } = setup();
    const empty = path.join(base, "empty");
    mkdirSync(empty);
    assert.equal(run("prompt-start.mjs", { cwd: empty, home, template: path.join(base, "non-esiste") }), "");
    const result = spawnSync(process.execPath, [path.join(scripts, "prompt-start.mjs")], { input: "non json", encoding: "utf8", cwd: empty, env: { ...process.env, USERPROFILE: home, HOME: home } });
    assert.equal(result.status, 0);
    assert.equal(withoutReminder(result.stdout), "");
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

  const watch = (session = "s1") => run("prompt-start.mjs", { cwd: clone, home, template, session });

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
    run("prompt-start.mjs", { cwd: ctx.project, home: ctx.home, template: ctx.template });
    writeFileSync(path.join(ctx.project, ".claude", "rules", "git.md"), "# cambiato\n");
    const out = run("prompt-start.mjs", { cwd: ctx.project, home: ctx.home, template: ctx.template });
    assert.match(out, /git\.md/);
    assert.doesNotMatch(out, /git diff/);
  });
});

describe("confronto con il template", () => {
  test("template più recente: segnala versioni e file diversi, una volta per sessione", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "core.md"), "> Versione 3.21 — rev\n# core nuovo\n");
    const first = run("prompt-start.mjs", { cwd: project, home, template, session: "a" });
    assert.match(first, /\[Regole del template più recenti\]/);
    assert.match(first, /v3\.21 nel template, v3\.20 nel progetto/);
    assert.match(first, /\.claude\/rules\/core\.md/);
    assert.doesNotMatch(first, /CLAUDE\.md\b.*File diversi/);
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template, session: "a" }), "");
    assert.match(run("prompt-start.mjs", { cwd: project, home, template, session: "b" }), /Regole del template più recenti/);
  });

  test("modulo diverso da core.md più recente (frontend 1.1 contro 1.0, core uguale): avviso che lo nomina", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "frontend.md"), "> Versione 1.1 — rev\n# frontend nuovo\n");
    write(path.join(project, ".claude", "rules", "frontend.md"), "> Versione 1.0 — rev\n# frontend\n");
    const out = run("prompt-start.mjs", { cwd: project, home, template, session: "a" });
    assert.match(out, /\[Regole del template più recenti\]/);
    assert.match(out, /frontend\.md v1\.1 nel template, v1\.0 nel progetto/);
    assert.doesNotMatch(out, /core\.md v/);
  });

  test("modulo del progetto senza versione in intestazione: conta come più vecchio", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "frontend.md"), "> Versione 1.0 — rev\n# frontend\n");
    write(path.join(project, ".claude", "rules", "frontend.md"), "# frontend senza intestazione\n");
    const out = run("prompt-start.mjs", { cwd: project, home, template, session: "a" });
    assert.match(out, /frontend\.md v1\.0 nel template, versione non rilevata nel progetto/);
  });

  test("modulo assente nel progetto (es. frontend.md in un progetto solo backend): nessun avviso", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "frontend.md"), "> Versione 1.1 — rev\n# frontend\n");
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template, session: "a" }), "");
  });

  test("moduli del template uguali o più vecchi del progetto: silenzio", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "frontend.md"), "> Versione 1.0 — rev\n# frontend\n");
    write(path.join(project, ".claude", "rules", "frontend.md"), "> Versione 1.1 — rev\n# frontend\n");
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template, session: "a" }), "");
  });

  test("stessa versione o versione minore (3.9 contro 3.20): silenzio", () => {
    const { home, template, project } = setup();
    write(path.join(template, ".claude", "rules", "git.md"), "# git diverso\n");
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template, session: "a" }), "");
    write(path.join(template, ".claude", "rules", "core.md"), "> Versione 3.9 — rev\n");
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template, session: "b" }), "");
  });

  test("cartella del template mancante: avviso una volta per sessione", () => {
    const { base, home, project } = setup();
    const missing = path.join(base, "non-esiste");
    const out = run("prompt-start.mjs", { cwd: project, home, template: missing, session: "a" });
    assert.match(out, /\[Template delle regole non trovato\]/);
    assert.ok(out.includes(missing));
    assert.match(out, /KIT_CONFIG_TEMPLATE_DIR/);
    assert.equal(run("prompt-start.mjs", { cwd: project, home, template: missing, session: "a" }), "");
  });

  test("il progetto è il template: silenzio", () => {
    const { home, template } = setup();
    assert.equal(run("prompt-start.mjs", { cwd: template, home, template: path.join(template, "..", "template"), session: "a" }), "");
  });

  test("senza variabile d'ambiente nessun percorso personale: avviso che chiede di impostarla", () => {
    const { home, project } = setup();
    const out = run("prompt-start.mjs", { cwd: project, home, template: undefined, session: "a" });
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
