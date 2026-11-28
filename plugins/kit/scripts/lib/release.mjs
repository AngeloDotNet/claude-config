// Lettura delle regole dall'ultimo tag di rilascio del template, senza checkout né cambio di branch.
// Un tag di rilascio è X.Y.Z senza prefisso (niente `v`, niente suffissi): gli altri si ignorano.
// Richiede Git nel PATH; i comandi sono lanciati con argomenti separati, mai tramite shell.

import { execFileSync } from "node:child_process";

const RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** Esegue un comando git nel repository; restituisce null se git fallisce (per esempio file o tag assenti). */
function git(repo, args) {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/** Confronta due versioni X.Y.Z numericamente: negativo, zero o positivo. */
export function compareRelease(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Il tag di rilascio più alto (X.Y.Z), o null se il repository non ne ha. */
export function latestReleaseTag(repo) {
  const out = git(repo, ["tag", "--list"]);
  if (out === null) return null;
  const tags = out.split(/\r?\n/).map((t) => t.trim()).filter((t) => RELEASE.test(t));
  if (tags.length === 0) return null;
  return tags.sort(compareRelease).at(-1);
}

/** Contenuto di un file com'è nel tag (dal database git, non dal disco), o null se non c'è. */
export function readAtTag(repo, tag, relative) {
  return git(repo, ["show", `${tag}:${relative}`]);
}

/**
 * Regole del template prese dall'ultimo tag: { tag, moduli, leggi(file) } oppure { errore } con il
 * motivo. Senza tag valido o senza un manifest leggibile non si legge nulla: il chiamante non modifica
 * il progetto e avvisa.
 */
export function releaseSource(repo) {
  const tag = latestReleaseTag(repo);
  if (!tag) return { errore: "nessun tag di rilascio X.Y.Z nel template: nessuna regola letta" };
  const raw = readAtTag(repo, tag, "_template/moduli.json");
  if (raw === null) return { errore: `il tag ${tag} non contiene _template/moduli.json: nessuna regola letta` };
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch {
    return { errore: `il manifest del tag ${tag} non è JSON valido: nessuna regola letta` };
  }
  if (!Array.isArray(manifest.moduli)) return { errore: `il manifest del tag ${tag} non ha l'elenco dei moduli: nessuna regola letta` };
  return {
    tag,
    moduli: manifest.moduli,
    leggi: (relative) => readAtTag(repo, tag, relative),
  };
}
