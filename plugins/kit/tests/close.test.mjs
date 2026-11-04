// Test del hook check-close (batch C): promemoria a fine sessione in un repository git temporaneo.
// Eseguire con: node --test plugins/kit/tests/close.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-close.mjs");

/** Repository git temporaneo con il marcatore del kit (se `kit`). */
function repo(kit = true) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-close-"));
  execFileSync("git", ["-C", dir, "init", "-q"]);
  if (kit) {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n");
  }
  return dir;
}

function write(dir, rel, content) {
  const full = path.join(dir, rel);
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
}

/** Esegue il hook Stop; restituisce il messaggio di promemoria (vuoto se nessuno). */
function reminder(dir) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ cwd: dir, hook_event_name: "Stop" }),
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(r.status, 0, "il promemoria non blocca la chiusura: exit 0");
  return r.stdout.trim() ? JSON.parse(r.stdout).systemMessage : "";
}

test("nessuna modifica: nessun promemoria", () => {
  assert.equal(reminder(repo()), "");
});

test("codice modificato senza CHANGELOG segnalato, con CHANGELOG aggiornato no", () => {
  const dir = repo();
  write(dir, "src/Program.cs", "class P {}");
  assert.match(reminder(dir), /CHANGELOG\.md/);
  write(dir, "CHANGELOG.md", "# Changelog\n");
  assert.equal(reminder(dir), "");
});

test("modello EF senza migrazione segnalato, con migrazione no", () => {
  const dir = repo();
  write(dir, "Data/OrderEntity.cs", "class OrderEntity {}");
  write(dir, "CHANGELOG.md", "# Changelog\n");
  assert.match(reminder(dir), /migrazione/);
  write(dir, "Migrations/20261104_Orders.cs", "class M {}");
  assert.equal(reminder(dir), "");
});

test("chiavi di traduzione diverse tra it.json ed en.json segnalate", () => {
  const dir = repo();
  write(dir, "src/assets/i18n/it.json", JSON.stringify({ orders: { title: "Ordini", empty: "Vuoto" } }));
  write(dir, "src/assets/i18n/en.json", JSON.stringify({ orders: { title: "Orders" } }));
  const msg = reminder(dir);
  assert.match(msg, /it\.json e non in en\.json/);
  assert.match(msg, /orders\.empty/);
});

test("chiavi uguali tra le lingue: nessun promemoria per i18n", () => {
  const dir = repo();
  write(dir, "src/assets/i18n/it.json", JSON.stringify({ a: { b: "x" } }));
  write(dir, "src/assets/i18n/en.json", JSON.stringify({ a: { b: "y" } }));
  write(dir, "CHANGELOG.md", "# Changelog\n");
  assert.equal(reminder(dir), "");
});

test("attivazione: nessun promemoria senza .claude/rules/core.md", () => {
  const dir = repo(false);
  write(dir, "src/Program.cs", "class P {}");
  assert.equal(reminder(dir), "");
});
