#!/usr/bin/env node
// Hook PreToolUse su Write, Edit e MultiEdit (batch A): blocca (exit 2, motivo su stderr) i pattern
// che le regole vietano senza eccezioni. Una deroga legittima si dichiara nel codice, sulla stessa
// riga o su quella sopra: `kit-allow: <id> — <motivo>` (core.md §6, punto 23).
// Regole: skip dei test, Angular legacy, librerie vietate, EF InMemory, API vietate, SQL interpolato,
// npm install nel Dockerfile, TLS disattivato in appsettings. Vedi la tabella RULES.
// Attivo solo nei progetti con .claude/rules/core.md (lib/text.mjs). Fail-open: errori -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit-config`. Richiede Node.js.

import path from "node:path";
import { isWaived, projectUsesKit, writtenText } from "./lib/text.mjs";

const TEST_FILE = /(\.(spec|test)\.(ts|tsx|js)|Tests?\.cs|IntegrationTests[\\/][^\n]*\.cs)$/i;

const RULES = [
  {
    id: "skip",
    files: TEST_FILE,
    re: /\[(?:Fact|Theory)\s*\(\s*Skip\b|\[Ignore\b|\b(?:it|test|describe)\.skip\s*\(|\b(?:xit|xdescribe|fit|fdescribe)\s*\(|\.only\s*\(/,
    why: "test saltato o isolato (core.md §4: mai skip, Ignore o soglie abbassate)",
  },
  {
    id: "angular-legacy",
    files: /\.(ts|html)$/i,
    re: /@NgModule\b|\*ngIf\b|\*ngFor\b|\*ngSwitch\b|APP_INITIALIZER|HTTP_INTERCEPTORS/,
    why: "codice Angular legacy (core.md §6.1: niente NgModule, *ngIf/*ngFor, APP_INITIALIZER, interceptor a classe)",
  },
  {
    id: "libreria-vietata",
    files: /(package\.json|\.csproj|\.props)$/i,
    re: /"(jest|karma|jasmine|jasmine-core|@types\/jest|@types\/jasmine|karma-[\w-]+|jest-[\w-]+)"\s*:|<PackageReference[^>]*\bInclude="(MediatR|AutoMapper)[^"]*"/i,
    why: "libreria vietata (core.md §2 e §6.2: niente MediatR, AutoMapper, Jest, Karma, Jasmine)",
  },
  {
    id: "inmemory",
    files: /\.cs$/i,
    re: /UseInMemoryDatabase\s*\(/,
    why: "EF Core InMemory (backend-architecture.md §2c: mai; si usa il database di prova)",
  },
  {
    id: "api-vietata",
    files: /\.(cs|ts|js)$/i,
    re: /AllowAnyOrigin\s*\(|BinaryFormatter|\bMD5\.Create\s*\(|\bSHA1\.Create\s*\(|\bMD5CryptoServiceProvider\b|\bSHA1Managed\b|\beval\s*\(/,
    why: "API vietata (security.md: CORS con AllowAnyOrigin, deserializzazione con BinaryFormatter, hash MD5/SHA1, eval)",
  },
  {
    id: "sql-interpolato",
    files: /\.cs$/i,
    re: /\b(?:FromSql|ExecuteSql)Raw\s*\(\s*\$"/,
    why: "SQL costruito con interpolazione (security.md: query parametrizzate, mai input concatenato)",
  },
  {
    id: "npm-install",
    files: /(^|[\\/])Dockerfile[^\\/]*$/i,
    re: /\bnpm\s+(?:install|i)\b|\bnpm\s+ci\b(?![^\n]*--ignore-scripts)/,
    why: "installazione npm non conforme (security.md, Supply chain: npm ci --ignore-scripts)",
  },
  {
    id: "tls-disattivato",
    files: /(^|[\\/])appsettings[^\\/]*\.json$/i,
    re: /TrustServerCertificate\s*=\s*true|SslMode\s*=\s*(?:Disable|Prefer|Allow)\b|Encrypt\s*=\s*(?:false|no)\b/i,
    why: "connessione al database senza cifratura o senza verifica del certificato (security.md, Dati e Segreti)",
  },
];

/** Violazioni per il file e il testo scritti (lista vuota = nulla da bloccare). */
function violations(file, text) {
  const lines = text.split("\n");
  const out = [];
  for (const rule of RULES) {
    if (!rule.files.test(file)) continue;
    const index = lines.findIndex((line, i) => rule.re.test(line) && !isWaived(lines, i, rule.id));
    if (index >= 0) out.push({ id: rule.id, why: rule.why, line: index + 1 });
  }
  return out;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let found = [];
  let file = "";
  try {
    const input = JSON.parse(raw);
    file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    if (file && projectUsesKit(cwd)) found = violations(file, writtenText(input.tool_input));
  } catch {
    process.exit(0);
  }
  if (found.length) {
    const msg = found
      .map((v) => `regola "${v.id}" (riga ${v.line}): ${v.why}. Se è un'eccezione legittima, scrivi sulla stessa riga o su quella sopra: kit-allow: ${v.id} — <motivo>`)
      .join("; ");
    process.stderr.write(`Bloccato dall'hook guard-patterns in ${path.basename(file)}: ${msg}.\n`);
    process.exit(2);
  }
  process.exit(0);
});
