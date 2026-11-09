#!/usr/bin/env node
// Hook PostToolUse su Write, Edit e MultiEdit: unisce tre controlli sul testo appena scritto.
// - check-plan (core.md §6.21): se si scrive PIANO.md, ogni passo spuntato `[x]` deve riportare
//   nel proprio blocco l'esito di build e di test. Se manca, exit 2 e il motivo su stderr: Claude
//   lo riceve e corregge il piano. Il file già scritto non viene annullato.
// - check-quality (docker.md, core.md §3, frontend.md, core.md §0b): avvisi non bloccanti su Docker
//   (tag `latest` o assente, porte host di database e broker), dipendenze (range `*`, `latest`, `[`)
//   e promemoria di audit, frontend (`any`, `innerHTML`, `bypassSecurityTrust*`, colori esadecimali).
// - check-practice (core.md §4, §5, §5b; security.md; backend-architecture.md §2c): avvisi non bloccanti
//   su scrittura in blocco, soppressioni, AllowAnonymous, Regex senza timeout, log diretti, membri
//   pubblici senza ///, file di servizio nuovi senza test. Attivo solo nei progetti con il kit.
// Gli avvisi di check-quality e check-practice escono in un unico JSON (systemMessage e
// additionalContext), perché il protocollo prevede un solo JSON per hook. Ogni controllo è isolato:
// un errore interno in uno non disattiva gli altri. Fail-open: input illeggibile -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isWaived, projectUsesKit, writtenText } from "./lib/text.mjs";

// --- check-plan ---

const CHECKBOX = /^\s*(?:[-*]|\d+\.)\s+\[[ x~]\]/i;
const CHECKED = /^\s*(?:[-*]|\d+\.)\s+\[x\]/i;
const HEADING = /^#{1,6}\s/;

/** Passi spuntati senza esito di build e di test: restituisce il titolo di ciascuno. */
function uncheckedVerifications(text) {
  const lines = text.split(/\r?\n/);
  const missing = [];
  for (let i = 0; i < lines.length; i++) {
    if (!CHECKED.test(lines[i])) continue;
    const block = [lines[i]];
    for (let j = i + 1; j < lines.length && !CHECKBOX.test(lines[j]) && !HEADING.test(lines[j]); j++) block.push(lines[j]);
    const body = block.join("\n");
    const hasBuild = /\b(build|compil\w*)\b/i.test(body);
    const hasTest = /\btest\b/i.test(body);
    if (!hasBuild || !hasTest) missing.push(lines[i].replace(CHECKED, "").trim().slice(0, 80));
  }
  return missing;
}

/** Messaggio di blocco per PIANO.md, o null se il piano è a posto o il file non è PIANO.md. */
function planBlock(file) {
  if (path.basename(file) !== "PIANO.md" || !existsSync(file)) return null;
  const missing = uncheckedVerifications(readFileSync(file, "utf8"));
  if (!missing.length) return null;
  return (
    `PIANO.md: passo spuntato [x] senza esito di build e di test: ${missing.map((t) => `"${t}"`).join(", ")}. ` +
    "Riporta nel passo l'esito della verifica (es. \"Verifica: build senza errori, test 12/12 verdi\") oppure riportalo " +
    "come [ ] finché i test non sono eseguiti (core.md §6.21)."
  );
}

// --- check-quality ---

const DB_BROKER_PORTS = "5432|1433|3306|27017|6379|5672|15672";
const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;

/** Avvisi per il testo scritto nel file (lista vuota se nulla da segnalare). */
function qualityFindings(file, text) {
  const out = [];
  const base = path.basename(file);

  // Docker
  if (/^Dockerfile/i.test(base) || /^(docker-compose|compose)([.\w-]*)\.ya?ml$/i.test(base)) {
    const images = [...text.matchAll(/^\s*FROM\s+(\S+)/gim), ...text.matchAll(/^\s*image:\s*["']?([^\s"'#]+)/gim)].map((m) => m[1]);
    for (const image of images) {
      if (image.startsWith("$") || image === "scratch" || image.includes("@")) continue;
      const name = image.split("/").pop();
      if (!name.includes(":")) out.push(`immagine "${image}" senza tag (docker.md: tag fissi)`);
      else if (/:latest$/i.test(name)) out.push(`immagine "${image}" con tag latest (docker.md: tag fissi)`);
    }
    for (const m of text.matchAll(new RegExp(`["']?(\\d{2,5}):(${DB_BROKER_PORTS})["']?`, "g"))) {
      out.push(`porta host ${m[1]} esposta per il servizio ${m[2]} (docker.md: database e broker non esposti in produzione)`);
    }
  }

  // Dipendenze
  if (base === "package.json") {
    for (const m of text.matchAll(/"(@?[\w./-]+)"\s*:\s*"([^"]*)"/g)) {
      if (/^\*$|^latest$/.test(m[2])) out.push(`range di versione "${m[2]}" per "${m[1]}" (pacchetti con versioni fisse e lock file)`);
    }
  }
  if (/\.(cs|vb|fs)proj$|\.props$/i.test(base)) {
    for (const m of text.matchAll(/<Package(?:Reference|Version)\b[^>]*\bInclude="([^"]+)"[^>]*\bVersion="([^"]*)"/g)) {
      if (/\*|\[/.test(m[2])) out.push(`range di versione "${m[2]}" per "${m[1]}" (pacchetti con versioni fisse)`);
    }
  }

  // Frontend
  if (/\.ts$/i.test(base) && /(?::\s*|\bas\s+|<)any(?![\w$])/.test(text)) out.push("uso di `any` (core.md §0b: nessun any)");
  if (/\.(ts|html)$/i.test(base)) {
    if (/\binnerHTML\b/.test(text)) out.push("uso di innerHTML (security.md, Frontend: vietato senza sanitizzazione)");
    if (/\bbypassSecurityTrust\w*/.test(text)) out.push("uso di bypassSecurityTrust* (security.md, Frontend: vietato senza motivazione)");
  }
  if (/\.ts$/i.test(base) && text.split("\n").some((line) => /['"`]#[0-9a-fA-F]{3,8}\b/.test(line) && HEX.test(line))) {
    out.push("colore esadecimale hardcoded (frontend.md: colori dai token del tema)");
  }
  if (/\.html$/i.test(base) && text.split("\n").some((line) => /style/i.test(line) && HEX.test(line))) {
    out.push("colore esadecimale hardcoded in uno stile (frontend.md: colori dai token del tema)");
  }
  if (/\.(css|scss)$/i.test(base) && text.split("\n").some((line) => HEX.test(line) && !/--[\w-]+\s*:/.test(line))) {
    out.push("colore esadecimale hardcoded fuori dai token `--nome:` (frontend.md)");
  }

  return out;
}

/** Promemoria di audit quando la scrittura aggiunge o cambia dipendenze (core.md §3). */
function auditReminder(file, text) {
  const base = path.basename(file);
  if (base === "package.json" && /"@?[\w./-]+"\s*:\s*"[\^~*\d]/.test(text)) return "npm audit";
  if (/\.(cs|vb|fs)proj$|\.props$/i.test(base) && /<Package(Reference|Version)\b/.test(text)) return "dotnet list package --vulnerable --include-transitive";
  return null;
}

// --- check-practice ---

const TEST_FILE_CS_TS = /(\.(spec|test)\.(ts|tsx|js)|Tests?\.cs)$/i;
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
    if (rule.exceptTests && TEST_FILE_CS_TS.test(file)) continue;
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
  if (!/\.cs$/i.test(file) || TEST_FILE_CS_TS.test(file)) return 0;
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

/** Avvisi di pratica per il file scritto (lista di messaggi, vuota se nulla da segnalare). */
function practiceNotes(input, file, cwd) {
  const text = writtenText(input.tool_input);
  const notes = practiceFindings(file, text);
  const docs = missingDocs(file, text);
  if (docs) notes.push(`${docs} membri pubblici senza /// (core.md §5b)`);
  if (input.tool_name === "Write") {
    const t = missingTest(file, cwd);
    if (t) notes.push(t);
  }
  return notes;
}

// --- ingresso ---

/** Ogni controllo gira isolato: un errore in uno non toglie gli altri. */
function attempt(fn, fallback) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const systemParts = [];
  const contextParts = [];
  let planMessage = null;
  try {
    const input = JSON.parse(raw);
    const file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    const cwd = typeof input?.cwd === "string" && input.cwd ? input.cwd : process.cwd();
    if (!file) process.exit(0);
    const name = path.basename(file);

    planMessage = attempt(() => planBlock(file), null);

    const quality = attempt(() => {
      const notes = qualityFindings(file, writtenText(input.tool_input));
      const audit = auditReminder(file, writtenText(input.tool_input));
      if (audit) notes.push(`pacchetti cambiati: esegui ${audit} (core.md §3)`);
      return notes;
    }, []);
    if (quality.length) {
      const list = quality.join("; ");
      systemParts.push(`Avviso di qualità su ${name}: ${list}`);
      contextParts.push(`[Avviso di qualità, non bloccante] ${name}: ${list}. Correggi nel passo successivo o dichiara la deroga.`);
    }

    if (projectUsesKit(cwd)) {
      const practice = attempt(() => practiceNotes(input, file, cwd), []);
      if (practice.length) {
        const list = practice.join("; ");
        systemParts.push(`Avviso di pratica su ${name}: ${list}`);
        contextParts.push(`[Avviso di pratica, non bloccante] ${name}: ${list}. Correggi nel passo successivo o dichiara la deroga con kit-allow.`);
      }
    }

    if (systemParts.length) {
      process.stdout.write(
        JSON.stringify({
          systemMessage: systemParts.join("\n"),
          hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: contextParts.join("\n") },
        }) + "\n"
      );
    }
  } catch {
    process.exit(0);
  }
  if (planMessage) {
    process.stderr.write(planMessage + "\n");
    process.exit(2);
  }
  process.exit(0);
});
