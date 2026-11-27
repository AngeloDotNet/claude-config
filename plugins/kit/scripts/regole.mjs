#!/usr/bin/env node
// Operazioni sui file della skill /kit:regole. La skill fa le domande e gestisce conferme e conflitti;
// copie, confronti e spostamenti li fa questo script, così il risultato è ripetibile.
//   copia     --template <dir> --target <dir> (--solo-git | --profilo <p>) [--backend] [--frontend]
//             [--sicurezza-estesa] [--opzionali a,b] [--root file,file] [--dry-run]
//   confronta --template <dir> --target <dir>                      (sola lettura)
//   aggiorna  --template <dir> --target <dir> --file <percorso>    (salva .bak, poi copia dal template)
//   sposta    --target <dir> --file <percorso> --a <percorso>      (mai sopra un file esistente)
//   rimuovi   --target <dir> --file <percorso>                     (salva .bak, poi cancella)
// I percorsi di --file e --a sono relativi al progetto. L'uscita è JSON su stdout; gli errori vanno
// su stderr con exit 1. Nessun file esistente viene sovrascritto da `copia`.
// Richiede Node.js.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compareVersions, ruleVersion } from "./lib/template.mjs";

const ALWAYS = ["core", "lavoro", "git", "security", "contratto"];
const SHORTABLE = ["git-flusso", "git-avanzato", "workflow", "qualita", "documentazione"];
const PROFILED = [...SHORTABLE, "operativita"];
const SOLO_GIT = ["core", "lavoro", "git", "git-flusso", "git-avanzato", "workflow"];
const BACKEND = ["backend", "backend-architecture", "backend-app", "osservabilita"];
const OPTIONAL = ["feature-workflow", "backend-email", "backend-infra"];
const PROFILES = ["strutturato", "standard", "mini"];
const ROOT_FILES = ["NuGet.config", ".editorconfig", ".gitignore", ".gitattributes"];
const REFERENCE = [
  "_template/avvio-progetto.md",
  "_template/settings.example.json",
  "_template/eslint.config.example.js",
  "_template/ci/ci.yml",
  "_template/ci/kit-allow.yml",
  "_template/ci/kit-allow-report.mjs",
  "_template/ci/kit-allow-report.test.mjs",
];
const RULES = ".claude/rules";
const EXTRA = ".claude/rules-optional";
const DETAIL = `${EXTRA}/dettaglio`;
const PROFILE_VALUE = /^[ \t]*(?:-[ \t]*)?(?:\*\*)?Profilo:(?:\*\*)?[ \t]*`?(mini|standard|strutturato)\b/im;
const PLACEHOLDER = "[strutturato (default) | standard | mini]";

class UserError extends Error {}
const fail = (message) => {
  throw new UserError(message);
};

const SWITCHES = new Set(["solo-git", "backend", "frontend", "sicurezza-estesa", "dry-run"]);
const VALUES = new Set(["template", "target", "profilo", "opzionali", "root", "file", "a"]);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i++) {
    const name = rest[i].startsWith("--") ? rest[i].slice(2) : null;
    if (name && SWITCHES.has(name)) options[name] = true;
    else if (name && VALUES.has(name) && i + 1 < rest.length) options[name] = rest[++i];
    else fail(`opzione non riconosciuta: ${rest[i]}`);
  }
  return { command, options };
}

const same = (a, b) => path.resolve(a).replace(/\\/g, "/").toLowerCase() === path.resolve(b).replace(/\\/g, "/").toLowerCase();
const normalized = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const mdNames = (dir) => (existsSync(dir) ? readdirSync(dir).filter((n) => n.endsWith(".md")).map((n) => n.slice(0, -3)).sort() : []);

function folders(options, { needTemplate = true } = {}) {
  const { target, template } = options;
  if (!target) fail("manca --target");
  if (!existsSync(target) || !statSync(target).isDirectory()) fail(`la cartella di destinazione non esiste: ${target}`);
  if (needTemplate) {
    if (!template) fail("manca --template");
    if (!existsSync(path.join(template, RULES, "core.md"))) fail(`la cartella non è un template valido: ${template}`);
    if (same(target, template)) fail("la destinazione coincide con il template");
  }
  return { target, template };
}

function list(value, allowed, label) {
  const items = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const item of items) if (!allowed.includes(item)) fail(`${label} non ammesso: ${item} (ammessi: ${allowed.join(", ")})`);
  return items;
}

/** Cartella attesa di un modulo per il profilo: rules o rules-optional. */
function expectedFolder(name, profile) {
  if (profile === "mini" && [...PROFILED, "security-avanzata"].includes(name)) return EXTRA;
  if (profile !== "strutturato" && name === "security-strutturato") return EXTRA;
  if ([...OPTIONAL, "docker"].includes(name)) return null; // si attivano a mano: nessuna posizione attesa
  return RULES;
}

/** File del template da cui deriva un file del progetto, o null se il template non lo ha. */
function sourceFor(template, relative, profile) {
  const name = path.posix.basename(relative, ".md");
  const folder = path.posix.dirname(relative);
  const candidates = [];
  if (folder === RULES && profile === "standard" && SHORTABLE.includes(name)) candidates.push(`_template/rules-standard/${name}.md`);
  if ([RULES, EXTRA, DETAIL].includes(folder)) candidates.push(`${RULES}/${name}.md`, `${EXTRA}/${name}.md`);
  else candidates.push(relative);
  return candidates.map((c) => path.join(template, c)).find((c) => existsSync(c)) ?? null;
}

/** Piano di copia: coppie [origine, destinazione relativa]. */
function copyPlan(template, options) {
  const soloGit = Boolean(options["solo-git"]);
  const profile = options.profilo;
  if (soloGit) {
    const extra = ["profilo", "backend", "frontend", "sicurezza-estesa", "opzionali"].filter((k) => options[k]);
    if (extra.length) fail(`con --solo-git non si usano: ${extra.join(", ")}`);
  } else if (!PROFILES.includes(profile)) {
    fail(`serve --profilo con uno tra: ${PROFILES.join(", ")} (oppure --solo-git)`);
  }
  const optional = list(options.opzionali, OPTIONAL, "modulo opzionale");
  const roots = list(options.root, ROOT_FILES, "file di root");
  const plan = [];
  const add = (from, to) => plan.push([path.join(template, from), to]);
  const module = (name, folder) => {
    const from = [RULES, EXTRA].map((f) => `${f}/${name}.md`).find((f) => existsSync(path.join(template, f)));
    if (!from) fail(`il template non contiene il modulo ${name}`);
    add(from, `${folder}/${name}.md`);
  };

  if (soloGit) {
    SOLO_GIT.forEach((n) => module(n, RULES));
  } else {
    const names = [...ALWAYS, ...PROFILED];
    if (options.backend) names.push(...BACKEND);
    if (options.frontend) names.push("frontend");
    if (options["sicurezza-estesa"]) {
      names.push("security-avanzata", "security-strutturato");
      if (options.backend) names.push("security-backend");
      if (options.frontend) names.push("security-frontend");
    }
    for (const name of names) {
      const folder = expectedFolder(name, profile);
      if (profile === "standard" && SHORTABLE.includes(name)) {
        add(`_template/rules-standard/${name}.md`, `${RULES}/${name}.md`);
        module(name, DETAIL);
      } else {
        module(name, folder);
      }
    }
    [...optional, "docker"].forEach((n) => module(n, EXTRA));
  }
  for (const file of ["CLAUDE.md", ...roots, ...REFERENCE]) {
    if (!existsSync(path.join(template, file))) fail(`il template non contiene ${file}`);
    add(file, file);
  }
  return { plan, profile: soloGit ? null : profile };
}

/** Testo del CLAUDE.md con il profilo scritto; null se non va modificato. Un valore diverso è un errore. */
function withProfile(text, profile) {
  const declared = PROFILE_VALUE.exec(text)?.[1]?.toLowerCase();
  if (declared) {
    if (declared !== profile) fail(`il CLAUDE.md dichiara già il Profilo «${declared}»: non lo cambio in «${profile}»`);
    return null;
  }
  if (text.includes(PLACEHOLDER)) return text.replace(PLACEHOLDER, profile);
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `- **Profilo:** ${profile}`;
  if (/^.*Profilo:.*$/m.test(text)) return text.replace(/^[^\r\n]*Profilo:[^\r\n]*/m, () => line);
  if (/^## Progetto[ \t]*\r?$/m.test(text)) return text.replace(/^## Progetto[ \t]*(\r?\n)/m, (m) => `${m}${line}${eol}`);
  return `${text.replace(/\s*$/, "")}${eol}${eol}## Progetto${eol}${line}${eol}`;
}

function copy(options) {
  const { target, template } = folders(options);
  if (existsSync(path.join(target, RULES))) fail("il progetto ha già .claude/rules: usa il confronto (caso B)");
  const { plan, profile } = copyPlan(template, options);
  const claude = path.join(target, "CLAUDE.md");
  // Il controllo del profilo viene prima di ogni scrittura.
  if (profile && existsSync(claude)) withProfile(readFileSync(claude, "utf8"), profile);

  const copied = [];
  const skipped = [];
  for (const [from, to] of plan) {
    const destination = path.join(target, to);
    if (existsSync(destination)) {
      skipped.push(to);
      continue;
    }
    copied.push(to);
    if (options["dry-run"]) continue;
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(from, destination);
  }
  if (profile && !options["dry-run"]) {
    const updated = withProfile(readFileSync(claude, "utf8"), profile);
    if (updated !== null) writeFileSync(claude, updated);
  }
  return { profilo: profile, copiati: copied, saltati: skipped, dryRun: Boolean(options["dry-run"]) };
}

function compare(options) {
  const { target, template } = folders(options);
  const claude = path.join(target, "CLAUDE.md");
  const profile = (existsSync(claude) ? PROFILE_VALUE.exec(readFileSync(claude, "utf8"))?.[1]?.toLowerCase() : null) ?? null;
  const templateModules = new Set([...mdNames(path.join(template, RULES)), ...mdNames(path.join(template, EXTRA))]);
  const present = new Set();
  const equal = [];
  const different = [];
  const removed = [];
  const misplaced = [];

  const check = (relative, source) => {
    const file = path.join(target, relative);
    if (normalized(file) === normalized(source)) {
      equal.push(relative);
      return;
    }
    const mine = ruleVersion(file);
    const theirs = ruleVersion(source);
    different.push({
      file: relative,
      versioneProgetto: mine,
      versioneTemplate: theirs,
      progettoPiuRecente: Boolean(mine && theirs && compareVersions(mine, theirs) > 0),
      versioneMancante: !mine || !theirs,
    });
  };

  for (const folder of [RULES, EXTRA, DETAIL]) {
    for (const name of mdNames(path.join(target, folder))) {
      const relative = `${folder}/${name}.md`;
      if (!templateModules.has(name)) {
        removed.push(relative);
        continue;
      }
      if (folder !== DETAIL) present.add(name);
      check(relative, sourceFor(template, relative, profile));
      const expected = profile && folder !== DETAIL ? expectedFolder(name, profile) : null;
      if (expected && expected !== folder) misplaced.push({ file: relative, atteso: `${expected}/${name}.md` });
    }
  }
  // File di riferimento e di root: solo quelli che il progetto ha già.
  for (const relative of [...REFERENCE, "NuGet.config", ".editorconfig"]) {
    if (existsSync(path.join(target, relative)) && existsSync(path.join(template, relative))) check(relative, path.join(template, relative));
  }
  return {
    profilo: profile,
    uguali: equal,
    diversi: different,
    nuovi: [...templateModules].filter((n) => !present.has(n)).sort(),
    rimossi: removed,
    fuoriPosto: misplaced,
    obbligatoriMancanti: [...ALWAYS, ...PROFILED].filter((n) => !present.has(n)),
  };
}

/** Percorso modificabile: un modulo in rules, rules-optional o dettaglio, oppure un file di riferimento. */
function managed(target, value, label) {
  if (!value) fail(`manca --${label}`);
  const relative = path.posix.normalize(value.replace(/\\/g, "/"));
  const isModule = [RULES, EXTRA, DETAIL].includes(path.posix.dirname(relative)) && relative.endsWith(".md");
  if (!isModule && ![...REFERENCE, "NuGet.config", ".editorconfig"].includes(relative)) {
    fail(`percorso non gestito da /kit:regole: ${value}`);
  }
  return { relative, full: path.join(target, relative) };
}

/** Copia di salvataggio accanto al file: .bak, poi .bak2, .bak3; non sovrascrive mai. */
function backup(file) {
  let candidate = `${file}.bak`;
  for (let n = 2; existsSync(candidate); n++) candidate = `${file}.bak${n}`;
  copyFileSync(file, candidate);
  return candidate;
}

function update(options) {
  const { target, template } = folders(options);
  const { relative, full } = managed(target, options.file, "file");
  const claude = path.join(target, "CLAUDE.md");
  const profile = existsSync(claude) ? PROFILE_VALUE.exec(readFileSync(claude, "utf8"))?.[1]?.toLowerCase() : null;
  const source = sourceFor(template, relative, profile);
  if (!source) fail(`il template non ha un file per ${relative}`);
  const saved = existsSync(full) ? path.basename(backup(full)) : null;
  mkdirSync(path.dirname(full), { recursive: true });
  copyFileSync(source, full);
  return { aggiornato: relative, copiaDiSalvataggio: saved };
}

function move(options) {
  const { target } = folders(options, { needTemplate: false });
  const from = managed(target, options.file, "file");
  const to = managed(target, options.a, "a");
  if (!existsSync(from.full)) fail(`file non trovato: ${from.relative}`);
  if (existsSync(to.full)) fail(`la destinazione esiste già: ${to.relative}`);
  mkdirSync(path.dirname(to.full), { recursive: true });
  renameSync(from.full, to.full);
  return { spostato: from.relative, in: to.relative };
}

function remove(options) {
  const { target } = folders(options, { needTemplate: false });
  const { relative, full } = managed(target, options.file, "file");
  if (!existsSync(full)) fail(`file non trovato: ${relative}`);
  const saved = path.basename(backup(full));
  rmSync(full);
  return { rimosso: relative, copiaDiSalvataggio: saved };
}

const COMMANDS = { copia: copy, confronta: compare, aggiorna: update, sposta: move, rimuovi: remove };

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!Object.hasOwn(COMMANDS, command ?? "")) fail(`comando sconosciuto: ${command ?? ""} (ammessi: ${Object.keys(COMMANDS).join(", ")})`);
  process.stdout.write(JSON.stringify(COMMANDS[command](options), null, 2) + "\n");
} catch (error) {
  process.stderr.write(`${error instanceof UserError ? error.message : `errore: ${error.message}`}\n`);
  process.exit(1);
}
