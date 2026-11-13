// Le skill pr-develop e pr-main ripetono due passi parola per parola: il prerequisito della GitHub CLI
// (passo 0) e la riga «GitHub CLI (gh) installata» nel CLAUDE.md (passo 3). Si lasciano duplicati perché
// ogni skill resti leggibile da sola: questo test fallisce se le due copie smettono di coincidere.
// Eseguire con: node --test plugins/kit/tests/skills-sync.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skills = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");

/** Restituisce il testo del passo numerato `n` (dal numero fino al passo successivo), con a capo normalizzati. */
function step(skill, n) {
  const text = readFileSync(path.join(skills, skill, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  const match = text.match(new RegExp(`^${n}\. .*?(?=^\d+\. |\n*$(?![\s\S]))`, "ms"));
  assert.ok(match, `passo ${n} non trovato in ${skill}`);
  return match[0].trim();
}

for (const n of [0, 3]) {
  test(`pr-develop e pr-main: il passo ${n} è identico`, () => {
    assert.equal(step("pr-main", n), step("pr-develop", n));
  });
}
