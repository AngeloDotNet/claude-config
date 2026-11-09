// Confronto tra le regole del progetto e quelle del template (cartella con
// .claude/rules/*.md, di norma il repository `claude-config`). Usato da prompt-start.mjs.
// Non copia né modifica nulla: restituisce solo un testo per Claude.
// Fail-open: chi chiama avvolge tutto in try/catch.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { projectKey, ruleFingerprints } from "./rules.mjs";

const RULES_PREFIX = ".claude/rules/";

/** Cartella del template: KIT_CONFIG_TEMPLATE_DIR, oppure "" se non è impostata (nessun percorso personale nel codice). */
export function templateDir() {
  return process.env.KIT_CONFIG_TEMPLATE_DIR || "";
}

/** Versione dichiarata nell'intestazione di un file di regole («> Versione 3.20 — ...»), come stringa; null se assente. */
export function ruleVersion(file) {
  if (!existsSync(file)) return null;
  const match = /^>\s*Versione\s+(\d+(?:\.\d+)*)/m.exec(readFileSync(file, "utf8"));
  return match ? match[1] : null;
}

/** Versioni dei moduli di `.claude/rules/` che dichiarano una versione, per nome file: { "core.md": "3.32", "frontend.md": "1.1" }. */
export function ruleVersions(dir) {
  const rulesDir = path.join(dir, ".claude", "rules");
  if (!existsSync(rulesDir)) return {};
  const versions = {};
  for (const name of readdirSync(rulesDir)) {
    if (!name.endsWith(".md")) continue;
    const version = ruleVersion(path.join(rulesDir, name));
    if (version) versions[name] = version;
  }
  return versions;
}

/** Confronto numerico per segmenti: 3.9 < 3.20. Ritorna <0, 0 o >0. */
export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff) return diff;
  }
  return 0;
}

function sameFolder(a, b) {
  return projectKey(a).toLowerCase() === projectKey(b).toLowerCase();
}

function onlyRules(fingerprints) {
  return Object.fromEntries(Object.entries(fingerprints).filter(([file]) => file.startsWith(RULES_PREFIX)));
}

/**
 * Testo da mostrare a Claude sul confronto con il template, o null se non c'è nulla da dire.
 * Una volta per sessione e per progetto: il marcatore (id di sessione) sta nello stato, in
 * `state[<progetto>#tpl]`; `state` viene modificato e va salvato da chi chiama.
 * Il progetto senza file di regole non usa il kit e non viene controllato.
 */
export function templateSection(cwd, sessionId, state) {
  const projectRules = onlyRules(ruleFingerprints(cwd));
  if (!Object.keys(projectRules).length) return null;

  const markerKey = `${projectKey(cwd)}#tpl`;
  const session = sessionId || "unknown";
  if (state[markerKey] === session) return null;
  state[markerKey] = session;

  const dir = templateDir();
  if (!dir) {
    return (
      "[Template delle regole non configurato] La variabile d'ambiente KIT_CONFIG_TEMPLATE_DIR non è impostata, " +
      "quindi non posso verificare se esistono regole più aggiornate nel template. Segnalalo all'utente con una sola domanda: " +
      "qual è il percorso della cartella del template? Non cercare altrove di tua iniziativa."
    );
  }
  if (sameFolder(cwd, dir)) return null; // il progetto è il template stesso

  if (!existsSync(path.join(dir, ".claude", "rules"))) {
    return (
      `[Template delle regole non trovato] La cartella del template non esiste o non contiene .claude/rules: ${dir}. ` +
      "Non posso verificare se esistono regole più aggiornate. Segnalalo all'utente con una sola domanda: " +
      "qual è il percorso corretto? (si imposta con la variabile d'ambiente KIT_CONFIG_TEMPLATE_DIR). Non cercare altrove di tua iniziativa."
    );
  }

  const templateVersions = ruleVersions(dir);
  if (!Object.keys(templateVersions).length) return null; // template illeggibile: nulla di affidabile da confronto

  // Solo i moduli che il progetto ha: un modulo assente (es. frontend.md in un progetto solo backend) non genera avvisi.
  const projectVersions = ruleVersions(cwd);
  const projectNames = Object.keys(projectRules).map((f) => f.slice(RULES_PREFIX.length));
  const newer = Object.keys(templateVersions).filter(
    (name) =>
      projectNames.includes(name) &&
      (!projectVersions[name] || compareVersions(templateVersions[name], projectVersions[name]) > 0),
  );
  if (!newer.length) return null;

  const templateRules = onlyRules(ruleFingerprints(dir));
  const different = Object.keys(projectRules).filter((f) => f in templateRules && templateRules[f] !== projectRules[f]);
  if (!different.length && newer.every((name) => projectVersions[name])) return null;

  const versions = newer
    .map((name) => {
      const projectVersion = projectVersions[name];
      const current = projectVersion ? `v${projectVersion} nel progetto` : "versione non rilevata nel progetto";
      return `${name} v${templateVersions[name]} nel template, ${current}`;
    })
    .join("; ");
  return (
    `[Regole del template più recenti] Il template in ${dir} ha regole più aggiornate (${versions}). ` +
    (different.length ? `File diversi: ${different.join(", ")}. ` : "") +
    "Informa l'utente e proponi di allinearle con una sola domanda; non copiare né modificare nulla senza il suo ok. " +
    "Se le differenze sono deroghe volute, vanno annotate in CLAUDE.md."
  );
}
