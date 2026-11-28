#!/usr/bin/env node
// Operazioni sui file della skill /kit:regole. La skill fa le domande e gestisce conferme e conflitti;
// copie, confronti e spostamenti li fa questo script, così il risultato è ripetibile.
//   copia     --template <dir> --target <dir> (--solo-git | --profilo <p>) [--backend] [--frontend]
//             [--sicurezza-estesa] [--opzionali a,b] [--root file,file] [--dry-run]
//   confronta --template <dir> --target <dir>                      (sola lettura)
//   aggiorna  --template <dir> --target <dir> --file <percorso>    (salva .bak, poi copia dal template)
//   sposta    --target <dir> --file <percorso> --a <percorso>      (mai sopra un file esistente)
//   rimuovi   --target <dir> --file <percorso>                     (salva .bak, poi cancella)
//   sincronizza --template <dir> --target <dir> [--dry-run] [--rispondi id=scelta]  (piano dall'ultimo tag, poi applica le
//             sole operazioni automatiche; le domande restano nel JSON, vedi lib/sync.mjs)
// I percorsi di --file e --a sono relativi al progetto. L'uscita è JSON su stdout; gli errori vanno
// su stderr con exit 1. Nessun file esistente viene sovrascritto da `copia`.
// I moduli (nome, cartella, applicabilità, profilo minimo, versione breve) stanno nel manifest del
// template, `_template/moduli.json`: qui non ci sono elenchi di moduli.
// Richiede Node.js.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compareVersions, ruleVersion } from "./lib/template.mjs";
import { applica, pianifica } from "./lib/sync.mjs";
import { APPLICABILITA, DETAIL, EXTRA, MANIFEST, PROFILES, REFERENCE, RULES, ROOT_FILES, PROFILE_VALUE, expectedFolder, isManagedModule, modulo } from "./lib/layout.mjs";


const PLACEHOLDER = "[strutturato (default) | standard | mini]";

class UserError extends Error {}
const fail = (message) => {
  throw new UserError(message);
};

const SWITCHES = new Set(["solo-git", "backend", "frontend", "sicurezza-estesa", "dry-run"]);
const VALUES = new Set(["template", "target", "profilo", "opzionali", "root", "file", "a", "rispondi"]);

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

/** Legge il manifest dei moduli del template e ne controlla la forma; restituisce l'elenco dei moduli. */
function loadManifest(template) {
  const file = path.join(template, MANIFEST);
  if (!existsSync(file)) fail(`il template non contiene ${MANIFEST}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${MANIFEST} non è JSON valido: ${error.message}`);
  }
  if (!Array.isArray(manifest.moduli)) fail(`${MANIFEST}: manca l'elenco «moduli»`);
  const names = new Set();
  for (const m of manifest.moduli) {
    if (!m.nome || names.has(m.nome)) fail(`${MANIFEST}: nome mancante o ripetuto: ${m.nome}`);
    names.add(m.nome);
    if (!["rules", "rules-optional"].includes(m.cartella)) fail(`${MANIFEST}: cartella non valida per ${m.nome}`);
    if (!APPLICABILITA.includes(m.applicabilita)) fail(`${MANIFEST}: applicabilità non valida per ${m.nome}`);
    if (m.profiloMinimo && !PROFILES.includes(m.profiloMinimo)) fail(`${MANIFEST}: profilo minimo non valido per ${m.nome}`);
    if (m.versioneBreve && !existsSync(path.join(template, m.versioneBreve))) fail(`${MANIFEST}: manca la versione breve di ${m.nome}`);
  }
  return manifest.moduli;
}


function list(value, allowed, label) {
  const items = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const item of items) if (!allowed.includes(item)) fail(`${label} non ammesso: ${item} (ammessi: ${allowed.join(", ")})`);
  return items;
}
/** File del template da cui deriva un file del progetto, o null se il template non lo ha. */
function sourceFor(template, relative, profile, moduli) {
  const name = path.posix.basename(relative, ".md");
  const folder = path.posix.dirname(relative);
  const candidates = [];
  const breve = modulo(moduli, name)?.versioneBreve;
  if (folder === RULES && profile === "standard" && breve) candidates.push(breve);
  if ([RULES, EXTRA, DETAIL].includes(folder)) candidates.push(`${RULES}/${name}.md`, `${EXTRA}/${name}.md`);
  else candidates.push(relative);
  return candidates.map((c) => path.join(template, c)).find((c) => existsSync(c)) ?? null;
}

/** Piano di copia: coppie [origine, destinazione relativa]. */
function copyPlan(template, options, moduli) {
  const soloGit = Boolean(options["solo-git"]);
  const profile = options.profilo;
  if (soloGit) {
    const extra = ["profilo", "backend", "frontend", "sicurezza-estesa", "opzionali"].filter((k) => options[k]);
    if (extra.length) fail(`con --solo-git non si usano: ${extra.join(", ")}`);
  } else if (!PROFILES.includes(profile)) {
    fail(`serve --profilo con uno tra: ${PROFILES.join(", ")} (oppure --solo-git)`);
  }
  const optional = list(
    options.opzionali,
    moduli.filter((m) => m.applicabilita === "opzionale" && !m.copiaSempre).map((m) => m.nome),
    "modulo opzionale",
  );
  const roots = list(options.root, ROOT_FILES, "file di root");
  const plan = [];
  const add = (from, to) => plan.push([path.join(template, from), to]);
  const module = (name, folder) => {
    const from = [RULES, EXTRA].map((f) => `${f}/${name}.md`).find((f) => existsSync(path.join(template, f)));
    if (!from) fail(`il template non contiene il modulo ${name}`);
    add(from, `${folder}/${name}.md`);
  };

  if (soloGit) {
    moduli.filter((m) => m.soloGit).forEach((m) => module(m.nome, RULES));
  } else {
    const selected = moduli.filter((m) => {
      switch (m.applicabilita) {
        case "sempre":
        case "profilo":
          return true;
        case "backend":
          return Boolean(options.backend);
        case "frontend":
          return Boolean(options.frontend);
        case "sicurezza-estesa":
          return Boolean(options["sicurezza-estesa"]) && (!m.richiedeBackend || Boolean(options.backend));
        default:
          return false; // i moduli opzionali si copiano più sotto
      }
    });
    for (const m of selected) {
      if (profile === "standard" && m.versioneBreve) {
        add(m.versioneBreve, `${RULES}/${m.nome}.md`);
        module(m.nome, DETAIL);
      } else {
        module(m.nome, expectedFolder(m, profile));
      }
    }
    [...optional, ...moduli.filter((m) => m.copiaSempre).map((m) => m.nome)].forEach((n) => module(n, EXTRA));
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
  const moduli = loadManifest(template);
  const { plan, profile } = copyPlan(template, options, moduli);
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
  const moduli = loadManifest(template);
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
      check(relative, sourceFor(template, relative, profile, moduli));
      const m = modulo(moduli, name);
      const expected = profile && folder !== DETAIL && m ? expectedFolder(m, profile) : null;
      if (expected && expected !== folder) misplaced.push({ file: relative, atteso: `${expected}/${name}.md` });
    }
  }
  // File di riferimento e di root: solo quelli che il progetto ha già.
  for (const relative of [...REFERENCE, "NuGet.config", ".editorconfig"]) {
    if (existsSync(path.join(target, relative)) && existsSync(path.join(template, relative))) check(relative, path.join(template, relative));
  }
  const nuovi = [...templateModules].filter((n) => !present.has(n)).sort();
  return {
    profilo: profile,
    uguali: equal,
    diversi: different,
    nuovi,
    descrizioniNuovi: Object.fromEntries(nuovi.map((n) => [n, modulo(moduli, n)?.descrizione ?? ""])),
    rimossi: removed,
    fuoriPosto: misplaced,
    obbligatoriMancanti: moduli
      .filter((m) => m.applicabilita === "sempre" || m.applicabilita === "profilo")
      .map((m) => m.nome)
      .filter((n) => !present.has(n)),
  };
}

/** Percorso modificabile: un modulo in rules, rules-optional o dettaglio, oppure un file di riferimento. */
function managed(target, value, label) {
  if (!value) fail(`manca --${label}`);
  const relative = path.posix.normalize(value.replace(/\\/g, "/"));
  const isModule = isManagedModule(relative);
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
  const moduli = loadManifest(template);
  const { relative, full } = managed(target, options.file, "file");
  const claude = path.join(target, "CLAUDE.md");
  const profile = existsSync(claude) ? PROFILE_VALUE.exec(readFileSync(claude, "utf8"))?.[1]?.toLowerCase() : null;
  const source = sourceFor(template, relative, profile, moduli);
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

/**
 * Sincronizzazione all'avvio (ADR 0004): piano dall'ultimo tag, poi applicazione delle sole operazioni
 * automatiche. Le domande restano nel risultato: la skill le pone una alla volta.
 */
function sincronizza(options) {
  const { target, template } = folders(options);
  const risposte = {};
  if (options.rispondi) {
    const cut = options.rispondi.indexOf("=");
    if (cut < 1) fail("--rispondi vuole il formato id=scelta");
    risposte[options.rispondi.slice(0, cut)] = options.rispondi.slice(cut + 1);
  }
  const piano = pianifica({ template, target, risposte });
  const riepilogo = {
    stato: piano.stato,
    motivo: piano.motivo ?? null,
    tag: piano.tag ?? null,
    profilo: piano.profilo ?? null,
    daScrivere: piano.stato === "pronto"
      ? {
          file: piano.scritture.map((s) => (s.tipo === "sposta" ? `${s.da} -> ${s.a}` : s.chiave)),
          rimossi: piano.rimozioni.map((r) => r.chiave),
          registro: piano.registroCambia,
          branch: piano.branch?.nome ?? null,
        }
      : null,
    domande: piano.domande ?? [],
    dryRun: Boolean(options["dry-run"]),
  };
  if (piano.stato !== "pronto" || options["dry-run"]) return riepilogo;
  return { ...riepilogo, esito: applica(piano, { target }) };
}

const COMMANDS = { copia: copy, confronta: compare, aggiorna: update, sposta: move, rimuovi: remove, sincronizza };

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!Object.hasOwn(COMMANDS, command ?? "")) fail(`comando sconosciuto: ${command ?? ""} (ammessi: ${Object.keys(COMMANDS).join(", ")})`);
  process.stdout.write(JSON.stringify(COMMANDS[command](options), null, 2) + "\n");
} catch (error) {
  process.stderr.write(`${error instanceof UserError ? error.message : `errore: ${error.message}`}\n`);
  process.exit(1);
}
