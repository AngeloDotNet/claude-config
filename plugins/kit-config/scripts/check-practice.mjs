#!/usr/bin/env node
// Hook PostToolUse su Write, Edit e MultiEdit (batch B): avvisi non bloccanti su pratiche che
// richiedono giudizio. L'avviso va a Claude (additionalContext) e all'utente (systemMessage).
// - scrittura-blocco: ExecuteUpdate/ExecuteDelete (backend-architecture.md §2c: solo su conferma).
// - soppressione: pragma, SuppressMessage, eslint-disable, @ts-ignore (security.md, Crittografia).
// - anonimo: AllowAnonymous (security.md: eccezione motivata).
// - regex: new Regex senza matchTimeout o NonBacktracking (security.md, Abuso di risorse).
// - log: console.log e Console.Write (security.md; core.md §5: ILogger).
// - doc: membri pubblici C# senza /// (core.md §5b).
// - test: file nuovo Service/Handler/Validator o .service/.component/.pipe senza test (core.md §4).
// Le deroghe usano lo stesso formato del batch A: kit-allow: <id> — <motivo> (core.md §6, punto 23).
// Attivo solo nei progetti con .claude/rules/core.md. Fail-open: errori -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit-config`. Richiede Node.js.

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { isWaived, projectUsesKit, writtenText } from "./lib/text.mjs";

const TEST_FILE = /(\.(spec|test)\.(ts|tsx|js)|Tests?\.cs)$/i;
const SKIP_DIRS = new Set(["node_modules", "bin", "obj", ".git", "dist"]);
const TYPE_DECL = /^\s*public\s+(?:(?:static|sealed|abstract|partial|readonly)\s+)*(?:class|record|interface|struct|enum)\s+\w+/;
const METHOD_DECL = /^\s*public\s+(?!override\b)(?:(?:static|async|virtual|sealed|new)\s+)*[\w<>[\],?.]+\s+\w+\s*(?:<[^>]*>)?\s*\(/;

const PRACTICE_RULES = [
  {
    id: "scrittura-blocco",
    files: /\.cs$/i,
    re: /\.(?:ExecuteUpdate|ExecuteDelete)(?:Async)?\s*\(/,
    why: "scrittura in blocco (backend-architecture.md §2c: si propone con motivazione e si attende conferma; bypassa audit e concorrenza)",
  },
  {
    id: "soppressione",
    files: /\.(cs|ts|js)$/i,
    re: /#pragma\s+warning\s+disable|\[SuppressMessage\(|eslint-disable|@ts-ignore|@ts-expect-error/,
    why: "soppressione di un controllo (security.md, Crittografia: serve un motivo e l'approvazione dell'utente)",
  },
  {
    id: "anonimo",
    files: /\.cs$/i,
    re: /\[AllowAnonymous\]|\.AllowAnonymous\(\)/,
    why: "endpoint anonimo (security.md: AllowAnonymous solo come eccezione esplicita e motivata)",
  },
  {
    id: "regex",
    files: /\.cs$/i,
    re: /\bnew\s+Regex\s*\((?![^;]*matchTimeout)(?![^;]*NonBacktracking)/,
    why: "Regex senza matchTimeout (security.md, Abuso di risorse)",
  },
  {
    id: "log",
    files: /\.ts$/i,
    exceptTests: true,
    re: /\bconsole\.log\s*\(/,
    why: "console.log nel codice (security.md, Frontend: nessun dato sensibile in console)",
  },
  {
    id: "log",
    files: /\.cs$/i,
    exceptTests: true,
    re: /\bConsole\.Write(?:Line)?\s*\(/,
    why: "Console nel backend (core.md §5: logging tramite ILogger)",
  },
];

/** Violazioni delle regole di pratica per il testo scritto (lista di messaggi). */
function practiceFindings(file, text) {
  const lines = text.split("\n");
  const out = [];
  for (const rule of PRACTICE_RULES) {
    if (!rule.files.test(file)) continue;
    if (rule.exceptTests && TEST_FILE.test(file)) continue;
    const index = lines.findIndex((line, i) => rule.re.test(line) && !isWaived(lines, i, rule.id));
    if (index >= 0) out.push(`regola "${rule.id}" (riga ${index + 1}): ${rule.why}`);
  }
  return out;
}

/** True se la riga precedente non vuota (saltando gli attributi) è un commento /// . */
function documented(lines, i) {
  for (let j = i - 1; j >= 0; j--) {
    const t = lines[j].trim();
    if (t === "") return false;
    if (t.startsWith("[")) continue;
    return t.startsWith("///");
  }
  return false;
}

/** Numero di tipi e metodi pubblici C# senza commento /// (override e proprietà esclusi). */
function missingDocs(file, text) {
  if (!/\.cs$/i.test(file) || TEST_FILE.test(file)) return 0;
  const lines = text.split("\n");
  let n = 0;
  lines.forEach((line, i) => {
    if ((TYPE_DECL.test(line) || METHOD_DECL.test(line)) && !documented(lines, i)) n++;
  });
  return n;
}

/** Ricerca di un file per nome sotto `dir`, con limite di scansione. */
function findFile(dir, name, budget = { n: 5000 }) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const e of entries) {
    if (budget.n-- <= 0) return false;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name) && findFile(path.join(dir, e.name), name, budget)) return true;
    } else if (e.name === name) {
      return true;
    }
  }
  return false;
}

/** Nuovo file di servizio senza test (core.md §4). Solo per le scritture di file nuovi (tool Write). */
function missingTest(file, cwd) {
  const base = path.basename(file);
  const cs = /^(\w*(?:Service|Handler|Validator))\.cs$/.exec(base);
  if (cs) {
    const found = findFile(cwd, `${cs[1]}Tests.cs`) || findFile(cwd, `${cs[1]}Test.cs`);
    return found ? null : `nessun test ${cs[1]}Tests.cs per il file nuovo (core.md §4)`;
  }
  const ts = /^([\w-]+)\.(service|component|pipe)\.ts$/.exec(base);
  if (ts) {
    return existsSync(path.join(path.dirname(file), `${ts[1]}.${ts[2]}.spec.ts`))
      ? null
      : `nessun ${ts[1]}.${ts[2]}.spec.ts accanto al file nuovo (core.md §4)`;
  }
  return null;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    if (!file || !projectUsesKit(cwd)) process.exit(0);
    const text = writtenText(input.tool_input);
    const notes = practiceFindings(file, text);
    const docs = missingDocs(file, text);
    if (docs) notes.push(`${docs} membri pubblici senza /// (core.md §5b)`);
    if (input.tool_name === "Write") {
      const t = missingTest(file, cwd);
      if (t) notes.push(t);
    }
    if (!notes.length) process.exit(0);
    const name = path.basename(file);
    const list = notes.join("; ");
    process.stdout.write(
      JSON.stringify({
        systemMessage: `Avviso di pratica su ${name}: ${list}`,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[Avviso di pratica, non bloccante] ${name}: ${list}. Correggi nel passo successivo o dichiara la deroga con kit-allow.`,
        },
      }) + "\n"
    );
  } catch {
    process.exit(0);
  }
  process.exit(0);
});
