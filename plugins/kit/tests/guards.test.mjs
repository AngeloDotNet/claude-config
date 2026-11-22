// Test dei hook di controllo di kit: guard-commands (git e gh), guard-secrets.
// Ogni hook è eseguito come processo con l'input JSON su stdin, come fa Claude Code.
// Eseguire con: node --test plugins/kit/tests/guards.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

function run(script, input) {
  const r = spawnSync(process.execPath, [path.join(scripts, script)], {
    input: JSON.stringify(input),
    encoding: "utf8",
    timeout: 15000,
  });
  return { code: r.status, err: r.stderr ?? "", out: r.stdout ?? "" };
}

const bash = (command) => run("guard-commands.mjs", { tool_input: { command }, cwd: os.tmpdir() });
const secrets = (file_path, content) => run("guard-write.mjs", { tool_input: { file_path, content } });
const editSecrets = (file_path, new_string) => run("guard-write.mjs", { tool_input: { file_path, old_string: "", new_string } });


// --- git: messaggi di commit (Conventional Commits) ---

test("commit: messaggio Conventional Commits valido passa", () => {
  assert.equal(bash('git commit -m "feat(orders): add export endpoint"').code, 0);
});

test("commit: messaggio generico bloccato", () => {
  const r = bash('git commit -m "update"');
  assert.equal(r.code, 2);
  assert.match(r.err, /non segue tipo\(scope\)/);
});

test("commit: maiuscola, punto finale e oggetto lungo non sono controllati dall'hook", () => {
  assert.equal(bash('git commit -m "fix: Sistemo il bug"').code, 0);
  assert.equal(bash('git commit -m "fix: sistemo il bug."').code, 0);
  assert.equal(bash(`git commit -m "feat: ${"a".repeat(70)}"`).code, 0);
});

test("commit: messaggio letto da heredoc, valido passa e non valido bloccato", () => {
  const good = "git commit -m \"$(cat <<'EOF'\nfeat(auth): add refresh rotation\n\nBody.\nEOF\n)\"";
  const bad = "git commit -m \"$(cat <<'EOF'\nupdate stuff\nEOF\n)\"";
  assert.equal(bash(good).code, 0);
  assert.equal(bash(bad).code, 2);
});

test("commit: 'git push' dentro il corpo del messaggio non viene bloccato", () => {
  assert.equal(bash('git commit -m "docs: git push"').code, 0);
});

test("commit: senza -m (editor) nessun blocco sul messaggio", () => {
  assert.equal(bash("git commit --amend --no-edit").code, 0);
});

// --- git: staging sicuro ---

test("add: git add -A, --all e . bloccati", () => {
  assert.equal(bash("git add -A").code, 2);
  assert.equal(bash("git add --all").code, 2);
  assert.equal(bash("git add .").code, 2);
});

test("add: file per nome passa, file sensibili bloccati, .env.example consentito", () => {
  assert.equal(bash("git add src/a.cs").code, 0);
  assert.equal(bash("git add .env").code, 2);
  assert.equal(bash("git add certs/server.pfx").code, 2);
  assert.equal(bash("git add config/secrets.json").code, 2);
  assert.equal(bash("git add .env.example").code, 0);
});

// --- segreti in appsettings, compose, Dockerfile e contenuti ---

test("secrets: password reale in appsettings bloccata, segnaposto consentito", () => {
  assert.equal(secrets("api/appsettings.json", '{"Admin": {"Password": "Real123!"}}').code, 2);
  assert.equal(secrets("api/appsettings.json", '{"Admin": {"Password": "CHANGE-ME"}}').code, 0);
  assert.equal(secrets("api/appsettings.json", '{"Admin": {"Password": ""}}').code, 0);
});

test("secrets: chiave JWT reale bloccata, segnaposto e placeholder consentiti", () => {
  assert.equal(secrets("appsettings.json", '{"Jwt": {"Key": "k3J9xQ2mZr8vLp0sT7wY"}}').code, 2);
  assert.equal(secrets("appsettings.json", '{"Jwt": {"Key": "CHANGE-ME-placeholder-not-a-real-key"}}').code, 0);
});

test("secrets: stringa di connessione con password reale bloccata, variabile consentita", () => {
  const real = '{"ConnectionStrings": {"Db": "Server=db;Database=app;User Id=app;Password=Hunter2x;"}}';
  const env = '{"ConnectionStrings": {"Db": "Server=db;Database=app;User Id=app;Password=${DB_PASSWORD};"}}';
  assert.equal(secrets("appsettings.Production.json", real).code, 2);
  assert.equal(secrets("appsettings.Production.json", env).code, 0);
});

test("secrets: password in chiaro in docker-compose bloccata, variabile consentita", () => {
  assert.equal(secrets("docker-compose.yml", "POSTGRES_PASSWORD: hunter2\n").code, 2);
  assert.equal(secrets("docker-compose.prod.yml", "POSTGRES_PASSWORD: ${DB_PASSWORD}\n").code, 0);
});

test("secrets: chiave privata PEM bloccata in qualunque file", () => {
  const pem = "-----BEGIN PRIVATE KEY-----\nMIIEvQ\n-----END PRIVATE KEY-----";
  assert.equal(secrets("notes/keys.txt", pem).code, 2);
});

test("secrets: file fuori ambito con testo simile non bloccato", () => {
  assert.equal(secrets("Program.cs", 'var x = new { Password = "Real123!" };').code, 0);
});

test("secrets: il segnaposto vale solo per l'intero valore; un segreto che contiene 'example' è bloccato", () => {
  assert.equal(secrets("appsettings.json", '{"Jwt": {"Key": "k3example9Qz7vLp0sT7wY"}}').code, 2);
  assert.equal(secrets("appsettings.json", '{"Jwt": {"Key": "example"}}').code, 0);
  assert.equal(secrets("docker-compose.yml", "POSTGRES_PASSWORD: ${DB_PASSWORD}\n").code, 0);
});

test("secrets: token JWT bloccato nei file di codice, consentito nei .md (documentazione)", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVP-mB92K27uhbUJU1p1r";
  assert.equal(secrets("src/Auth.cs", `var t = "${jwt}";`).code, 2);
  assert.equal(secrets("docs/esempio.md", `Esempio di token: ${jwt}`).code, 0);
});

test("secrets: Edit e MultiEdit controllano il nuovo testo", () => {
  assert.equal(editSecrets("appsettings.json", '"Token": "abcdef1234567890XYZ"').code, 2);
  const multi = run("guard-write.mjs", {
    tool_input: { file_path: "appsettings.json", edits: [{ old_string: "a", new_string: '"ApiKey": "9f8e7d6c5b4a39281706"' }] },
  });
  assert.equal(multi.code, 2);
});

