// Test del promemoria sulla versione del plugin (lib/plugin-version.mjs, usato da prompt-start.mjs).
// Esecuzione, dalla root del repository:  node --test "plugins/kit/tests/plugin-version.test.mjs"
// Cartelle temporanee e home finta: non toccano ~/.claude.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { projectKey } from "../scripts/lib/rules.mjs";
import { pluginVersion } from "../scripts/lib/plugin-version.mjs";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");
const sandboxes = [];

function write(file, text) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/** Scrive `<radice>/.claude-plugin/plugin.json` con la versione indicata (o un testo grezzo). */
function manifest(root, version, raw) {
  write(path.join(root, ".claude-plugin", "plugin.json"), raw ?? JSON.stringify({ name: "kit", version }));
}

/** Home finta, plugin «installato», template e progetto senza regole (il controllo gira anche così). */
function setup({ installed = "1.10.0", latest = "1.14.0" } = {}) {
  const base = mkdtempSync(path.join(os.tmpdir(), "kit-pv-"));
  sandboxes.push(base);
  const home = path.join(base, "home");
  const project = path.join(base, "project");
  const installedRoot = path.join(base, "installed");
  const template = path.join(base, "template");
  mkdirSync(path.join(home, ".claude"), { recursive: true });
  mkdirSync(project, { recursive: true });
  // La domanda sulla wiki (core.md §5b) è già risolta: qui non deve comparire.
  write(path.join(home, ".claude", "kit-progetti.json"), JSON.stringify({ [projectKey(project)]: { sito: { esiste: false, chiesto: true } } }));
  if (installed) manifest(installedRoot, installed);
  if (latest) manifest(path.join(template, "plugins", "kit"), latest);
  return { base, home, project, installedRoot, template };
}

/** Esegue prompt-start come Claude Code: JSON su stdin, plugin installato da CLAUDE_PLUGIN_ROOT. */
function run({ project, home, installedRoot, template }, { session = "s1", withTemplate = true } = {}) {
  const env = { ...process.env, USERPROFILE: home, HOME: home, CLAUDE_PLUGIN_ROOT: installedRoot };
  if (withTemplate) env.KIT_CONFIG_TEMPLATE_DIR = template;
  else delete env.KIT_CONFIG_TEMPLATE_DIR;
  const r = spawnSync(process.execPath, [path.join(scripts, "prompt-start.mjs")], {
    input: JSON.stringify({ cwd: project, session_id: session }),
    encoding: "utf8",
    env,
  });
  assert.equal(r.status, 0, `exit ${r.status}: ${r.stderr}`);
  return r.stdout.split("\n").filter((line) => !line.startsWith("[Regola inviolabile")).join("\n");
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

describe("promemoria sulla versione del plugin", () => {
  test("template più recente: avviso con i comandi di aggiornamento, anche senza regole nel progetto", () => {
    const s = setup();
    const out = run(s);
    assert.match(out, /\[Plugin kit da aggiornare\]/);
    assert.match(out, /installato è la versione 1\.10\.0, il template ha la 1\.14\.0/);
    assert.match(out, /\/plugin marketplace update claude-config/);
    assert.match(out, /\/plugin update kit@claude-config/);
    assert.match(out, /\/reload-plugins/);
  });

  test("una sola volta per sessione e progetto; una sessione nuova lo ripropone", () => {
    const s = setup();
    assert.match(run(s, { session: "a" }), /Plugin kit da aggiornare/);
    assert.equal(run(s, { session: "a" }), "");
    assert.match(run(s, { session: "b" }), /Plugin kit da aggiornare/);
  });

  test("versione uguale o installata più recente (1.9 contro 1.10): silenzio", () => {
    assert.equal(run(setup({ installed: "1.14.0", latest: "1.14.0" })), "");
    assert.equal(run(setup({ installed: "1.15.0", latest: "1.14.0" })), "");
    assert.equal(run(setup({ installed: "1.10.0", latest: "1.9.0" })), "");
  });

  test("confronto numerico: 1.9.0 installato contro 1.10.0 nel template avvisa", () => {
    assert.match(run(setup({ installed: "1.9.0", latest: "1.10.0" })), /Plugin kit da aggiornare/);
  });

  test("senza KIT_CONFIG_TEMPLATE_DIR: nessun avviso sul plugin", () => {
    assert.equal(run(setup(), { withTemplate: false }), "");
  });

  test("manifest del template o del plugin mancante o non valido: silenzio (fail-open)", () => {
    assert.equal(run(setup({ latest: null })), "");
    assert.equal(run(setup({ installed: null })), "");
    const s = setup();
    manifest(s.installedRoot, null, "non json");
    assert.equal(run(s), "");
    manifest(s.installedRoot, null, JSON.stringify({ version: "abc" }));
    assert.equal(run({ ...s }, { session: "x" }), "");
  });

  test("pluginVersion: legge la versione, null se assente o malformata", () => {
    const s = setup();
    assert.equal(pluginVersion(s.installedRoot), "1.10.0");
    assert.equal(pluginVersion(path.join(s.base, "non-esiste")), null);
  });
});
