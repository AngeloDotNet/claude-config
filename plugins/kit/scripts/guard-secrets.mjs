#!/usr/bin/env node
// Hook PreToolUse su Write, Edit e MultiEdit: blocca (exit 2, motivo su stderr) la scrittura di
// segreti reali (security.md «Dati e Segreti», core.md §0b):
// - appsettings*.json: valori reali in chiavi come Password, Secret, Token, ApiKey, Key
//   (es. Jwt:Key) o password in una stringa di connessione. Si usano segnaposto
//   (CHANGE-ME-…, ${VAR}) e i valori reali arrivano da variabili d'ambiente o secrets.
// - docker-compose*.yml e Dockerfile: password o chiavi scritte in chiaro (ENV, environment).
// - Qualunque file: chiavi private PEM e chiavi AWS (AKIA…); token JWT completi, esclusi i .md
//   (la documentazione li usa come esempio).
// Un segnaposto è valido solo se il valore intero ha una forma nota (vedi PLACEHOLDER_FULL).
// Fail-open: input illeggibile o errore interno -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import path from "node:path";
import { writtenText } from "./lib/text.mjs";

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

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let reasons = [];
  let file = "";
  try {
    const input = JSON.parse(raw);
    file = typeof input?.tool_input?.file_path === "string" ? input.tool_input.file_path : "";
    if (file) reasons = secretFindings(file, writtenText(input.tool_input));
  } catch {
    process.exit(0);
  }
  if (reasons.length) {
    process.stderr.write(
      `Bloccato dall'hook guard-secrets in ${path.basename(file)}: ${reasons.join("; ")}. ` +
        "Usa un segnaposto (CHANGE-ME-…, ${VAR}); il valore reale va in variabili d'ambiente o secrets ed è elencato in " +
        ".env.example (security.md, «Dati e Segreti»).\n"
    );
    process.exit(2);
  }
  process.exit(0);
});
