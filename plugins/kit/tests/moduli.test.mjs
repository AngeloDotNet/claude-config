// Test del manifest dei moduli del template (_template/moduli.json): coerenza con i file, versioni brevi,
// e rifiuto di un manifest malformato senza scrivere nulla nel progetto.
// Eseguire con: node --test plugins/kit/tests/moduli.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "scripts", "regole.mjs");
const template = path.join(here, "..", "..", "..");
const manifest = JSON.parse(readFileSync(path.join(template, "_template", "moduli.json"), "utf8"));
const names = (folder) =>
  existsSync(folder) ? readdirSync(folder).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).sort() : [];

function run(...args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", timeout: 30000 });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    // uscita non JSON: il test guarda codice e stderr
  }
  return { code: r.status, json, err: r.stderr ?? "" };
}

test("il manifest elenca gli stessi moduli dei file del template, nella cartella giusta", () => {
  const rules = names(path.join(template, ".claude", "rules"));
  const optional = names(path.join(template, ".claude", "rules-optional"));
  assert.deepEqual(manifest.moduli.map((m) => m.nome).sort(), [...rules, ...optional].sort());
  for (const m of manifest.moduli) {
    const folder = m.cartella === "rules-optional" ? optional : rules;
    assert.ok(folder.includes(m.nome), `${m.nome} non sta in ${m.cartella}`);
  }
});

test("ogni modulo ha una descrizione e nomi non ripetuti", () => {
  const seen = new Set();
  for (const m of manifest.moduli) {
    assert.ok(m.descrizione && m.descrizione.length > 10, `descrizione mancante: ${m.nome}`);
    assert.ok(!seen.has(m.nome), `nome ripetuto: ${m.nome}`);
    seen.add(m.nome);
  }
});

test("le versioni brevi dichiarate esistono e sono quelle copiate nello standard", () => {
  const shortable = manifest.moduli.filter((m) => m.versioneBreve);
  assert.deepEqual(shortable.map((m) => m.nome).sort(), ["documentazione", "git-flusso", "qualita", "workflow"]);
  for (const m of shortable) {
    assert.equal(m.versioneBreve, `_template/rules-standard/${m.nome}.md`, m.nome);
    assert.ok(existsSync(path.join(template, m.versioneBreve)), m.versioneBreve);
  }
});

test("il confronto con il template non trova moduli del manifest mancanti nel template", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-moduli-"));
  try {
    const r = run("copia", "--template", template, "--target", dir, "--profilo", "strutturato", "--backend", "--frontend", "--sicurezza-estesa");
    assert.equal(r.code, 0, r.err);
    const c = run("confronta", "--template", template, "--target", dir);
    assert.equal(c.code, 0, c.err);
    // Restano nuovi solo i moduli opzionali che il progetto non ha chiesto.
    const opzionali = manifest.moduli.filter((m) => m.applicabilita === "opzionale" && !m.copiaSempre).map((m) => m.nome);
    assert.deepEqual(c.json.nuovi, opzionali.sort());
    assert.deepEqual(c.json.obbligatoriMancanti, []);
    assert.deepEqual(c.json.diversi, []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("la descrizione dei moduli nuovi viene dal manifest", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-moduli-"));
  try {
    const r = run("copia", "--template", template, "--target", dir, "--profilo", "mini");
    assert.equal(r.code, 0, r.err);
    rmSync(path.join(dir, ".claude", "rules-optional", "docker.md"));
    const c = run("confronta", "--template", template, "--target", dir);
    assert.ok(c.json.nuovi.includes("docker"));
    assert.equal(c.json.descrizioniNuovi.docker, manifest.moduli.find((m) => m.nome === "docker").descrizione);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Copia un template minimo in una cartella temporanea, con il manifest passato. */
function templateWith(moduli) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-modelli-"));
  cpSync(path.join(template, ".claude"), path.join(dir, ".claude"), { recursive: true });
  cpSync(path.join(template, "_template"), path.join(dir, "_template"), { recursive: true });
  cpSync(path.join(template, "CLAUDE.md"), path.join(dir, "CLAUDE.md"));
  writeFileSync(path.join(dir, "_template", "moduli.json"), JSON.stringify({ schema: 1, moduli }, null, 2));
  return dir;
}

test("un manifest malformato blocca la copia senza scrivere nel progetto", () => {
  const cases = [
    ["nome ripetuto", [manifest.moduli[0], manifest.moduli[0]]],
    ["applicabilità sconosciuta", [{ ...manifest.moduli[0], applicabilita: "forse" }]],
    ["profilo minimo sconosciuto", [{ ...manifest.moduli[0], profiloMinimo: "enterprise" }]],
    ["versione breve inesistente", [{ ...manifest.moduli[0], versioneBreve: "_template/non-c-e.md" }]],
  ];
  for (const [label, moduli] of cases) {
    const tpl = templateWith(moduli);
    const target = mkdtempSync(path.join(os.tmpdir(), "kit-progetto-"));
    try {
      const r = run("copia", "--template", tpl, "--target", target, "--profilo", "strutturato");
      assert.equal(r.code, 1, label);
      assert.match(r.err, /moduli\.json/, label);
      assert.equal(existsSync(path.join(target, ".claude")), false, label);
    } finally {
      rmSync(tpl, { recursive: true, force: true });
      rmSync(target, { recursive: true, force: true });
    }
  }
});
