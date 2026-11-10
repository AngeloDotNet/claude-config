// Test dell'hook check-quality di kit: avvisi (non bloccanti) su Docker, dipendenze e frontend.
// Eseguire con: node --test plugins/kit/tests/quality.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check-write.mjs");

function check(file_path, content) {
  const r = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ tool_input: { file_path, content } }),
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(r.status, 0, "gli avvisi non devono bloccare: exit 0");
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
}

const notes = (file, content) => check(file, content)?.hookSpecificOutput?.additionalContext ?? "";

// --- Docker ---

test("docker: FROM con tag latest o senza tag segnalato, tag fissi no", () => {
  assert.match(notes("Dockerfile", "FROM mcr.microsoft.com/dotnet/aspnet:latest\n"), /tag latest/);
  assert.match(notes("Dockerfile", "FROM mcr.microsoft.com/dotnet/aspnet\n"), /senza tag/);
  assert.equal(notes("Dockerfile", "FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final\n"), "");
});

test("docker: image in compose senza tag segnalato, con tag no", () => {
  assert.match(notes("docker-compose.yml", "services:\n  db:\n    image: postgres\n"), /"postgres" senza tag/);
  assert.equal(notes("docker-compose.yml", "services:\n  db:\n    image: postgres:16\n"), "");
});

test("docker: porta host di database esposta segnalata, porta applicativa no", () => {
  assert.match(notes("docker-compose.yml", 'ports:\n  - "5432:5432"\n'), /porta host 5432/);
  assert.equal(notes("docker-compose.yml", 'ports:\n  - "8080:8080"\n'), "");
});

// --- Dipendenze ---

test("dipendenze: range * e latest in package.json segnalati, versione fissa e ^ / ~ no", () => {
  assert.match(notes("package.json", '{ "dependencies": { "x": "*" } }'), /range di versione "\*"/);
  assert.match(notes("package.json", '{ "dependencies": { "x": "latest" } }'), /range di versione "latest"/);
  assert.equal(notes("package.json", '{ "dependencies": { "x": "1.2.3" } }').includes("range"), false);
  assert.equal(notes("package.json", '{ "dependencies": { "@angular/core": "^20.1.0", "b": "~2.0.0" } }').includes("range"), false);
});

test("dipendenze: Version con * o range in csproj segnalato, versione fissa no", () => {
  assert.match(notes("Api.csproj", '<PackageReference Include="Serilog" Version="4.*" />'), /range di versione "4.\*"/);
  assert.equal(notes("Api.csproj", '<PackageReference Include="Serilog" Version="4.2.0" />').includes("range"), false);
});

test("dipendenze: cambio di pacchetti ricorda audit (core.md §3)", () => {
  assert.match(notes("package.json", '{ "dependencies": { "x": "1.2.3" } }'), /npm audit/);
  assert.match(notes("Api.csproj", '<PackageReference Include="Serilog" Version="4.2.0" />'), /dotnet list package --vulnerable/);
});

// --- Frontend ---

test("frontend: any, innerHTML, bypassSecurityTrust segnalati in .ts", () => {
  assert.match(notes("user.service.ts", "const data: any = load();"), /uso di `any`/);
  assert.match(notes("user.component.ts", "el.innerHTML = html;"), /innerHTML/);
  assert.match(notes("user.component.ts", "this.safe = bypassSecurityTrustHtml(x);"), /bypassSecurityTrust/);
});

test("frontend: 'anything' non è any", () => {
  assert.equal(notes("user.service.ts", "const anything = 1;"), "");
});

test("frontend: colore esadecimale hardcoded segnalato in .ts/.html", () => {
  assert.match(notes("card.component.ts", "const c = '#ff0000';"), /colore esadecimale/);
  assert.match(notes("card.component.html", '<div style="color: #ff0000"></div>'), /colore esadecimale/);
});

test("frontend: hex non in contesto di colore non segnalato (href, identificatori TS)", () => {
  assert.equal(notes("nav.component.html", '<a href="#abc">Sezione</a>'), "");
  assert.equal(notes("list.component.ts", "class X { #fee = 1; }"), "");
});

test("frontend: token --nome in scss non segnalati, colore fuori token sì", () => {
  assert.equal(notes("theme.scss", ":root { --brand: #ff0000; }"), "");
  assert.match(notes("card.scss", ".card { color: #ff0000; }"), /fuori dai token/);
});

test("frontend: decoratori legacy, host decorator, template inline, mutate, waitForTimeout segnalati in .ts", () => {
  assert.match(notes("a.component.ts", "class A { @Input() name = ''; }"), /@Input\/@Output/);
  assert.match(notes("a.component.ts", "@ViewChild('x') el;"), /@Input\/@Output\/@ViewChild/);
  assert.match(notes("a.component.ts", "class A { @HostListener('click') on() {} }"), /@HostBinding\/@HostListener/);
  assert.match(notes("a.component.ts", "@Component({\n  template: `<p>x</p>`,\n})"), /template o stili inline/);
  assert.match(notes("a.component.ts", "@Component({\n  styles: ['p{}'],\n})"), /template o stili inline/);
  assert.match(notes("a.component.ts", "const s = signal([]);\ns.mutate(v => v.push(1));"), /mutate\(\)/);
  assert.match(notes("flow.e2e.ts", "await page.waitForTimeout(500);"), /waitForTimeout/);
});

test("frontend: input()/output(), templateUrl, mutate fuori dai signal e attese osservabili non segnalati", () => {
  assert.equal(notes("a.component.ts", "name = input<string>();\nsaved = output<void>();"), "");
  assert.equal(notes("a.component.ts", "@Component({ templateUrl: './a.component.html', styleUrl: './a.component.css' })"), "");
  assert.equal(notes("a.service.ts", "store.mutate(x);"), "");
  assert.equal(notes("flow.e2e.ts", "await expect(page.getByRole('button')).toBeVisible();"), "");
});

test("frontend: ngClass/ngStyle e transition: all segnalati, binding nativi e proprietà singole no", () => {
  assert.match(notes("a.component.html", '<div [ngClass]="cls"></div>'), /ngClass\/ngStyle/);
  assert.match(notes("a.component.ts", "imports: [NgStyle], host: { '[ngStyle]': 's' }"), /ngClass\/ngStyle/);
  assert.match(notes("a.component.css", ".b { transition: all 200ms ease; }"), /transition: all/);
  assert.equal(notes("a.component.html", '<div [class.active]="on" [style.width.px]="w"></div>'), "");
  assert.equal(notes("a.component.css", ".b { transition: background-color 200ms ease; }"), "");
});

// --- Ambito ---

test("nessun output per file fuori ambito o senza problemi", () => {
  assert.equal(check("notes/readme.md", "usa any e #ff0000"), null);
  assert.equal(check("src/app.ts", "const x = 1;"), null);
});
