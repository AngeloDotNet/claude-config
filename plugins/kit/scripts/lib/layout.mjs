// Layout delle regole nel progetto e nel template: cartelle, profili, file di riferimento e regole di
// posizione dei moduli. I moduli stessi (nome, applicabilità, profilo minimo) stanno nel manifest del
// template, `_template/moduli.json`: qui non ci sono elenchi di moduli.

import path from "node:path";

export const RULES = ".claude/rules";
export const EXTRA = ".claude/rules-optional";
export const DETAIL = `${EXTRA}/dettaglio`;
export const MANIFEST = "_template/moduli.json";
export const PROFILES = ["strutturato", "standard", "mini"];
export const PROFILE_RANK = { mini: 0, standard: 1, strutturato: 2 };
export const APPLICABILITA = ["sempre", "profilo", "backend", "frontend", "sicurezza-estesa", "opzionale"];
export const ROOT_FILES = ["NuGet.config", ".editorconfig", ".gitignore", ".gitattributes"];
export const REFERENCE = [
  "_template/avvio-progetto.md",
  "_template/settings.example.json",
  "_template/eslint.config.example.js",
  "_template/ci/ci.yml",
  "_template/ci/kit-allow.yml",
  "_template/ci/kit-allow-report.mjs",
  "_template/ci/kit-allow-report.test.mjs",
];
/** Dichiarazione del profilo nel CLAUDE.md: il valore è il primo gruppo. */
export const PROFILE_VALUE = /^[ \t]*(?:-[ \t]*)?(?:\*\*)?Profilo:(?:\*\*)?[ \t]*`?(mini|standard|strutturato)\b/im;

/** Il modulo con quel nome nel manifest, o null. */
export const modulo = (moduli, name) => moduli.find((m) => m.nome === name) ?? null;

/** Cartella attesa di un modulo per il profilo: rules o rules-optional; null se si attiva a mano. */
export function expectedFolder(modulo, profile) {
  if (modulo.applicabilita === "opzionale") return null;
  if (modulo.profiloMinimo && PROFILE_RANK[profile] < PROFILE_RANK[modulo.profiloMinimo]) return EXTRA;
  return modulo.cartella === "rules-optional" ? EXTRA : RULES;
}

/** Percorso relativo (con /) di un file gestito dal kit: modulo in rules, rules-optional o dettaglio, o file di riferimento. */
export function isManagedModule(relative) {
  return [RULES, EXTRA, DETAIL].includes(path.posix.dirname(relative)) && relative.endsWith(".md");
}
