// Test dell'hook SessionStart (scripts/session-start.mjs, lib/avvio.mjs, ADR 0004 #142): spento per
// default, attivazione per progetto, solo startup e resume, progetto del kit riconosciuto, nessuna
// modifica in caso di errore, e l'hook UserPromptSubmit non chiede di rileggere le regole appena allineate.
// La home è una cartella temporanea: il ~/.claude/kit-progetti.json reale non viene toccato.
// Eseguire con: node --test plugins/kit/tests/session-start.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectKey } from "../scripts/lib/rules.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.join(here, "..", "scripts");
const GIT = ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false"];
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...GIT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const exists = (dir, rel) => existsSync(path.join(dir, ...rel.split("/")));

function writeAll(dir, files) {
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, ...rel.split("/"));
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
}

const CORE = "> Versione 4.5 — ultima revisione: 2026-11-27.\ncontenuto core\n";
const TEMPLATE = {
  "_template/moduli.json": JSON.stringify({ schema: 1, moduli: [{ nome: "core", cartella: "rules", applicabilita: "sempre", descrizione: "Regole minime." }] }),
  ".claude/rules/core.md": CORE,
  "CLAUDE.md": "# Progetto\n\n## Regole\n- **Versione delle regole copiate:** `core.md` v[x.y] del [data]\n\n## Progetto\n- **Profilo:** [strutturato (default) | standard | mini]\n",
};
const PROGETTO_DEL_KIT = { ".claude/rules/core.md": CORE, "CLAUDE.md": "# Progetto\n\n## Progetto\n- **Profilo:** standard\n" };

/** Ambiente di test: template con tag 1.0.0, progetto committato su feature/test, home temporanea. */
function withEnv(fn, { progetto = PROGETTO_DEL_KIT, config = null, template = true } = {}) {
  const base = mkdtempSync(path.join(os.tmpdir(), "kit-avvio-"));
  const tpl = path.join(base, "template");
  const prj = path.join(base, "progetto");
  const home = path.join(base, "home");
  mkdirSync(tpl);
  mkdirSync(prj);
  mkdirSync(home);
  try {
    git(tpl, "init", "-q", "-b", "main");
    writeAll(tpl, TEMPLATE);
    git(tpl, "add", "-A");
    git(tpl, "commit", "-q", "-m", "chore(repo): template");
    git(tpl, "tag", "1.0.0");
    git(prj, "init", "-q", "-b", "feature/test");
    writeAll(prj, progetto);
    git(prj, "add", "-A");
    git(prj, "commit", "-q", "-m", "chore(repo): progetto");
    if (config) {
      mkdirSync(path.join(home, ".claude"), { recursive: true });
      writeFileSync(path.join(home, ".claude", "kit-progetti.json"), JSON.stringify({ [projectKey(prj)]: config }));
    }
    fn({ base, tpl, prj, home, template });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

/** Esegue un hook con l'ambiente di test; restituisce stdout e il JSON del contesto, se c'è. */
function hook(script, input, { home, tpl, template = true }) {
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  if (template) env.KIT_CONFIG_TEMPLATE_DIR = tpl;
  else delete env.KIT_CONFIG_TEMPLATE_DIR;
  const r = spawnSync(process.execPath, [path.join(scripts, script)], { input: JSON.stringify(input), encoding: "utf8", env, timeout: 30000 });
  const out = r.stdout.trim();
  // session-start risponde in JSON (additionalContext); prompt-start scrive testo semplice.
  const contesto = script === "session-start.mjs" && out ? JSON.parse(out).hookSpecificOutput.additionalContext : null;
  return { code: r.status, out, contesto };
}

test("spento per default: nessuna configurazione, nessuna modifica e nessun testo", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "startup" }, e);
    assert.equal(r.code, 0);
    assert.equal(r.out, "");
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), false);
  });
});

test("attivo per il progetto, ma sessione di clear: nessuna azione", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "clear" }, e);
    assert.equal(r.out, "");
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), false);
  }, { config: { sincronizzazione: true } });
});

test("attivo e avvio: regole allineate, richiesta di riavvio, nessun blocco", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "startup" }, e);
    assert.equal(r.code, 0);
    assert.match(r.contesto, /Regole allineate al template v1\.0\.0/);
    assert.match(r.contesto, /chiudere e riaprire Claude Code/);
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), true);
  }, { config: { sincronizzazione: true } });
});

test("attivo e ripresa (resume): stesso comportamento dell'avvio", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "resume" }, e);
    assert.match(r.contesto, /Regole allineate/);
  }, { config: { sincronizzazione: true } });
});

test("repository altrui con una propria .claude/rules/ e senza profilo: non toccato", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "startup" }, e);
    assert.equal(r.out, "");
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), false);
  }, { config: { sincronizzazione: true }, progetto: { ".claude/rules/core.md": CORE, "CLAUDE.md": "# Altro progetto\n" } });
});

test("template non impostato: avviso, nessuna modifica", () => {
  withEnv((e) => {
    const r = hook("session-start.mjs", { cwd: e.prj, source: "startup" }, { ...e, template: false });
    assert.match(r.contesto, /KIT_CONFIG_TEMPLATE_DIR/);
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), false);
  }, { config: { sincronizzazione: true } });
});

test("modifiche non committate: silenzio e nessuna modifica (il lavoro ha la precedenza)", () => {
  withEnv((e) => {
    writeAll(e.prj, { ".claude/rules/core.md": "lavoro in corso\n" });
    const r = hook("session-start.mjs", { cwd: e.prj, source: "startup" }, e);
    assert.equal(r.out, "");
    assert.equal(exists(e.prj, ".claude/kit-regole.json"), false);
  }, { config: { sincronizzazione: true } });
});

test("dopo l'allineamento, il promemoria UserPromptSubmit non chiede di rileggere le regole né mostra l'avviso sul template", () => {
  withEnv((e) => {
    hook("session-start.mjs", { cwd: e.prj, source: "startup" }, e);
    const r = hook("prompt-start.mjs", { cwd: e.prj, session_id: "sessione-test" }, e);
    assert.equal(r.code, 0);
    assert.doesNotMatch(r.out, /Regole cambiate durante la sessione/);
    assert.doesNotMatch(r.out, /Regole del template più recenti/);
  }, { config: { sincronizzazione: true } });
});

test("il promemoria UserPromptSubmit resta invariato per un progetto senza sincronizzazione", () => {
  withEnv((e) => {
    const r = hook("prompt-start.mjs", { cwd: e.prj, session_id: "sessione-test" }, e);
    assert.match(r.out, /Regola inviolabile/);
    assert.equal(r.code, 0);
  });
});
