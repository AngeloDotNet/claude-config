// Test di guard-commands per le operazioni GitHub (git.md, «Integrazione GitHub»): push sempre
// consentito; la creazione di un tag solo con nome X.Y.Z e dal branch main; gh pr e gh release
// richiedono la riga «GitHub CLI (gh) installata» nel CLAUDE.md.
// Ogni caso usa una cartella temporanea con (o senza) CLAUDE.md. Il hook è un processo con input JSON su stdin.
// Eseguire con: node --test plugins/kit/tests/github.test.mjs

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

const ghLine = (value, suffix = "") =>
  `# Progetto\n\n## Eccezioni alle regole globali\n- [nessuna]\n` +
  `- **GitHub CLI (gh) installata:** ${value}${suffix}\n`;

// --- push sempre consentito; tag: formato e branch ---

test("push: passa anche senza CLAUDE.md e senza riga gh", () => {
  project(null, (dir) => {
    assert.equal(guard("git push origin feature/x", dir).code, 0);
  });
  project("# Progetto\n\nNessuna riga qui.\n", (dir) => {
    assert.equal(guard("git push", dir).code, 0);
  });
});

/** Cartella temporanea con un repository sul branch indicato (nessun commit: basta il nome del branch). */
function repoOn(branch, fn) {
  return project(null, (dir) => {
    // `-b` richiede git 2.28 o successivo: se l'inizializzazione fallisce il test lo dice, invece di dare un esito falso.
    const init = spawnSync("git", ["init", "-q", "-b", branch], { cwd: dir, encoding: "utf8" });
    assert.equal(init.status, 0, `git init -b ${branch} non riuscito: ${init.stderr}`);
    return fn(dir);
  });
}

test("tag: elenco e cancellazione passano sempre", () => {
  project(null, (dir) => {
    assert.equal(guard("git tag", dir).code, 0);
    assert.equal(guard("git tag -l", dir).code, 0);
    assert.equal(guard("git tag --list \"1.*\"", dir).code, 0);
    assert.equal(guard("git tag -d v1.0.0", dir).code, 0);
  });
});

test("tag: creazione X.Y.Z dal branch main passa", () => {
  repoOn("main", (dir) => {
    assert.equal(guard("git tag 1.0.0", dir).code, 0);
    assert.equal(guard("git tag -a 1.0.0 -m \"release 1.0.0\"", dir).code, 0);
    assert.equal(guard("git tag -m \"v2\" 7.1.3", dir).code, 0);
  });
});

test("tag: nome con prefisso v o non X.Y.Z è bloccato", () => {
  repoOn("main", (dir) => {
    for (const cmd of ["git tag v1.0.0", "git tag -a v1.0.0 -m \"release\"", "git tag release-1", "git tag 1.0"]) {
      const r = guard(cmd, dir);
      assert.equal(r.code, 2, cmd);
      assert.match(r.err, /X\.Y\.Z/);
    }
  });
});

test("tag: creazione da un branch diverso da main è bloccata", () => {
  for (const branch of ["develop", "release/1.0.0"]) {
    repoOn(branch, (dir) => {
      const r = guard("git tag -a 1.0.0 -m \"release\"", dir);
      assert.equal(r.code, 2, branch);
      assert.match(r.err, /main/);
    });
  }
  project(null, (dir) => {
    assert.equal(guard("git tag 1.0.0", dir).code, 2);
  });
});

test("commit su main o develop: bloccato, il messaggio dice di creare il branch senza chiedere conferma", () => {
  for (const branch of ["main", "develop"]) {
    repoOn(branch, (dir) => {
      const r = guard('git commit -m "feat: add x"', dir);
      assert.equal(r.code, 2, branch);
      assert.match(r.err, /senza chiedere conferma|UNA SOLA domanda/);
    });
  }
  repoOn("feature/x", (dir) => {
    assert.equal(guard('git commit -m "feat: add x"', dir).code, 0);
  });
});

// --- PR e rilasci: richiedono gh installata ---

test("gh pr create: senza riga gh è bloccato (fail closed)", () => {
  project(null, (dir) => {
    const r = guard("gh pr create --title \"feat: x\"", dir);
    assert.equal(r.code, 2);
    assert.match(r.err, /GitHub CLI/);
  });
  project("# Progetto\n\nNessuna riga qui.\n", (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\"", dir).code, 2);
  });
});

test("gh pr create: con gh no è bloccato", () => {
  project(ghLine("no"), (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\"", dir).code, 2);
  });
});

test("gh release create: con gh no è bloccato", () => {
  project(ghLine("no"), (dir) => {
    assert.equal(guard("gh release create v1.0.0", dir).code, 2);
  });
});

test("gh pr create e merge: passano con gh sì", () => {
  project(ghLine("sì"), (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\" --body \"y\"", dir).code, 0);
    assert.equal(guard("gh pr merge 12 --squash", dir).code, 0);
  });
});

test("gh release create: passa con gh sì", () => {
  project(ghLine("si"), (dir) => {
    assert.equal(guard("gh release create v1.0.0", dir).code, 0);
  });
});

test("la data facoltativa in fondo alla riga non cambia l'esito", () => {
  project(ghLine("sì", " (2026-11-08)"), (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\"", dir).code, 0);
  });
});

test("riga malformata non vale come sì", () => {
  project("- **GitHub CLI (gh) installata:** forse\n", (dir) => {
    assert.equal(guard("gh pr create --title \"feat: x\"", dir).code, 2);
  });
});

test("gh di sola lettura passa sempre", () => {
  project(ghLine("no"), (dir) => {
    assert.equal(guard("gh pr view 12", dir).code, 0);
  });
});

// --- la riga gh viene letta dalla radice del repository (git.md) ---

test("gh da una sottocartella: la riga nella radice del repository vale", () => {
  project(ghLine("sì"), (dir) => {
    spawnSync("git", ["init", "-q", dir], { windowsHide: true });
    const sub = path.join(dir, "src", "api");
    mkdirSync(sub, { recursive: true });
    assert.equal(guard("gh pr create --title \"feat: x\"", sub).code, 0);
  });
});

test("fuori da un repository: vale il CLAUDE.md della cartella del comando", () => {
  project(null, (dir) => {
    const sub = path.join(dir, "src");
    mkdirSync(sub, { recursive: true });
    writeFileSync(path.join(sub, "CLAUDE.md"), ghLine("sì"), "utf8");
    assert.equal(guard("gh release create v1.0.0", sub).code, 0);
  });
});

// --- sempre bloccati, anche con gh installata ---

test("push --force e varianti: bloccati anche con gh sì", () => {
  project(ghLine("sì"), (dir) => {
    for (const cmd of ["git push --force origin main", "git push -f", "git push --force-with-lease", "git push origin +main"]) {
      const r = guard(cmd, dir);
      assert.equal(r.code, 2, cmd);
      assert.match(r.err, /forzato/, cmd);
    }
  });
});

test("cancellazione di branch remoti: solo feature/, bugfix/, release/, hotfix/, mai main o develop", () => {
  project(ghLine("sì"), (dir) => {
    for (const cmd of [
      "git push origin --delete feature/x",
      "git push origin :bugfix/y",
      "git push -d origin release/1.0.0",
      "git push --delete origin release/1.0.0 hotfix/1.0.1",
    ]) {
      assert.equal(guard(cmd, dir).code, 0, cmd);
    }
    for (const cmd of [
      "git push origin --delete main",
      "git push origin --delete develop",
      "git push origin :develop",
      "git push origin --delete feature/x main",
      "git push origin --delete",
      "git push origin --delete refs/heads/feature/x",
      "git push origin --delete feature/x --force",
      "git push origin +feature/x",
    ]) {
      assert.equal(guard(cmd, dir).code, 2, cmd);
    }
  });
});

test("redirezioni (2>&1, > file, 2>/dev/null) non sono argomenti di git: non cambiano l'esito", () => {
  project(ghLine("sì"), (dir) => {
    for (const cmd of [
      "git push origin --delete release/1.13.0 2>&1",
      "git push origin --delete feature/x > out.txt",
      "git push origin --delete feature/x 2>/dev/null",
      "git push origin --delete feature/x 2> err.txt",
      "git push origin :bugfix/y 2>&1 | tail -3",
    ]) {
      assert.equal(guard(cmd, dir).code, 0, cmd);
    }
    for (const cmd of [
      "git push origin --delete main 2>&1",
      "git push origin --delete feature/x main 2>&1",
      "git push origin --delete develop > out.txt",
      "git push --force origin main 2>&1",
      "git add -A 2>&1",
      "git add .env 2>/dev/null",
    ]) {
      assert.equal(guard(cmd, dir).code, 2, cmd);
    }
  });
});

test("reset --hard e --no-verify: bloccati anche con gh sì", () => {
  project(ghLine("sì"), (dir) => {
    assert.equal(guard("git reset --hard HEAD~1", dir).code, 2);
    assert.equal(guard("git push --no-verify", dir).code, 2);
  });
});
