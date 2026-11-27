// Controlla i rimandi tra moduli di regole per profilo: un modulo che si carica in un profilo non rimanda
// a un modulo che in quel profilo non c'è, a meno che la riga non lo dichiari (profilo, «solo», «su richiesta»).
// Il controllo copre i moduli sempre caricati (`CLAUDE.md`, «Regole»): in `mini` core, lavoro, git e security;
// in `standard` anche i cinque moduli in versione breve (`_template/rules-standard/`) e gli altri moduli
// del profilo; in `strutturato` tutti. I moduli che si caricano solo su certi file (`paths:`) e quelli opzionali
// sono condizionali per costruzione e non si controllano come destinazione.
// Eseguire con: node --test plugins/kit/tests/profili.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const RULES = ".claude/rules";
const SHORT = "_template/rules-standard";

const MINI = ["core", "lavoro", "git", "security"];
const STANDARD = [...MINI, "workflow", "qualita", "git-flusso", "git-avanzato", "documentazione", "operativita", "security-avanzata"];
const STRUTTURATO = [...STANDARD, "security-strutturato"];
const PROFILI = { mini: MINI, standard: STANDARD, strutturato: STRUTTURATO };

/** Moduli che stanno in un profilo ma possono essere rimandati da altri profili: destinazioni controllate. */
const TARGETS = new Set(STRUTTURATO);

/** Riga che dichiara il profilo, la condizione o la lettura facoltativa del modulo citato. */
const QUALIFIER = /profil|\bsolo\b|\bstandard\b|strutturat|\bmini\b|rules-optional|dettaglio|su richiesta|ADR 0001|facoltativ|opzional/i;

/**
 * Rimandi che restano senza qualificatore sulla riga: ciascuno ha un motivo.
 * Formato: "modulo.md:riga-di-testo-chiave" → motivo. Vuoto se tutto è già dichiarato nel testo.
 */
const ALLOWED = {};

const text = (file) => readFileSync(path.join(root, file), "utf8");

/** File che un profilo carica per il modulo `name`: versione breve in standard se esiste, altrimenti quella completa. */
function fileFor(profile, name) {
  if (profile === "standard" && existsSync(path.join(root, SHORT, `${name}.md`))) return path.join(SHORT, `${name}.md`);
  return path.join(RULES, `${name}.md`);
}

/** Rimandi a moduli non caricati nel profilo, sulle righe che non li dichiarano. */
function undeclared(profile) {
  const loaded = new Set(PROFILI[profile]);
  const problems = [];
  for (const name of PROFILI[profile]) {
    const file = fileFor(profile, name);
    if (!existsSync(path.join(root, file))) continue;
    text(file).split(/\r?\n/).forEach((line, index) => {
      for (const [, target] of line.matchAll(/([\w-]+)\.md/g)) {
        if (target === name || loaded.has(target) || !TARGETS.has(target)) continue;
        if (QUALIFIER.test(line)) continue;
        const key = `${file.replaceAll("\\", "/")}:${target}`;
        if (ALLOWED[key]) continue;
        problems.push(`${file.replaceAll("\\", "/")}:${index + 1} → ${target}.md`);
      }
    });
  }
  return problems;
}

for (const profile of Object.keys(PROFILI)) {
  test(`profilo ${profile}: i rimandi a moduli non caricati sono dichiarati`, () => {
    assert.deepEqual(undeclared(profile), []);
  });
}
