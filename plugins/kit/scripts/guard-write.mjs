#!/usr/bin/env node
// Hook PreToolUse su Write, Edit e MultiEdit: unisce due controlli bloccanti (exit 2, motivo su stderr).
// I messaggi restano quelli dei singoli controlli, con il loro nome logico: guard-secrets e guard-patterns.
// - guard-secrets (security.md «Dati e Segreti», core.md §0b): blocca la scrittura di segreti reali.
//   appsettings*.json: valori reali in chiavi come Password, Secret, Token, ApiKey, Key (es. Jwt:Key) o
//   password in una stringa di connessione; docker-compose*.yml e Dockerfile: password o chiavi in chiaro;
//   qualunque file: chiavi private PEM, chiavi AWS (AKIA…), token JWT completi (esclusi i .md).
//   Un segnaposto è valido solo se il valore intero ha una forma nota (vedi PLACEHOLDER_FULL).
// - guard-patterns (core.md §6, punto 23): blocca i pattern che le regole vietano senza eccezioni.
//   Una deroga legittima si dichiara nel codice, sulla stessa riga o su quella sopra:
//   `kit-allow: <id> — <motivo>`. Attivo solo nei progetti con .claude/rules/core.md (lib/text.mjs).
// Ogni controllo è isolato: un errore interno in uno non disattiva l'altro. Fail-open: input
// illeggibile -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import path from "node:path";
import { isWaived, projectUsesKit, writtenText } from "./lib/text.mjs";

// --- guard-secrets ---

const SECRET_KEY_NAME = /password|passwd|pwd|secret|token|apikey|api_key|(^|[:_.])key$/i;
// Il valore deve corrispondere per intero: un segreto reale che contiene "example" non passa.
const PLACEHOLDER_FULL =
  /^(change[-_]?me[\w-]*|placeholder[\w-]*|replace[\w-]*|your[-_ ][\w -]*|example|\$\{[^}]*\}|\$\{?\w+\}?|%\w+%|<[^>]*>|\*+|x+)$/i;
const DOCKER_SECRET_ASSIGN = /([A-Za-z_][\w.]*(?:PASSWORD|PASSWD|PWD|SECRET|TOKEN|APIKEY|API_KEY|_KEY))\s*[:=]\s*["']?([^\s"',}#]+)/gi;

/** Valore vuoto o segnaposto (corrispondenza intera): non è un segreto reale. */
function isPlaceholder(value) {
  const v = value.trim();
  return v === "" || PLACEHOLDER_FULL.test(v);
}

/** Motivi per cui il testo scritto nel file contiene segreti reali (lista vuota = nessun problema). */
function secretFindings(file, text) {
  const reasons = [];
  const base = path.basename(file);

  if (/^appsettings(\.[\w.-]+)?\.json$/i.test(base)) {
    for (const m of text.matchAll(/"([^"]*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)) {
      const [, name, value] = m;
      if (SECRET_KEY_NAME.test(name) && !isPlaceholder(value)) reasons.push(`valore reale nella chiave "${name}"`);
    }
    for (const m of text.matchAll(/(?:password|pwd)\s*=\s*([^;"]*)/gi)) {
      if (!isPlaceholder(m[1])) reasons.push("password reale in una stringa di connessione");
    }
  }

  if (/^(docker-compose|compose)([.\w-]*)\.ya?ml$/i.test(base) || /^Dockerfile/i.test(base)) {
    for (const m of text.matchAll(DOCKER_SECRET_ASSIGN)) {
      if (!isPlaceholder(m[2])) reasons.push(`valore in chiaro per "${m[1]}"`);
    }
  }

  if (/-----BEGIN ([A-Z0-9]+ )?PRIVATE KEY-----/.test(text)) reasons.push("chiave privata PEM");
  if (/\bAKIA[0-9A-Z]{16}\b/.test(text)) reasons.push("chiave di accesso AWS");
  if (!/\.md$/i.test(base) && /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(text)) {
    reasons.push("token JWT completo");
  }

  return reasons;
}

// --- guard-patterns ---

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
    why: "API vietata (security-backend.md: CORS con AllowAnyOrigin, deserializzazione con BinaryFormatter, hash MD5/SHA1, eval)",
  },
  {
    id: "sql-interpolato",
    files: /\.cs$/i,
    re: /\b(?:FromSql|ExecuteSql)Raw\s*\(\s*\$"/,
    why: "SQL costruito con interpolazione (security-backend.md: query parametrizzate, mai input concatenato)",
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
  {
    id: "attesa-test",
    files: TEST_FILE,
    re: /\bTask\.Delay\s*\(|\bThread\.Sleep\s*\(/,
    why: "attesa arbitraria nel test (core.md §4: i test instabili si correggono alla causa, mai con attese o sleep arbitrari)",
  },
  {
    id: "nowarn",
    files: /\.(csproj|props)$/i,
    re: /<NoWarn>[^<]*<\/NoWarn>/i,
    why: "soppressione di warning a livello di progetto (core.md §4: build senza warning; NoWarn di progetto non ammesso)",
  },
  {
    id: "catch-vuoto",
    files: /\.cs$/i,
    re: /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/,
    why: "catch vuoto che ingoia l'errore (backend-app.md §4: nessun try/catch che ingoia un'eccezione senza motivo e senza log)",
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

// --- ingresso ---

/** Messaggi di blocco, uno per controllo che ha trovato qualcosa (lista vuota = nessun blocco). */
function blockingMessages(input, file) {
  const messages = [];
  const text = writtenText(input.tool_input);
  const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();

  try {
    const reasons = secretFindings(file, text);
    if (reasons.length) {
      messages.push(
        `Bloccato dall'hook guard-secrets in ${path.basename(file)}: ${reasons.join("; ")}. ` +
          "Usa un segnaposto (CHANGE-ME-…, ${VAR}); il valore reale va in variabili d'ambiente o secrets ed è elencato in " +
          ".env.example (security.md, «Dati e Segreti»)."
      );
    }
  } catch {
    // controllo isolato: un errore qui non disattiva guard-patterns
  }

  try {
    if (projectUsesKit(cwd)) {
      const found = violations(file, text);
      if (found.length) {
        const msg = found
          .map((v) => `regola "${v.id}" (riga ${v.line}): ${v.why}. Se è un'eccezione legittima, scrivi sulla stessa riga o su quella sopra: kit-allow: ${v.id} — <motivo>`)
          .join("; ");
        messages.push(`Bloccato dall'hook guard-patterns in ${path.basename(file)}: ${msg}.`);
      }
    }
  } catch {
    // controllo isolato
  }

  return messages;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let messages = [];
  try {
    const input = JSON.parse(raw);
    const file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    if (file) messages = blockingMessages(input, file);
  } catch {
    process.exit(0);
  }
  if (messages.length) {
    process.stderr.write(messages.join("\n") + "\n");
    process.exit(2);
  }
  process.exit(0);
});
