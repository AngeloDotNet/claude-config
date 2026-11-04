// Test del hook guard-patterns (batch A): blocchi con deroga kit-allow, attivo solo nei progetti del template.
// Eseguire con: node --test plugins/kit-config/tests/patterns.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "guard-patterns.mjs");

/** Cartella di progetto temporanea; `kit` = true aggiunge il marcatore .claude/rules/core.md. */
function project(kit = true) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-patterns-"));
  if (kit) {
    mkdirSync(path.join(dir, ".claude", "rules"), { recursive: true });
    writeFileSync(path.join(dir, ".claude", "rules", "core.md"), "# core\n");
  }
  return dir;
}

function write(file_path, content, cwd = project()) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ cwd, tool_input: { file_path, content } }),
    encoding: "utf8",
    timeout: 15000,
  });
  return { code: r.status, err: r.stderr ?? "" };
}

// --- skip dei test ---

test("skip: test saltati o isolati bloccati nei file di test", () => {
  assert.equal(write("tests/OrderTests.cs", '[Fact(Skip = "lento")]\npublic void T() {}').code, 2);
  assert.equal(write("src/order.spec.ts", "it.skip('funziona', () => {});").code, 2);
  assert.equal(write("src/order.spec.ts", "describe.only('ordini', () => {});").code, 2);
});

test("skip: test attivi passano; .only fuori dai test non è controllato", () => {
  assert.equal(write("tests/OrderTests.cs", "[Fact]\npublic void T() {}").code, 0);
  assert.equal(write("src/app.ts", "list.only(1);").code, 0);
});

// --- deroga kit-allow ---

test("deroga: con id giusto e motivo, stessa riga o riga sopra, passa", () => {
  assert.equal(write("tests/OrderTests.cs", '[Fact(Skip = "lento")] // kit-allow: skip — rimandato alla CI notturna').code, 0);
  assert.equal(write("tests/OrderTests.cs", "// kit-allow: skip — rimandato alla CI notturna\n[Fact(Skip = \"lento\")]").code, 0);
});

test("deroga: id di un'altra regola, motivo vuoto o troppo corto non bastano", () => {
  assert.equal(write("tests/OrderTests.cs", '// kit-allow: inmemory — motivo lungo\n[Fact(Skip = "x")]').code, 2);
  assert.equal(write("tests/OrderTests.cs", '[Fact(Skip = "x")] // kit-allow: skip —').code, 2);
  assert.equal(write("tests/OrderTests.cs", '[Fact(Skip = "x")] // kit-allow: skip — ok').code, 2);
});

// --- Angular legacy ---

test("angular: NgModule e *ngIf bloccati, codice moderno passa", () => {
  assert.equal(write("src/app/app.module.ts", "@NgModule({ declarations: [] })\nexport class AppModule {}").code, 2);
  assert.equal(write("src/app/list.component.html", '<li *ngFor="let i of items">{{ i }}</li>').code, 2);
  assert.equal(write("src/app/list.component.html", "@for (i of items; track i) { <li>{{ i }}</li> }").code, 0);
});

// --- librerie vietate ---

test("librerie: Jest e MediatR bloccati in package.json e csproj, librerie consentite passano", () => {
  assert.equal(write("package.json", '{ "devDependencies": { "jest": "30.0.0" } }').code, 2);
  assert.equal(write("Api.csproj", '<PackageReference Include="MediatR" Version="12.0.0" />').code, 2);
  assert.equal(write("package.json", '{ "dependencies": { "@angular/core": "20.1.0" } }').code, 0);
});

// --- EF InMemory, API vietate, SQL interpolato ---

test("inmemory: UseInMemoryDatabase bloccato", () => {
  assert.equal(write("Tests/Setup.cs", 'options.UseInMemoryDatabase("db");').code, 2);
});

test("api vietata: AllowAnyOrigin, BinaryFormatter e MD5 bloccati", () => {
  assert.equal(write("Program.cs", "p.AllowAnyOrigin().AllowCredentials();").code, 2);
  assert.equal(write("Serializer.cs", "new BinaryFormatter().Serialize(s, o);").code, 2);
  assert.equal(write("Hash.cs", "var h = MD5.Create();").code, 2);
});

test("sql: FromSqlRaw con stringa interpolata bloccato, con parametri passa", () => {
  assert.equal(write("Repo.cs", 'db.Orders.FromSqlRaw($"SELECT * FROM Orders WHERE Id = {id}")').code, 2);
  assert.equal(write("Repo.cs", 'db.Orders.FromSqlRaw("SELECT * FROM Orders WHERE Id = {0}", id)').code, 0);
});

// --- Dockerfile e TLS ---

test("npm: install e ci senza --ignore-scripts bloccati nel Dockerfile, npm ci --ignore-scripts passa", () => {
  assert.equal(write("Dockerfile", "RUN npm install").code, 2);
  assert.equal(write("Dockerfile", "RUN npm ci").code, 2);
  assert.equal(write("Dockerfile", "RUN npm ci --ignore-scripts").code, 0);
});

test("tls: TrustServerCertificate=True bloccato in appsettings, Encrypt=True passa", () => {
  assert.equal(write("api/appsettings.json", '{"Db": "Server=db;TrustServerCertificate=True"}').code, 2);
  assert.equal(write("api/appsettings.json", '{"Db": "Server=db;Encrypt=True;TrustServerCertificate=False"}').code, 0);
});

// --- attivazione ---

test("attivazione: nessun blocco in un progetto senza .claude/rules/core.md", () => {
  assert.equal(write("tests/OrderTests.cs", '[Fact(Skip = "x")]', project(false)).code, 0);
});
