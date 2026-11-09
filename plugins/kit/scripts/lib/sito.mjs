// Sito di documentazione di un progetto (core.md §5b). Legge la voce `sito` in
// ~/.claude/kit-progetti.json e decide due cose:
// - siteQuestion: la domanda sulla wiki, finché la voce manca o dice `esiste: false` senza `chiesto`
//   (usato da prompt-start.mjs, UserPromptSubmit: il testo finisce nel contesto di Claude).
// - siteReminder: il promemoria a fine risposta, se CHANGELOG.md o README.md del progetto sono
//   modificati, la voce ha `esiste: true` e la cartella del sito non ha modifiche non committate
//   (usato da session-close.mjs, Stop: solo un messaggio all'utente, non blocca).
// Fail-open: nessuna funzione lancia eccezioni verso il chiamante.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectKey } from "./rules.mjs";
import { projectUsesKit } from "./text.mjs";

/** File della configurazione personale (fuori dai repository). */
export function configFile() {
  return path.join(os.homedir(), ".claude", "kit-progetti.json");
}

/** Configurazione letta dal disco; oggetto vuoto se manca, è illeggibile o non è un oggetto. */
export function readConfig() {
  try {
    const file = configFile();
    if (!existsSync(file)) return {};
    const data = JSON.parse(readFileSync(file, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

/** Radice del repository che contiene `cwd`; se git non risponde, `cwd` stesso. */
export function repoRoot(cwd) {
  try {
    return execFileSync("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return cwd;
  }
}

/** Percorsi modificati non committati di un repository (relativi alla radice), o null se non è git. */
export function changedPaths(dir) {
  try {
    const out = execFileSync("git", ["-C", dir, "status", "--porcelain", "-uall"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out
      .split("\n")
      .filter((l) => l.length > 3)
      .map((l) => l.slice(3).split(" -> ").pop().replace(/^"|"$/g, "").replace(/\\/g, "/"));
  } catch {
    return null;
  }
}

/** Voce `sito` del progetto (radice del repository), o undefined se manca. */
export function siteEntry(root, config) {
  const entry = config[projectKey(root)];
  return entry && typeof entry === "object" ? entry.sito : undefined;
}

/**
 * Domanda da porre a ogni prompt, o null se non serve. Serve solo nei progetti con il kit e se la
 * voce manca o dice `esiste: false` senza `chiesto: true` (dopo un «no» la domanda non torna).
 */
export function siteQuestion(cwd, config = readConfig()) {
  if (!projectUsesKit(cwd)) return null;
  const root = repoRoot(cwd);
  const sito = siteEntry(root, config);
  if (sito && typeof sito === "object") {
    if (sito.esiste === true) return null;
    if (sito.esiste === false && sito.chiesto === true) return null;
  }
  const key = projectKey(root);
  return (
    `[Sito di documentazione: domanda da fare] Nella voce di questo progetto in ~/.claude/kit-progetti.json ` +
    `manca la risposta sulla wiki o sul sito di documentazione dedicato (core.md §5b). Prima di rispondere ` +
    `poni UNA SOLA domanda: esiste una wiki dedicata a questo progetto (sì/no)? ` +
    `Se la risposta è sì, alla risposta successiva chiedi il percorso assoluto della cartella ` +
    `(con / al posto di \\). Dopo la risposta aggiorna solo la voce di questo progetto, chiave "${key}" ` +
    `(crea il file se non esiste, senza toccare le altre voci): ` +
    `sì → "sito": { "esiste": true, "percorso": "<percorso>" }; ` +
    `no → "sito": { "esiste": false, "chiesto": true }. ` +
    `Non ripetere la domanda dopo la risposta.`
  );
}

/**
 * Promemoria di fine risposta, o null. Scatta solo se il progetto ha CHANGELOG.md o README.md
 * modificati, la voce dice `esiste: true` con un percorso e la cartella del sito è un repository
 * git senza modifiche non committate. Se la cartella del sito non è git, non dice nulla.
 */
export function siteReminder(cwd, config = readConfig()) {
  if (!projectUsesKit(cwd)) return null;
  const root = repoRoot(cwd);
  const sito = siteEntry(root, config);
  if (!sito || sito.esiste !== true || typeof sito.percorso !== "string" || !sito.percorso) return null;

  const projectChanges = changedPaths(root) ?? [];
  if (!projectChanges.some((p) => /^(CHANGELOG|README)\.md$/i.test(p))) return null;

  const siteChanges = changedPaths(sito.percorso);
  if (siteChanges === null || siteChanges.length) return null;

  return (
    `Sito di documentazione: CHANGELOG.md o README.md di questo progetto sono cambiati, ma il sito ` +
    `${sito.percorso} non ha modifiche. Aggiornalo se le pagine descrivono ciò che è cambiato (core.md §5b).`
  );
}
