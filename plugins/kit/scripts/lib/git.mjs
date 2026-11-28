// Comandi git di sola lettura usati dal kit, lanciati con argomenti separati (mai tramite shell).
// Restituiscono null quando git fallisce (file o tag assenti, cartella non versionata).

import { execFileSync } from "node:child_process";

/** Esegue un comando git nel repository; restituisce l'output o null se git fallisce. */
export function git(repo, args) {
  try {
    return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024, timeout: 10000 });
  } catch {
    return null;
  }
}

/**
 * Stato del repository per la sincronizzazione: { versionata, branch, modificato, haDevelop }.
 * `modificato` è vero se ci sono modifiche non committate (anche non tracciate).
 */
export function gitState(repo) {
  const branch = git(repo, ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch === null) return { versionata: false, branch: null, modificato: false, haDevelop: false };
  const status = git(repo, ["status", "--porcelain"]) ?? "";
  const develop = git(repo, ["rev-parse", "--verify", "--quiet", "refs/heads/develop"]);
  // Un merge o un rebase in corso lascia MERGE_HEAD o REBASE_HEAD: la sincronizzazione non parte.
  const inCorso = ["MERGE_HEAD", "REBASE_HEAD"].some((ref) => git(repo, ["rev-parse", "--verify", "--quiet", ref]) !== null);
  return {
    versionata: true,
    branch: branch.trim(),
    staccata: branch.trim() === "HEAD",
    inCorso,
    modificato: status.trim().length > 0,
    haDevelop: develop !== null,
  };
}
