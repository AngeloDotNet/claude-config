// Test dello script di /kit:regole: copia per profilo (caso A), confronto e modifiche (caso B).
// Usano come template questo repository e come progetto di destinazione cartelle temporanee.
// Eseguire con: node --test plugins/kit/tests/regole.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, "..", "scripts", "regole.mjs");
const template = path.join(here, "..", "..", "..");

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

/** Esegue `fn` con una cartella di progetto temporanea, poi la elimina. */
function withTarget(fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-regole-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const copy = (dir, ...extra) => run("copia", "--template", template, "--target", dir, ...extra);
const compare = (dir) => run("confronta", "--template", template, "--target", dir);
const names = (dir, ...parts) => {
  const folder = path.join(dir, ...parts);
  return existsSync(folder) ? readdirSync(folder).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).sort() : [];
};
const read = (...parts) => readFileSync(path.join(...parts), "utf8").replace(/\r\n/g, "\n");
const sorted = (list) => [...list].sort();

const ALWAYS = ["core", "lavoro", "git", "security", "contratto"];
const SHORTABLE = ["workflow", "qualita", "git-flusso", "git-avanzato", "documentazione"];
const PROFILED = [...SHORTABLE, "operativita"];
const FULL = ["--backend", "--frontend", "--sicurezza-estesa"];
const AREA = ["backend", "backend-architecture", "backend-app", "osservabilita", "frontend", "security-backend", "security-frontend"];

test("solo Git: copia i sei moduli previsti, senza profilo né docker", () => {
  withTarget((dir) => {
    const r = copy(dir, "--solo-git");
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(names(dir, ".claude", "rules"), sorted(["core", "lavoro", "git", "git-flusso", "git-avanzato", "workflow"]));
    assert.deepEqual(names(dir, ".claude", "rules-optional"), []);
    assert.match(read(dir, "CLAUDE.md"), /\*\*Profilo:\*\* \[strutturato/);
    assert.ok(existsSync(path.join(dir, "_template", "avvio-progetto.md")));
    assert.ok(existsSync(path.join(dir, "_template", "ci", "ci.yml")));
  });
});

test("strutturato fullstack: tutti i moduli in rules, docker in rules-optional, profilo scritto", () => {
  withTarget((dir) => {
    const r = copy(dir, "--profilo", "strutturato", ...FULL, "--opzionali", "feature-workflow");
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(names(dir, ".claude", "rules"), sorted([...ALWAYS, ...PROFILED, ...AREA, "security-avanzata", "security-strutturato"]));
    assert.deepEqual(names(dir, ".claude", "rules-optional"), ["docker", "feature-workflow"]);
    assert.match(read(dir, "CLAUDE.md"), /^- \*\*Profilo:\*\* strutturato /m);
  });
});

test("standard: versioni brevi in rules e testo completo in dettaglio", () => {
  withTarget((dir) => {
    const r = copy(dir, "--profilo", "standard", "--backend", "--sicurezza-estesa");
    assert.equal(r.code, 0, r.err);
    for (const name of SHORTABLE) {
      assert.equal(read(dir, ".claude", "rules", `${name}.md`), read(template, "_template", "rules-standard", `${name}.md`), name);
      assert.equal(read(dir, ".claude", "rules-optional", "dettaglio", `${name}.md`), read(template, ".claude", "rules", `${name}.md`), name);
    }
    assert.ok(names(dir, ".claude", "rules").includes("security-avanzata"));
    assert.ok(names(dir, ".claude", "rules-optional").includes("security-strutturato"));
    assert.ok(names(dir, ".claude", "rules").includes("security-backend"));
    assert.ok(!names(dir, ".claude", "rules").includes("security-frontend"));
  });
});

test("mini: i moduli di profilo vanno in rules-optional; security.md resta sempre caricato", () => {
  withTarget((dir) => {
    const r = copy(dir, "--profilo", "mini", "--backend");
    assert.equal(r.code, 0, r.err);
    assert.deepEqual(names(dir, ".claude", "rules"), sorted([...ALWAYS, "backend", "backend-architecture", "backend-app", "osservabilita"]));
    assert.deepEqual(names(dir, ".claude", "rules-optional"), sorted([...PROFILED, "docker"]));
  });
});

test("file di root: solo quelli richiesti; i file esistenti non si sovrascrivono", () => {
  withTarget((dir) => {
    writeFileSync(path.join(dir, ".gitignore"), "mio\n");
    writeFileSync(path.join(dir, "CLAUDE.md"), "# Mio\n\n## Progetto\n- **Scopo:** x\n");
    const r = copy(dir, "--profilo", "mini", "--root", ".gitignore,.gitattributes");
    assert.equal(r.code, 0, r.err);
    assert.equal(read(dir, ".gitignore"), "mio\n");
    assert.ok(existsSync(path.join(dir, ".gitattributes")));
    assert.ok(!existsSync(path.join(dir, "NuGet.config")));
    assert.equal(read(dir, "CLAUDE.md"), "# Mio\n\n## Progetto\n- **Profilo:** mini\n- **Scopo:** x\n");
    assert.ok(r.json.saltati.includes(".gitignore"));
  });
});

test("un profilo già dichiarato nel CLAUDE.md non cambia", () => {
  withTarget((dir) => {
    writeFileSync(path.join(dir, "CLAUDE.md"), "- **Profilo:** standard\n");
    const r = copy(dir, "--profilo", "mini");
    assert.notEqual(r.code, 0);
    assert.match(r.err, /Profilo/);
    assert.equal(read(dir, "CLAUDE.md"), "- **Profilo:** standard\n");
    assert.ok(!existsSync(path.join(dir, ".claude")));
  });
});

test("rifiuti senza scrivere nulla: regole presenti, template come destinazione, opzioni errate", () => {
  withTarget((dir) => {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    assert.notEqual(copy(dir, "--profilo", "mini").code, 0);
    assert.ok(!existsSync(path.join(dir, "CLAUDE.md")));
  });
  assert.match(run("copia", "--template", template, "--target", template, "--profilo", "mini").err, /template/i);
  withTarget((dir) => {
    for (const args of [[], ["--profilo", "grande"], ["--profilo", "mini", "--opzionali", "../core"], ["--profilo", "mini", "--root", "../x"], ["--profilo", "mini", "--ignota"]]) {
      assert.notEqual(copy(dir, ...args).code, 0, args.join(" "));
    }
    assert.deepEqual(readdirSync(dir), []);
  });
});

test("dry-run: elenca il piano senza scrivere", () => {
  withTarget((dir) => {
    const r = copy(dir, "--profilo", "mini", "--dry-run");
    assert.equal(r.code, 0, r.err);
    assert.ok(r.json.copiati.includes(".claude/rules/core.md"));
    assert.deepEqual(readdirSync(dir), []);
  });
});

test("confronta: copia appena fatta tutta uguale, anche con i moduli brevi dello standard", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "standard", ...FULL);
    const r = compare(dir);
    assert.equal(r.code, 0, r.err);
    assert.equal(r.json.profilo, "standard");
    assert.deepEqual(r.json.diversi, []);
    assert.deepEqual(r.json.rimossi, []);
    assert.deepEqual(r.json.fuoriPosto, []);
    assert.deepEqual(r.json.obbligatoriMancanti, []);
  });
});

test("confronta: segnala diversi, più recenti, rimossi, fuori posto e obbligatori mancanti", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "mini");
    const rules = path.join(dir, ".claude", "rules");
    writeFileSync(path.join(rules, "git.md"), "# git\n\n> Versione 99.0 — ultima revisione: 2030-01-01.\n");
    writeFileSync(path.join(rules, "vecchio.md"), "# modulo non più nel template\n");
    writeFileSync(path.join(rules, "workflow.md"), read(template, ".claude", "rules", "workflow.md"));
    rmSync(path.join(rules, "security.md"));
    const { json } = compare(dir);
    const git = json.diversi.find((d) => d.file === ".claude/rules/git.md");
    assert.equal(git.progettoPiuRecente, true);
    assert.deepEqual(json.rimossi, [".claude/rules/vecchio.md"]);
    assert.ok(json.fuoriPosto.some((f) => f.file === ".claude/rules/workflow.md" && f.atteso === ".claude/rules-optional/workflow.md"));
    assert.deepEqual(json.obbligatoriMancanti, ["security"]);
    assert.ok(json.nuovi.includes("frontend"));
  });
});

test("confronta: senza profilo dichiarato non deduce spostamenti", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "mini");
    writeFileSync(path.join(dir, "CLAUDE.md"), "# senza profilo\n");
    const { json } = compare(dir);
    assert.equal(json.profilo, null);
    assert.deepEqual(json.fuoriPosto, []);
  });
});

test("aggiorna e rimuovi salvano sempre una copia .bak senza sovrascrivere le precedenti", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "mini");
    const file = path.join(dir, ".claude", "rules", "git.md");
    for (const text of ["uno\n", "due\n"]) {
      writeFileSync(file, text);
      const r = run("aggiorna", "--template", template, "--target", dir, "--file", ".claude/rules/git.md");
      assert.equal(r.code, 0, r.err);
    }
    assert.equal(read(`${file}.bak`), "uno\n");
    assert.equal(read(`${file}.bak2`), "due\n");
    assert.equal(read(file), read(template, ".claude", "rules", "git.md"));
    const removed = run("rimuovi", "--target", dir, "--file", ".claude/rules/git.md");
    assert.equal(removed.code, 0, removed.err);
    assert.ok(!existsSync(file));
    assert.ok(existsSync(`${file}.bak3`));
  });
});

test("sposta: tra rules e rules-optional, mai sopra un file esistente", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "mini");
    const args = ["sposta", "--target", dir, "--file", ".claude/rules-optional/docker.md", "--a", ".claude/rules/docker.md"];
    assert.equal(run(...args).code, 0);
    assert.ok(names(dir, ".claude", "rules").includes("docker"));
    const clash = run("sposta", "--target", dir, "--file", ".claude/rules/core.md", "--a", ".claude/rules/docker.md");
    assert.notEqual(clash.code, 0);
    assert.ok(existsSync(path.join(dir, ".claude", "rules", "core.md")));
  });
});

test("i percorsi fuori dalle cartelle delle regole sono rifiutati", () => {
  withTarget((dir) => {
    copy(dir, "--profilo", "mini");
    writeFileSync(path.join(dir, "appsettings.json"), "{}\n");
    for (const file of ["appsettings.json", ".claude/rules/../../appsettings.json", "../fuori.md"]) {
      assert.notEqual(run("rimuovi", "--target", dir, "--file", file).code, 0, file);
    }
    assert.ok(existsSync(path.join(dir, "appsettings.json")));
  });
});
