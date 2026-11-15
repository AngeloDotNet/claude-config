// Confronto tra la versione del plugin `kit` in esecuzione e quella nel template (cartella
// KIT_CONFIG_TEMPLATE_DIR, di norma il repository `claude-config`). Usato da prompt-start.mjs.
// Non modifica nulla: restituisce solo un testo per Claude. Fail-open: chi chiama avvolge tutto in try/catch.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { projectKey } from "./rules.mjs";
import { compareVersions, templateDir } from "./template.mjs";

const MANIFEST = path.join(".claude-plugin", "plugin.json");

/** Radice del plugin in esecuzione: CLAUDE_PLUGIN_ROOT se impostata, altrimenti due cartelle sopra questo file. */
export function pluginRoot() {
  return process.env.CLAUDE_PLUGIN_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

/** Versione dichiarata in `<radice>/.claude-plugin/plugin.json`, o null se il file manca o non è valido. */
export function pluginVersion(root) {
  const file = path.join(root, MANIFEST);
  if (!existsSync(file)) return null;
  const version = JSON.parse(readFileSync(file, "utf8"))?.version;
  return typeof version === "string" && /^\d+(\.\d+)*$/.test(version) ? version : null;
}

/**
 * Testo da mostrare a Claude se il template ha una versione del plugin più recente di quella in
 * esecuzione, o null. Una volta per sessione e per progetto: il marcatore (id di sessione) sta nello
 * stato, in `state[<progetto>#plugin]`; `state` viene modificato e va salvato da chi chiama.
 * Gira in ogni progetto, anche senza regole. Senza KIT_CONFIG_TEMPLATE_DIR resta in silenzio:
 * la domanda sul percorso la pone già il confronto delle regole.
 */
export function pluginVersionSection(cwd, sessionId, state) {
  const dir = templateDir();
  if (!dir) return null;

  const markerKey = `${projectKey(cwd)}#plugin`;
  const session = sessionId || "unknown";
  if (state[markerKey] === session) return null;
  state[markerKey] = session;

  const installed = pluginVersion(pluginRoot());
  const latest = pluginVersion(path.join(dir, "plugins", "kit"));
  if (!installed || !latest || compareVersions(latest, installed) <= 0) return null;

  return (
    `[Plugin kit da aggiornare] Il plugin installato è la versione ${installed}, il template ha la ${latest}. ` +
    "Informa l'utente con una sola frase e suggerisci, da una sessione Claude Code, " +
    "`/plugin marketplace update claude-config`, `/plugin update kit@claude-config` e poi `/reload-plugins`. " +
    "Sono comandi interni: non eseguirli e non modificare nulla."
  );
}
