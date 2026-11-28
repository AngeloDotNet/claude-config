// Test del motore di sincronizzazione (lib/sync.mjs, ADR 0004): piano dall'ultimo tag, casi di
// aggiornamento, conflitto, spostamento, rimozione, moduli nuovi, registro ostile, git, lock e rollback.
// Il template e il progetto sono repository git temporanei; il template ha un tag di rilascio.
// Eseguire con: node --test plugins/kit/tests/sync.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applica, pianifica, sicuro } from "../scripts/lib/sync.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const GIT = ["-c", "user.name=test", "-c", "user.email=test@example.invalid", "-c", "commit.gpgsign=false", "-c", "tag.gpgsign=false"];
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...GIT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const read = (dir, rel) => readFileSync(path.join(dir, ...rel.split("/")), "utf8");
const exists = (dir, rel) => existsSync(path.join(dir, ...rel.split("/")));

function writeAll(dir, files) {
  for (const [rel, text] of Object.entries(files)) {
    const full = path.join(dir, ...rel.split("/"));
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, text);
  }
}

/** Repository temporaneo: `fn` riceve la cartella; alla fine viene eliminato. */
function withDirs(fn) {
  const base = mkdtempSync(path.join(os.tmpdir(), "kit-sync-"));
  const template = path.join(base, "template");
  const project = path.join(base, "progetto");
  mkdirSync(template);
  mkdirSync(project);
  try {
    git(template, "init", "-q", "-b", "main");
    git(project, "init", "-q", "-b", "feature/test");
    fn({ base, template, project });
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
}

const MODULI = [
  { nome: "core", cartella: "rules", applicabilita: "sempre", soloGit: true, descrizione: "Regole minime del kit." },
  { nome: "workflow", cartella: "rules", applicabilita: "profilo", profiloMinimo: "standard", versioneBreve: "_template/rules-standard/workflow.md", descrizione: "Flusso di lavoro." },
  { nome: "docker", cartella: "rules-optional", applicabilita: "opzionale", copiaSempre: true, descrizione: "Docker, solo su richiesta." },
  { nome: "feature-workflow", cartella: "rules-optional", applicabilita: "opzionale", descrizione: "Nuove entità." },
  { nome: "backend", cartella: "rules", applicabilita: "backend", descrizione: "Regole backend." },
  { nome: "security-avanzata", cartella: "rules", applicabilita: "sicurezza-estesa", profiloMinimo: "standard", descrizione: "Sicurezza avanzata." },
];

const CORE = "> Versione 4.5 — ultima revisione: 2026-11-27.\ncontenuto core\n";
const CLAUDE_TPL = "# Progetto\n\n## Regole\n- **Versione delle regole copiate:** `core.md` v[x.y] del [data]\n- **Moduli rimossi o non attivati (fuori ambito):** [nessuno]\n\n## Progetto\n- **Profilo:** [strutturato (default) | standard | mini]\n";

/** File del template per una versione: `cambi` sovrascrive o aggiunge file, `togli` li elimina. */
function templateFiles(extra = {}, togli = []) {
  const files = {
    "_template/moduli.json": JSON.stringify({ schema: 1, moduli: MODULI }, null, 2),
    ".claude/rules/core.md": CORE,
    ".claude/rules/workflow.md": "full workflow v1\n",
    "_template/rules-standard/workflow.md": "short workflow v1\n",
    ".claude/rules-optional/docker.md": "docker v1\n",
    ".claude/rules-optional/feature-workflow.md": "fw v1\n",
    ".claude/rules/backend.md": "backend v1\n",
    ".claude/rules/security-avanzata.md": "sec v1\n",
    "CLAUDE.md": CLAUDE_TPL,
    ...extra,
  };
  for (const k of togli) delete files[k];
  return files;
}

/** Progetto a profilo standard, come lo lascia /kit:regole all'inizio (file identici al template v1). */
function projectFiles() {
  return {
    ".claude/rules/core.md": CORE,
    ".claude/rules/workflow.md": "short workflow v1\n",
    ".claude/rules-optional/dettaglio/workflow.md": "full workflow v1\n",
    ".claude/rules-optional/docker.md": "docker v1\n",
    ".claude/rules/backend.md": "backend v1\n",
    ".claude/rules/security-avanzata.md": "sec v1\n",
    "CLAUDE.md": "# Progetto\n\n## Regole\n- **Versione delle regole copiate:** `core.md` v4.5 del 2026-11-27\n- **Moduli rimossi o non attivati (fuori ambito):** feature-workflow\n\n## Progetto\n- **Profilo:** standard\n",
  };
}

function commitAll(dir, message = "chore: test") {
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", message);
}

/** Crea template (con tag 1.0.0) e progetto (committato, su feature/test). */
function setup({ base, template, project }, { templateExtra = {}, togli = [], projExtra = {}, projSolo = null } = {}) {
  writeAll(template, templateFiles(templateExtra, togli));
  commitAll(template, "chore(repo): template v1");
  git(template, "tag", "1.0.0");
  writeAll(project, projSolo ?? { ...projectFiles(), ...projExtra });
  commitAll(project, "chore(repo): progetto v1");
  return base;
}

test("primo avvio con file identici: registra tutto e non pone domande sui file", () => {
  withDirs((d) => {
    setup(d);
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.equal(piano.scritture.length, 0);
    assert.equal(piano.rimozioni.length, 0);
    assert.equal(piano.registroCambia, true);
    assert.deepEqual(piano.domande.filter((q) => q.tipo === "conflitto" && q.motivo === "primo-avvio" && q.chiave.endsWith(".md")), []);
    assert.deepEqual(piano.domande.filter((q) => q.tipo === "nuovo-modulo"), []);
    assert.equal(piano.registro.tag, "1.0.0");
    assert.equal(applica(piano, { target: d.project }).stato, "applicata");
    assert.equal(exists(d.project, ".claude/kit-regole.json"), true);
  });
});

test("primo avvio con un file diverso: domanda, il file resta invariato", () => {
  withDirs((d) => {
    setup(d, { projExtra: { ".claude/rules/backend.md": "backend mio\n" } });
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.ok(piano.domande.some((q) => q.tipo === "conflitto" && q.chiave === ".claude/rules/backend.md" && q.motivo === "primo-avvio"));
    assert.equal(piano.scritture.some((s) => s.chiave === ".claude/rules/backend.md"), false);
  });
});

test("template cambiato, file non modificato: aggiornato in automatico con copia di salvataggio", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project, now: new Date(2026, 10, 28, 9, 5) });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.template, { ".claude/rules/backend.md": "backend v2\n" });
    commitAll(d.template, "chore(repo): backend v2");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.ok(piano.scritture.some((s) => s.tipo === "file" && s.chiave === ".claude/rules/backend.md" && s.azione === "aggiorna"));
    const esito = applica(piano, { target: d.project, now: new Date(2026, 10, 28, 9, 6) });
    assert.equal(esito.stato, "applicata", esito.motivo);
    assert.equal(read(d.project, ".claude/rules/backend.md"), "backend v2\n");
    // La copia di salvataggio conserva la versione precedente, con la struttura originale.
    const backupDir = path.join(d.project, ".claude", "kit-backup");
    const dirs = readdirSync(backupDir).filter((n) => n !== ".gitignore");
    assert.equal(dirs.length, 1);
    assert.equal(readFileSync(path.join(backupDir, dirs[0], ".claude", "rules", "backend.md"), "utf8"), "backend v1\n");
    assert.equal(readFileSync(path.join(backupDir, ".gitignore"), "utf8"), "*\n");
  });
});

test("file personalizzato e template invariato: nessuna azione e nessuna domanda", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.project, { ".claude/rules/backend.md": "mio backend\n" });
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.equal(piano.scritture.some((s) => s.chiave === ".claude/rules/backend.md"), false);
    assert.equal(piano.domande.some((q) => q.chiave === ".claude/rules/backend.md"), false);
  });
});

test("file personalizzato e template cambiato: domanda di conflitto, il file resta com'è", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.project, { ".claude/rules/backend.md": "mio backend\n" });
    commitAll(d.project, "chore(repo): mio backend");
    writeAll(d.template, { ".claude/rules/backend.md": "backend v2\n" });
    commitAll(d.template, "chore(repo): backend v2");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.ok(piano.domande.some((q) => q.tipo === "conflitto" && q.chiave === ".claude/rules/backend.md" && q.motivo === "conflitto"));
    assert.equal(piano.scritture.some((s) => s.chiave === ".claude/rules/backend.md"), false);
    applica(piano, { target: d.project });
    assert.equal(read(d.project, ".claude/rules/backend.md"), "mio backend\n");
  });
});

test("modulo nel posto sbagliato e non modificato: spostato in automatico", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    git(d.project, "mv", ".claude/rules/security-avanzata.md", ".claude/rules-optional/security-avanzata.md");
    commitAll(d.project, "chore(repo): sposta a mano");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.ok(piano.scritture.some((s) => s.tipo === "sposta" && s.da === ".claude/rules-optional/security-avanzata.md" && s.a === ".claude/rules/security-avanzata.md"));
    const esito = applica(piano, { target: d.project });
    assert.equal(esito.stato, "applicata", esito.motivo);
    assert.equal(read(d.project, ".claude/rules/security-avanzata.md"), "sec v1\n");
    assert.equal(exists(d.project, ".claude/rules-optional/security-avanzata.md"), false);
  });
});

test("modulo rimosso dal template e non modificato: rimosso con copia di salvataggio", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    git(d.template, "rm", "-q", ".claude/rules/backend.md");
    writeAll(d.template, { "_template/moduli.json": JSON.stringify({ schema: 1, moduli: MODULI.filter((m) => m.nome !== "backend") }, null, 2) });
    commitAll(d.template, "chore(repo): tolgo backend");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.deepEqual(piano.rimozioni.map((r) => r.chiave), [".claude/rules/backend.md"]);
    assert.equal(applica(piano, { target: d.project }).stato, "applicata");
    assert.equal(exists(d.project, ".claude/rules/backend.md"), false);
  });
});

test("modulo rimosso dal template ma modificato nel progetto: domanda, nessuna rimozione", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.project, { ".claude/rules/backend.md": "mio backend\n" });
    commitAll(d.project, "chore(repo): mio backend");
    git(d.template, "rm", "-q", ".claude/rules/backend.md");
    writeAll(d.template, { "_template/moduli.json": JSON.stringify({ schema: 1, moduli: MODULI.filter((m) => m.nome !== "backend") }, null, 2) });
    commitAll(d.template, "chore(repo): tolgo backend");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.deepEqual(piano.rimozioni, []);
    assert.ok(piano.domande.some((q) => q.tipo === "rimosso-modificato" && q.chiave === ".claude/rules/backend.md"));
    assert.equal(read(d.project, ".claude/rules/backend.md"), "mio backend\n");
  });
});

test("modulo nuovo nel template: domanda, non copiato; rifiutato nel registro: nessuna domanda", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    const nuovo = [...MODULI, { nome: "lavoro", cartella: "rules", applicabilita: "sempre", descrizione: "Contesto e indagine." }];
    writeAll(d.template, { "_template/moduli.json": JSON.stringify({ schema: 1, moduli: nuovo }, null, 2), ".claude/rules/lavoro.md": "lavoro v1\n" });
    commitAll(d.template, "chore(repo): modulo lavoro");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    const domanda = piano.domande.find((q) => q.tipo === "nuovo-modulo" && q.modulo === "lavoro");
    assert.ok(domanda, "manca la domanda sul modulo nuovo");
    assert.equal(domanda.descrizione, "Contesto e indagine.");
    assert.equal(piano.scritture.some((s) => s.chiave === ".claude/rules/lavoro.md"), false);
    assert.equal(exists(d.project, ".claude/rules/lavoro.md"), false);

    // Dopo il rifiuto registrato, la domanda non torna.
    const registro = JSON.parse(read(d.project, ".claude/kit-regole.json"));
    registro.moduli.rifiutati = ["lavoro"];
    writeAll(d.project, { ".claude/kit-regole.json": JSON.stringify(registro, null, 2) });
    commitAll(d.project, "chore(repo): rifiuto del modulo");
    const dopo = pianifica({ template: d.template, target: d.project });
    assert.equal(dopo.domande.some((q) => q.modulo === "lavoro"), false);
  });
});

test("registro malformato o ostile: rifiuto senza modificare nulla", () => {
  const casi = [
    ["JSON non valido", "{ non è json"],
    ["schema sconosciuto", JSON.stringify({ schema: 9, tag: null, profilo: null, file: {}, claudeMd: {}, moduli: { rifiutati: [] } })],
    ["percorso che esce dal progetto", JSON.stringify({ schema: 1, tag: null, profilo: null, file: { "../../etc/x.md": { modello: "a".repeat(64), progetto: "b".repeat(64) } }, claudeMd: {}, moduli: { rifiutati: [] } })],
    ["impronta non esadecimale", JSON.stringify({ schema: 1, tag: null, profilo: null, file: { ".claude/rules/core.md": { modello: "non-hash", progetto: "b".repeat(64) } }, claudeMd: {}, moduli: { rifiutati: [] } })],
    ["parte di CLAUDE.md sconosciuta", JSON.stringify({ schema: 1, tag: null, profilo: null, file: {}, claudeMd: { pippo: { modello: "a".repeat(64), progetto: "b".repeat(64) } }, moduli: { rifiutati: [] } })],
  ];
  for (const [label, testo] of casi) {
    withDirs((d) => {
      setup(d);
      writeAll(d.project, { ".claude/kit-regole.json": testo });
      const prima = read(d.project, "CLAUDE.md");
      const piano = pianifica({ template: d.template, target: d.project });
      assert.equal(piano.stato, "rifiutato", label);
      assert.equal(read(d.project, "CLAUDE.md"), prima, label);
    });
  }
});

test("percorsi con '..' o assoluti: rifiutati, nessuna scrittura fuori dal progetto", () => {
  withDirs((d) => {
    assert.throws(() => sicuro(d.project, "../fuori.md"), /percorso non sicuro/);
    assert.throws(() => sicuro(d.project, "/assoluto.md"), /percorso non sicuro/);
    assert.throws(() => sicuro(d.project, ".claude\\..\\..\\x.md"), /percorso non sicuro/);
    assert.equal(sicuro(d.project, ".claude/rules/core.md"), path.join(d.project, ".claude", "rules", "core.md"));
  });
});

test("tag assente o template senza manifest: rifiuto senza modifiche", () => {
  withDirs((d) => {
    writeAll(d.template, templateFiles());
    commitAll(d.template, "chore(repo): nessun tag");
    writeAll(d.project, projectFiles());
    commitAll(d.project, "chore(repo): progetto");
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /nessun tag di rilascio/);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
  });
});

test("CLAUDE.md senza profilo dichiarato: rifiuto", () => {
  withDirs((d) => {
    setup(d, { projSolo: { ...projectFiles(), "CLAUDE.md": "# Progetto\n" } });
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /profilo/);
  });
});

test("su main con modifiche non committate: rifiuto, nessuna scrittura", () => {
  withDirs((d) => {
    setup(d);
    git(d.project, "checkout", "-q", "-b", "main");
    writeAll(d.project, { ".claude/rules/backend.md": "modifica in corso\n" });
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /modifiche non committate/);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
  });
});

test("su main pulito con develop: crea bugfix/kit-regole da develop prima di scrivere", () => {
  withDirs((d) => {
    setup(d);
    git(d.project, "checkout", "-q", "-b", "develop");
    git(d.project, "checkout", "-q", "-b", "main");
    git(d.project, "checkout", "-q", "develop");
    git(d.project, "checkout", "-q", "main");
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.ok(piano.branch.nome.startsWith("bugfix/kit-regole-"));
    const esito = applica(piano, { target: d.project });
    assert.equal(esito.stato, "applicata", esito.motivo);
    assert.equal(git(d.project, "rev-parse", "--abbrev-ref", "HEAD").trim(), piano.branch.nome);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), true);
  });
});

test("su un branch di lavoro con modifiche non committate: rimandata, nessuna modifica", () => {
  withDirs((d) => {
    setup(d);
    writeAll(d.project, { ".claude/rules/backend.md": "modifica in corso\n" });
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /rimandata/);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
    assert.equal(read(d.project, ".claude/rules/backend.md"), "modifica in corso\n");
  });
});

test("su main con il nome bugfix del giorno già occupato: usa il primo nome libero (-2)", () => {
  withDirs((d) => {
    setup(d);
    git(d.project, "checkout", "-q", "-b", "develop");
    git(d.project, "checkout", "-q", "-b", "main");
    const oggi = new Date();
    const data = `${oggi.getFullYear()}-${String(oggi.getMonth() + 1).padStart(2, "0")}-${String(oggi.getDate()).padStart(2, "0")}`;
    git(d.project, "branch", `bugfix/kit-regole-${data}`, "develop");
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "pronto", piano.motivo);
    assert.equal(piano.branch.nome, `bugfix/kit-regole-${data}-2`);
    assert.equal(applica(piano, { target: d.project }).stato, "applicata");
    assert.equal(git(d.project, "rev-parse", "--abbrev-ref", "HEAD").trim(), `bugfix/kit-regole-${data}-2`);
  });
});

test("HEAD staccata: rifiuto senza modifiche", () => {
  withDirs((d) => {
    setup(d);
    git(d.project, "checkout", "-q", "--detach");
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /HEAD staccata/);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
  });
});

test("merge in corso: rifiuto senza modifiche", () => {
  withDirs((d) => {
    setup(d);
    const head = git(d.project, "rev-parse", "HEAD").trim();
    writeFileSync(path.join(d.project, ".git", "MERGE_HEAD"), `${head}\n`);
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /merge o rebase in corso/);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
  });
});

test("su main senza develop: rifiuto e nessun branch creato", () => {
  withDirs((d) => {
    setup(d);
    git(d.project, "checkout", "-q", "-b", "main");
    const piano = pianifica({ template: d.template, target: d.project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /develop/);
    assert.equal(git(d.project, "rev-parse", "--abbrev-ref", "HEAD").trim(), "main");
  });
});

test("cartella non versionata con modifiche da fare: rifiuto", () => {
  const base = mkdtempSync(path.join(os.tmpdir(), "kit-sync-nogit-"));
  const template = path.join(base, "template");
  const project = path.join(base, "progetto");
  mkdirSync(template);
  mkdirSync(project);
  try {
    git(template, "init", "-q", "-b", "main");
    writeAll(template, templateFiles());
    commitAll(template, "chore(repo): template");
    git(template, "tag", "1.0.0");
    writeAll(project, projectFiles());
    const piano = pianifica({ template, target: project });
    assert.equal(piano.stato, "rifiutato");
    assert.match(piano.motivo, /non versionata/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test("lock di un'altra sessione ancora attivo: nessuna applicazione", () => {
  withDirs((d) => {
    setup(d);
    const piano = pianifica({ template: d.template, target: d.project });
    writeAll(d.project, { ".claude/kit-regole.lock": "altra sessione\n" });
    const esito = applica(piano, { target: d.project });
    assert.equal(esito.stato, "non-applicata");
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
    assert.equal(exists(d.project, ".claude/kit-regole.lock"), true, "il lock altrui non va rimosso");
  });
});

test("errore a metà: le scritture già fatte si annullano", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.template, { ".claude/rules/backend.md": "backend v2\n", ".claude/rules/core.md": "> Versione 4.6 — ultima revisione: 2026-11-28.\ncore v2\n" });
    commitAll(d.template, "chore(repo): v2");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    let chiamate = 0;
    const scrivi = (full, testo) => {
      chiamate++;
      if (chiamate === 2) throw new Error("disco pieno (simulato)");
      writeFileSync(full, testo);
    };
    const prima = read(d.project, ".claude/rules/backend.md");
    const esito = applica(piano, { target: d.project, scrivi });
    assert.equal(esito.stato, "annullata");
    assert.equal(read(d.project, ".claude/rules/backend.md"), prima);
    assert.equal(read(d.project, ".claude/rules/core.md"), CORE);
  });
});

test("seconda esecuzione senza cambiamenti: nessuna scrittura", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    const secondo = pianifica({ template: d.template, target: d.project });
    assert.equal(secondo.stato, "pronto", secondo.motivo);
    assert.deepEqual(secondo.scritture, []);
    assert.deepEqual(secondo.rimozioni, []);
    assert.equal(secondo.registroCambia, false);
    assert.deepEqual(secondo.domande, []);
  });
});

test("il registro non contiene percorsi locali né dati personali", () => {
  withDirs((d) => {
    setup(d);
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    const testo = read(d.project, ".claude/kit-regole.json");
    assert.equal(testo.includes(d.base), false);
    assert.equal(testo.includes(os.homedir()), false);
    assert.equal(/"file"|"claudeMd"|"moduli"/.test(testo), true);
  });
});

test("sezione Regole personalizzata con template cambiato: domanda, mai sovrascritta", () => {
  withDirs((d) => {
    setup(d, { projExtra: { "CLAUDE.md": "# Progetto\n\n## Regole\n- **Versione delle regole copiate:** `core.md` v4.5 del 2026-11-27\n- **Moduli rimossi o non attivati (fuori ambito):** feature-workflow\n- **Lingua:** it\n\n## Progetto\n- **Profilo:** standard\n" } });
    applica(pianifica({ template: d.template, target: d.project }), { target: d.project });
    commitAll(d.project, "chore(repo): registro");
    writeAll(d.template, { "CLAUDE.md": CLAUDE_TPL.replace("## Progetto", "- **Nota:** nuova\n\n## Progetto") });
    commitAll(d.template, "chore(repo): CLAUDE nuovo");
    git(d.template, "tag", "1.1.0");

    const piano = pianifica({ template: d.template, target: d.project });
    assert.ok(piano.domande.some((q) => q.chiave === "CLAUDE.md:regole"));
    assert.equal(piano.scritture.some((s) => s.tipo === "claude"), false, "la sezione Regole non si cambia da sola");
    applica(piano, { target: d.project });
    assert.match(read(d.project, "CLAUDE.md"), /\*\*Lingua:\*\* it/);
  });
});

test("comando sincronizza: --dry-run elenca il piano senza scrivere, poi applica", () => {
  withDirs((d) => {
    setup(d);
    const script = path.join(d.project, "..", "..", "x");
    void script;
    const regole = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "scripts", "regole.mjs");
    const run = (...args) => {
      const r = spawnSync(process.execPath, [regole, "sincronizza", "--template", d.template, "--target", d.project, ...args], { encoding: "utf8" });
      return { code: r.status, json: JSON.parse(r.stdout || "null"), err: r.stderr };
    };
    const prova = run("--dry-run");
    assert.equal(prova.code, 0, prova.err);
    assert.equal(prova.json.stato, "pronto");
    assert.equal(prova.json.dryRun, true);
    assert.equal(exists(d.project, ".claude/kit-regole.json"), false);
    const vera = run();
    assert.equal(vera.code, 0, vera.err);
    assert.equal(vera.json.esito.stato, "applicata");
    assert.equal(exists(d.project, ".claude/kit-regole.json"), true);
  });
});
