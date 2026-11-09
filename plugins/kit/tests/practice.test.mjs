// Test del hook check-practice (batch B): avvisi non bloccanti su pratiche. Eseguire con:
// node --test plugins/kit/tests/practice.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-write.mjs");

/** Progetto temporaneo; `kit` aggiunge il marcatore .claude/rules/core.md. */
function project(kit = true) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-practice-"));
  if (kit) {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n");
  }
  return dir;
}

/** Esegue il hook su una scrittura; restituisce il testo dell'avviso (vuoto se nessuno). */
function warn(file_path, content, { cwd = project(), tool_name = "Write" } = {}) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ cwd, tool_name, tool_input: { file_path, content } }),
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(r.status, 0, "gli avvisi non bloccano: exit 0");
  return r.stdout.trim() ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext : "";
}

test("scrittura-blocco: ExecuteUpdate segnalato, deroga valida passa", () => {
  assert.match(warn("Repo.cs", "await db.Orders.ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, 1));"), /scrittura-blocco/);
  assert.equal(
    warn("Repo.cs", "// kit-allow: scrittura-blocco — volumi grandi, misurato in staging\nawait db.Orders.ExecuteDeleteAsync();"),
    ""
  );
});

test("soppressione: pragma senza motivo segnalato, con kit-allow no", () => {
  assert.match(warn("Calc.cs", "#pragma warning disable CA1822"), /soppressione/);
  assert.equal(
    warn("Calc.cs", "// kit-allow: soppressione — falso positivo dell'analyzer, verificato\n#pragma warning disable CA1822"),
    ""
  );
});

test("anonimo: AllowAnonymous segnalato, deroga con motivo passa", () => {
  assert.match(warn("Endpoints.cs", "[AllowAnonymous]\npublic IResult Health() => Results.Ok();"), /anonimo/);
  assert.equal(
    warn("Endpoints.cs", "// kit-allow: anonimo — endpoint pubblico di stato, documentato\n[AllowAnonymous]"),
    ""
  );
});

test("regex: Regex senza matchTimeout segnalato, con matchTimeout no", () => {
  assert.match(warn("Parser.cs", 'var r = new Regex("a+");'), /regex/);
  assert.equal(warn("Parser.cs", "var r = new Regex(pattern, RegexOptions.None, matchTimeout);"), "");
});

test("log: console.log e Console.WriteLine segnalati; nei test no", () => {
  assert.match(warn("app.ts", "console.log(token);"), /log/);
  assert.match(warn("Program.cs", 'Console.WriteLine("avvio");'), /ILogger/);
  assert.equal(warn("app.spec.ts", "console.log('debug');"), "");
});

test("doc: membri pubblici senza /// segnalati, con /// e con attributo in mezzo no", () => {
  assert.match(warn("Order.cs", "public class Order\n{\n}"), /senza \/\/\//);
  assert.equal(warn("Order.cs", "/// <summary>Ordine.</summary>\npublic class Order\n{\n}"), "");
  assert.equal(warn("Api.cs", "/// <summary>Lista.</summary>\n[HttpGet]\npublic Task<int> Count()\n{\n}"), "");
});

test("test: file nuovo Service senza test segnalato, con test presente no", () => {
  const dir = project();
  assert.match(warn(path.join(dir, "Orders", "OrderService.cs"), "/// <summary>x</summary>\npublic class OrderService\n{\n}", { cwd: dir }), /OrderServiceTests\.cs/);
  mkdirSync(path.join(dir, "tests"), { recursive: true });
  writeFileSync(path.join(dir, "tests", "OrderServiceTests.cs"), "");
  assert.equal(warn(path.join(dir, "Orders", "OrderService.cs"), "/// <summary>x</summary>\npublic class OrderService\n{\n}", { cwd: dir }), "");
});

test("test: componente Angular nuovo senza spec segnalato; Edit non controlla i test", () => {
  const dir = project();
  const file = path.join(dir, "src", "order.service.ts");
  assert.match(warn(file, "export class OrderService {}", { cwd: dir }), /order\.service\.spec\.ts/);
  assert.equal(warn(file, "export class OrderService {}", { cwd: dir, tool_name: "Edit" }), "");
});

test("attivazione: nessun avviso in un progetto senza .claude/rules/core.md", () => {
  assert.equal(warn("Repo.cs", "await db.Orders.ExecuteUpdateAsync(x);", { cwd: project(false) }), "");
});
