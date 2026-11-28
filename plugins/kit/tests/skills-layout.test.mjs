// Layout delle skill del plugin: ogni cartella in skills/ ha un SKILL.md con frontmatter, e le revisioni
// per tema di `revisione` corrispondono alla tabella della sua SKILL.md. Fallisce se una skill viene
// rinominata o un tema resta senza procedura.
// Eseguire con: node --test plugins/kit/tests/skills-layout.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const skills = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "skills");
const dirs = readdirSync(skills).filter((n) => statSync(path.join(skills, n)).isDirectory());

test("ogni cartella di skills/ ha un SKILL.md con frontmatter description", () => {
  assert.equal(dirs.length, 11, `attese 11 skill, trovate ${dirs.length}: ${dirs.join(", ")}`);
  for (const d of dirs) {
    const file = path.join(skills, d, "SKILL.md");
    assert.ok(existsSync(file), `manca SKILL.md in ${d}`);
    const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    assert.match(text, /^---\n[\s\S]*?^description: .+/m, `frontmatter senza description in ${d}`);
  }
});

test("revisione: ogni tema elencato ha la sua procedura in temi/ e viceversa", () => {
  const rev = path.join(skills, "revisione");
  const body = readFileSync(path.join(rev, "SKILL.md"), "utf8");
  const listed = [...body.matchAll(/^- `([a-z-]+)`:/gm)].map((m) => m[1]);
  const files = readdirSync(path.join(rev, "temi")).map((f) => f.replace(/\.md$/, "")).sort();
  assert.deepEqual([...listed].sort(), files);
});

test("verifica: la procedura del frontend Angular è in frontend.md", () => {
  assert.ok(existsSync(path.join(skills, "verifica", "frontend.md")));
});
