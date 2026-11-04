// Test di guard-commands per le operazioni GitHub con approvazione per progetto (git.md,
// «Integrazione GitHub: verifica e approvazione per progetto»): push, tag, gh pr, gh release.
// Ogni caso usa una cartella temporanea con (o senza) CLAUDE.md. Il hook è un processo con input JSON su stdin.
// Eseguire con: node --test plugins/kit-config/tests/github.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

function guard(command, cwd) {
  const r = spawnSync(process.execPath, [path.join(scripts, "guard-commands.mjs")], {
    input: JSON.stringify({ tool_input: { command }, cwd }),
    encoding: "utf8",
    timeout: 15000,
  });
  return { code: r.status, err: r.stderr ?? "" };
}

/** Cartella temporanea con il CLAUDE.md indicato (null = nessun file), passata a fn. */
function project(claudeMd, fn) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kit-github-"));
  try {
    if (claudeMd !== null) writeFileSync(path.join(dir, "CLAUDE.md"), claudeMd, "utf8");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const approvalLine = (pr, push, tag, rilasci, suffix = "") =>
  `# Progetto\n\n## Eccezioni alle regole globali\n- [nessuna]\n` +
  `- **Integrazione GitHub approvata:** PR ${pr}, push ${push}, tag ${tag}, rilasci ${rilasci}${suffix}\n`;

// --- senza approvazione: bloccati ---

test("push: senza CLAUDE.md è bloccato", () => {
  project(null, (dir) => {
    const r = guard("git push origin feature/x", dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /git push non approvato per questo progetto/);
  });
});

test("push: senza riga di approvazione è bloccato", () => {
  project("# Progetto\n\nNessuna riga qui.\n", (dir) => {
    assert.equal(guard("git push", dir).code, 2);
  });
});

test("push: riga malformata (mancano tag e rilasci) non approva nulla", () => {
  project("- **Integrazione GitHub approvata:** PR sì, push sì\n", (dir) => {
    assert.equal(guard("git push", dir).code, 2);
  });
});

test("gh pr create: con push sì ma PR no resta bloccato (le approvazioni sono separate)", () => {
  project(approvalLine("no", "sì", "no", "no"), (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\"", dir).code, 2);
  });
});

test("gh release create: con rilasci no è bloccato", () => {
  project(approvalLine("sì", "sì", "sì", "no"), (dir) => {
    assert.equal(guard("gh release create v1.0.0", dir).code, 2);
  });
});

test("tag: creazione con tag no è bloccata", () => {
  project(approvalLine("no", "no", "no", "no"), (dir) => {
    assert.equal(guard("git tag v1.0.0", dir).code, 2);
  });
});

// --- con approvazione: passano ---

test("push normale: passa con push sì", () => {
  project(approvalLine("no", "sì", "no", "no"), (dir) => {
    assert.equal(guard("git push origin feature/x", dir).code, 0);
  });
});

test("push: la data facoltativa in fondo alla riga non cambia l'esito", () => {
  project(approvalLine("no", "sì", "no", "no", " (2026-11-04)"), (dir) => {
    assert.equal(guard("git push", dir).code, 0);
  });
});

test("gh pr create e merge: passano con PR sì", () => {
  project(approvalLine("sì", "no", "no", "no"), (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\" --body \"y\"", dir).code, 0);
    assert.equal(guard("gh pr merge 12 --squash", dir).code, 0);
  });
});

test("gh release create: passa con rilasci sì", () => {
  project(approvalLine("no", "no", "no", "sì"), (dir) => {
    assert.equal(guard("gh release create v1.0.0", dir).code, 0);
  });
});

test("tag: creazione passa con tag sì; elenco dei tag passa sempre", () => {
  project(approvalLine("no", "no", "sì", "no"), (dir) => {
    assert.equal(guard("git tag v1.0.0", dir).code, 0);
  });
  project(approvalLine("no", "no", "no", "no"), (dir) => {
    assert.equal(guard("git tag -l", dir).code, 0);
    assert.equal(guard("gh pr view 12", dir).code, 0);
  });
});

// --- approvazione letta dalla radice del repository (git.md) ---

test("push da una sottocartella: l'approvazione nella radice del repository vale", () => {
  project(approvalLine("no", "sì", "no", "no"), (dir) => {
    spawnSync("git", ["init", "-q", dir], { windowsHide: true });
    const sub = path.join(dir, "src", "api");
    mkdirSync(sub, { recursive: true });
    assert.equal(guard("git push origin feature/x", sub).code, 0);
  });
});

test("fuori da un repository: vale il CLAUDE.md della cartella del comando (come prima)", () => {
  project(null, (dir) => {
    const sub = path.join(dir, "src");
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(sub, "CLAUDE.md"), approvalLine("no", "sì", "no", "no"), "utf8");
    assert.equal(guard("git push origin feature/x", sub).code, 0);
  });
});

// --- sempre bloccati, anche con approvazione ---

test("push --force e varianti: bloccati anche con push sì", () => {
  project(approvalLine("sì", "sì", "sì", "sì"), (dir) => {
    for (const cmd of ["git push --force origin main", "git push -f", "git push --force-with-lease", "git push origin +main"]) {
      const r = guard(cmd, dir);
      assert.equal(r.code, 2, cmd);
      assert.match(r.err, /forzato/, cmd);
    }
  });
});

test("cancellazione di branch remoti: bloccata anche con push sì", () => {
  project(approvalLine("sì", "sì", "sì", "sì"), (dir) => {
    assert.equal(guard("git push origin --delete feature/x", dir).code, 2);
    assert.equal(guard("git push origin :feature/x", dir).code, 2);
  });
});

test("reset --hard, git init e --no-verify: bloccati anche con tutto sì", () => {
  project(approvalLine("sì", "sì", "sì", "sì"), (dir) => {
    assert.equal(guard("git reset --hard HEAD~1", dir).code, 2);
    assert.equal(guard("git init", dir).code, 2);
    assert.equal(guard("git push --no-verify", dir).code, 2);
  });
});
