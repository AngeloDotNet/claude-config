// Controlla i rimandi tra regole, skill, script e documentazione del repository:
// `file.md` §N, `file.md` «Titolo», percorsi scripts/*.mjs e nomi /kit:skill.
// Limiti: non controlla i rimandi senza nome del file (per esempio un «§4» da solo); per «Titolo»
// basta che un titolo o un testo in grassetto del file citato lo contenga.
// Eseguire con: node --test plugins/kit/tests/refs.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** File in cui cercare i rimandi. CHANGELOG, archivio del CHANGELOG (docs/changelog), ADR e test restano fuori: citano anche lo stato passato. */
const SCANNED = [".claude/rules", ".claude/rules-optional", "_template", "plugins/kit/skills", "plugins/kit/scripts", "docs", "README.md", "CLAUDE.md"];
const SKIPPED = new Set(["docs/adr", "docs/devto", "docs/changelog"]);

/** File che possono essere destinazione di un rimando (testo completo, non le versioni brevi dello standard). */
const TARGET_DIRS = [".claude/rules", ".claude/rules-optional"];
const TARGET_FILES = ["_template/avvio-progetto.md", "CLAUDE.md"];

/**
 * Sezioni di core.md che stanno in altri moduli con la stessa numerazione (riga «Mappa» di core.md).
 * §0b e §4 mancano di proposito: i rimandi vanno a qualita.md.
 */
const CORE_ELSEWHERE = { "1": "contratto.md", "2": "contratto.md", "5": "operativita.md", "5a": "operativita.md", "6": "workflow.md" };

const SECTION = String.raw`\d+[a-z]?(?:\.\d+[a-z]?)?`;
const SECTION_REF = new RegExp(String.raw`([\w-]+\.md)\x60?,?\s*\(?(§\s?${SECTION}(?:,?\s+punto\s+\d+[a-z]?)?(?:(?:\s*,\s*|\s+e\s+|\s+ed\s+)§\s?${SECTION})*)`, "g");
const TITLE_REF = /([\w-]+\.md)`?(?:\s*\()?,?\s*((?:«[^»]+»)(?:(?:\s*,\s*|\s+e\s+|\s+ed\s+)«[^»]+»)*)/g;
const SCRIPT_REF = /(?<![\w-])scripts\/([\w-]+(?:\/[\w-]+)?\.mjs)/g;
const SKILL_REF = /\/kit:([a-z][a-z-]*[a-z])/g;

const normalize = (text) => text.toLowerCase().replace(/[`*"]/g, "");

/** Numeri di sezione definiti in un file: titoli numerati e, dentro ciascuna sezione, i punti numerati. */
function sectionsOf(text) {
  const found = new Set();
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(new RegExp(String.raw`^#{2,6}\s+(${SECTION})(?=[.\s·])`));
    if (heading) {
      current = heading[1];
      found.add(current);
      continue;
    }
    if (/^#{1,2}\s/.test(line)) current = null;
    if (!current) continue;
    const item = line.match(/^(\d+[a-z]?)\.\s/);
    if (item) found.add(`${current}.${item[1]}`);
    for (const label of line.matchAll(/\*\*(\d+[a-z]) ·/g)) found.add(`${current}.${label[1]}`);
  }
  return found;
}

/** Titoli e testi in grassetto: i punti a cui un rimando «Titolo» può riferirsi. */
const titlesOf = (text) => [...text.matchAll(/^#{1,6}\s+(.*)$|\*\*([^*\n]+)\*\*/gm)].map((m) => normalize(m[1] ?? m[2]));

function hasSection(targets, file, id) {
  if (targets.get(file).sections.has(id)) return true;
  if (file !== "core.md") return false;
  const other = CORE_ELSEWHERE[id.split(".")[0]];
  return Boolean(other && targets.get(other)?.sections.has(id));
}

/** Rimandi non risolti di una riga. */
function brokenRefs(line, targets, skills, scriptExists) {
  const broken = [];
  // Le intestazioni «Estratto da (o di) `core.md` §…» dicono da dove viene un testo, non dove sta ora.
  if (!/estratt[oi] (da|di) /i.test(line)) {
    for (const [, file, list] of line.matchAll(SECTION_REF)) {
      // Un file senza sezioni numerate (CLAUDE.md): il «§» che segue indica il file in cui si scrive.
      if (!targets.get(file)?.sections.size) continue;
      for (const [, base, point] of list.matchAll(new RegExp(String.raw`§\s?(${SECTION})(?:,?\s+punto\s+(\d+[a-z]?))?`, "g"))) {
        const id = point ? `${base}.${point}` : base;
        if (!hasSection(targets, file, id)) broken.push(`${file} §${id}`);
      }
    }
  }
  for (const [, file, list] of line.matchAll(TITLE_REF)) {
    if (!targets.has(file)) continue;
    for (const [, title] of list.matchAll(/«([^»]+)»/g)) {
      if (!targets.get(file).titles.some((candidate) => candidate.includes(normalize(title)))) broken.push(`${file} «${title}»`);
    }
  }
  for (const [, script] of line.matchAll(SCRIPT_REF)) if (!scriptExists(script)) broken.push(`scripts/${script}`);
  for (const [, skill] of line.matchAll(SKILL_REF)) if (!skills.has(skill)) broken.push(`/kit:${skill}`);
  return broken;
}

function walk(relative) {
  const full = path.join(root, relative);
  if (SKIPPED.has(relative) || !existsSync(full)) return [];
  if (!statSync(full).isDirectory()) return /\.(md|mjs|yml)$/.test(relative) && !/\.test\.mjs$/.test(relative) ? [relative] : [];
  return readdirSync(full).flatMap((name) => walk(`${relative}/${name}`));
}

const read = (relative) => readFileSync(path.join(root, relative), "utf8");
const targetPaths = [...TARGET_DIRS.flatMap(walk).filter((f) => f.endsWith(".md")), ...TARGET_FILES];
const targets = new Map(targetPaths.map((f) => [path.basename(f), { sections: sectionsOf(read(f)), titles: titlesOf(read(f)) }]));
const skills = new Set(readdirSync(path.join(root, "plugins/kit/skills")));
const scriptExists = (script) => ["plugins/kit/scripts", "scripts"].some((dir) => existsSync(path.join(root, dir, script)));
const check = (line) => brokenRefs(line, targets, skills, scriptExists);

test("nessun rimando rotto tra regole, skill, script e documentazione", () => {
  const files = SCANNED.flatMap(walk);
  assert.ok(files.length > 50, `file esaminati: ${files.length}`);
  const broken = files.flatMap((file) =>
    read(file)
      .split(/\r?\n/)
      .flatMap((line, index) => check(line).map((ref) => `${file}:${index + 1} → ${ref}`)),
  );
  assert.deepEqual(broken, []);
});

test("rileva le sezioni spostate o inesistenti", () => {
  assert.deepEqual(check("vedi `core.md` §0b"), ["core.md §0b"]);
  assert.deepEqual(check("(`core.md` §4)."), ["core.md §4"]);
  assert.deepEqual(check("`backend-app.md` §4.4 e §4.99"), ["backend-app.md §4.99"]);
  assert.deepEqual(check("`core.md` §6, punto 99"), ["core.md §6.99"]);
  assert.deepEqual(check("`qualita.md` §0b, `core.md` §6.15 e `core.md` §1"), []);
});

test("rileva titoli, script e skill inesistenti", () => {
  assert.deepEqual(check("`git-flusso.md`, «Integrazione GitHub» e «Titolo che non esiste»"), ["git-flusso.md «Titolo che non esiste»"]);
  assert.deepEqual(check("`git-flusso.md` («Titolo che non esiste»)"), ["git-flusso.md «Titolo che non esiste»"]);
  assert.deepEqual(check("node scripts/assente.mjs, poi /kit:assente"), ["scripts/assente.mjs", "/kit:assente"]);
  assert.deepEqual(check("scripts/regole.mjs e /kit:regole"), []);
});

test("salta solo le intestazioni «Estratto da» per i numeri di sezione", () => {
  assert.deepEqual(check("> Estratto da `core.md` §0b, con la stessa numerazione."), []);
  assert.deepEqual(check("> Versione breve, estratto di `core.md` §0b e §4."), []);
  assert.deepEqual(check("compila il `CLAUDE.md` (§3)"), []);
});
