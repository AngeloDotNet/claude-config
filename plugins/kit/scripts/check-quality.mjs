#!/usr/bin/env node
// Hook PostToolUse su Write, Edit e MultiEdit: controlli testuali di qualità in modalità avviso
// (nessun blocco, exit 0). Controlla solo il testo scritto, così gli avvisi non si ripetono
// su parti già presenti nel file.
// - Docker (docker.md): tag `latest` o assente nelle immagini di Dockerfile e compose; porte host
//   di database e broker esposte (5432, 1433, 3306, 27017, 6379, 5672, 15672).
// - Dipendenze (core.md §3, security.md «Supply chain»): range di versione in package.json
//   (`*` e `latest`) e in *.csproj/*.props (`*` e `[`); `^` e `~` non si segnalano più; promemoria di
//   audit quando cambiano i pacchetti.
// - Frontend (frontend.md, core.md §0b): `any`, `innerHTML`, `bypassSecurityTrust*`, colori
//   esadecimali hardcoded: nei .ts solo tra virgolette, nei .html solo dentro `style`, nei .css/.scss
//   fuori dalle definizioni di token `--nome:`.
// L'avviso arriva a Claude (additionalContext) e all'utente (systemMessage).
// Fail-open: input illeggibile o errore interno -> nessun output.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import path from "node:path";
import { writtenText } from "./lib/text.mjs";

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

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw);
    const file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    if (!file) process.exit(0);
    const text = writtenText(input.tool_input);
    const notes = qualityFindings(file, text);
    const audit = auditReminder(file, text);
    if (audit) notes.push(`pacchetti cambiati: esegui ${audit} (core.md §3)`);
    if (!notes.length) process.exit(0);
    const name = path.basename(file);
    const list = notes.join("; ");
    process.stdout.write(
      JSON.stringify({
        systemMessage: `Avviso di qualità su ${name}: ${list}`,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[Avviso di qualità, non bloccante] ${name}: ${list}. Correggi nel passo successivo o dichiara la deroga.`,
        },
      }) + "\n"
    );
  } catch {
    process.exit(0);
  }
  process.exit(0);
});
