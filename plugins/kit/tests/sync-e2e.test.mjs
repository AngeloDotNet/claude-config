// Prova end-to-end della sincronizzazione (ADR 0004, #144) con i file reali del template.
// Il template di prova è una copia dei file del repository (regole, manifest, _template), con un tag
// di rilascio creato nel test; il progetto nasce con `regole copia`, come farebbe l'utente.
// Eseguire con: node --test plugins/kit/tests/sync-e2e.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "..", "..", "..");
const regole = path.join(here, "..", "scripts", "regole.mjs");
const GIT = ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false"];
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...GIT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const script = (...args) => {
  const r = spawnSync(process.execPath, [regole, ...args], { encoding: "utf8" });
  return { code: r.status, json: r.stdout ? JSON.parse(r.stdout) : null, err: r.stderr };
};
const read = (dir, rel) => readFileSync(path.join(dir, ...rel.split("/")), "utf8");

/** Template di prova: copia dei file reali del repository, con un commit e il tag di rilascio `versione`. */
function templateDi(base, versione) {
  const dir = path.join(base, "template");
  mkdirSync(dir, { recursive: true });
  for (const p of [".claude", "_template", "CLAUDE.md"]) cpSync(path.join(repo, p), path.join(dir, p), { recursive: true });
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "--", ".claude", "_template", "CLAUDE.md");
  git(dir, "commit", "-q", "-m", `chore(repo): template ${versione}`);
  git(dir, "tag", versione);
  return dir;
}

test("prova end-to-end: copia reale, poi aggiornamento, conflitto e ripetizione senza effetti", () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "kit-e2e-"));
  try {
    const tpl = templateDi(base, "1.0.0");
    const prj = path.join(base, "progetto");
    mkdirSync(prj);

    // 1. Il progetto nasce con la copia reale (profilo standard, tutte le aree, feature-workflow).
    const copia = script("copia", "--template", tpl, "--target", prj, "--profilo", "standard", "--backend", "--frontend", "--sicurezza-estesa", "--opzionali", "feature-workflow");
    assert.equal(copia.code, 0, copia.err);
    git(prj, "init", "-q", "-b", "feature/prova");
    git(prj, "add", "--", ".claude", "_template", "CLAUDE.md");
    git(prj, "commit", "-q", "-m", "chore(repo): progetto di prova");

    // 2. Primo avvio con file identici: registra tutto, nessun file da scrivere.
    const primo = script("sincronizza", "--template", tpl, "--target", prj, "--dry-run");
    assert.equal(primo.json.stato, "pronto", primo.json.motivo);
    assert.deepEqual(primo.json.daScrivere.file, []);
    assert.equal(primo.json.daScrivere.registro, true);
    // `copia` lascia i segnaposto delle righe generate di CLAUDE.md: sono le sole domande del primo avvio.
    assert.ok(primo.json.domande.every((q) => String(q.chiave ?? "").startsWith("CLAUDE.md:")), JSON.stringify(primo.json.domande));
    const applicata = script("sincronizza", "--template", tpl, "--target", prj);
    assert.equal(applicata.json.esito.stato, "applicata", applicata.json.esito?.motivo);
    git(prj, "add", "--", ".claude/kit-regole.json");
    git(prj, "commit", "-q", "-m", "chore(repo): registro regole");

    // 3. Il template cambia un modulo non toccato: aggiornamento automatico.
    writeFileSync(path.join(tpl, ".claude", "rules", "backend.md"), read(tpl, ".claude/rules/backend.md") + "\nRiga aggiunta nel template di prova.\n");
    // 4. Il progetto personalizza un altro modulo, e il template lo cambia: conflitto.
    writeFileSync(path.join(prj, ".claude", "rules", "qualita.md"), read(prj, ".claude/rules/qualita.md") + "\nRegola mia.\n");
    git(prj, "add", "--", ".claude/rules/qualita.md");
    git(prj, "commit", "-q", "-m", "chore(repo): regola propria");
    // Con lo standard la versione breve sta in .claude/rules: il conflitto si costruisce sulla breve del template.
    writeFileSync(path.join(tpl, "_template", "rules-standard", "qualita.md"), read(tpl, "_template/rules-standard/qualita.md") + "\nRegola del template di prova.\n");
    writeFileSync(path.join(tpl, ".claude", "rules", "qualita.md"), read(tpl, ".claude/rules/qualita.md") + "\nRegola del template di prova.\n");
    git(tpl, "add", "--", ".claude/rules/qualita.md", ".claude/rules/backend.md", "_template/rules-standard/qualita.md");
    git(tpl, "commit", "-q", "-m", "chore(repo): regole 1.1.0");
    git(tpl, "tag", "1.1.0");

    const piano = script("sincronizza", "--template", tpl, "--target", prj, "--dry-run");
    assert.equal(piano.json.stato, "pronto", piano.json.motivo);
    assert.ok(piano.json.domande.some((q) => q.tipo === "conflitto" && q.chiave === ".claude/rules/qualita.md"), "manca la domanda sul conflitto");
    const daAggiornare = script("sincronizza", "--template", tpl, "--target", prj);
    assert.equal(daAggiornare.json.esito.stato, "applicata", daAggiornare.json.esito?.motivo);
    assert.equal(read(prj, ".claude/rules/backend.md"), read(tpl, ".claude/rules/backend.md"), "il modulo non modificato non è stato aggiornato");
    assert.match(read(prj, ".claude/rules/qualita.md"), /Regola mia\./, "la regola personale è stata toccata");
    assert.doesNotMatch(read(prj, ".claude/rules/qualita.md"), /Regola del template di prova/);
    assert.ok(daAggiornare.json.esito.copieDiSalvataggio, "manca la copia di salvataggio");

    // 5. Ripetizione: nessun effetto, e la domanda sul conflitto resta (il file non è stato risolto).
    git(prj, "add", "--", ".claude", "_template", "CLAUDE.md");
    git(prj, "commit", "-q", "-m", "chore(repo): allineamento 1.1.0");
    const ripetuta = script("sincronizza", "--template", tpl, "--target", prj, "--dry-run");
    assert.equal(ripetuta.json.stato, "pronto", ripetuta.json.motivo);
    assert.deepEqual(ripetuta.json.daScrivere.file, []);
    assert.equal(ripetuta.json.daScrivere.registro, false);
    assert.ok(ripetuta.json.domande.some((q) => q.chiave === ".claude/rules/qualita.md"));
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
