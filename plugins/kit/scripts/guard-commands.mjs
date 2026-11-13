#!/usr/bin/env node
// Hook PreToolUse su Bash e PowerShell: blocca (exit 2, motivo su stderr) i comandi che
// le regole vietano a Claude (core.md §6.11, git.md). Il blocco è assoluto: se serve
// davvero, il comando lo esegue l'utente (prefisso "!") oppure si disattiva l'hook.
// Sempre bloccati: git push --force (e varianti), cancellazione di branch remoti che non siano di lavoro
// (consentita solo per feature/, bugfix/, release/, hotfix/: mai main, develop o altro; la conferma dell'utente
// non è verificabile dall'hook ed è una regola scritta, vedi pr-main passo 10),
// git reset --hard, git clean -f,
// git commit con branch corrente main/develop (il messaggio dice a Claude di proporre un
// branch di lavoro da develop con una sola domanda, o di chiedere se creare develop se
// manca), qualunque --no-verify, rm -rf (e gli
// equivalenti PowerShell, es. Remove-Item -Recurse -Force), git add -A / --all / . (e i file sensibili: .env,
// secrets.json, chiavi e certificati), git commit con messaggio non Conventional Commits
// (git.md: tipo(scope): descrizione con tipo ammesso; letto da -m o da heredoc). Maiuscola, punto finale e
// lunghezza dell'oggetto restano regole scritte, non controllate dall'hook; git init non è bloccato (regola scritta).
// git tag (creazione): solo con nome X.Y.Z (senza v) e dal branch main (git.md, «Rilascio»); il via
// dell'utente non è verificabile dall'hook ed è una regola scritta. Sempre consentiti: git push (normale),
// elenco e cancellazione dei tag. gh pr create/merge e gh release
// create/delete/upload/edit passano solo se la GitHub CLI è installata sul PC: lo dice la riga
// «GitHub CLI (gh) installata» nel CLAUDE.md della radice del repository (git.md), scritta una volta
// per progetto dopo la domanda dell'utente. Fuori da un repository, vale il CLAUDE.md della cartella del comando.
// Senza riga, o con riga non valida, PR e rilasci sono bloccati (fail closed).
// Consentiti i comandi di sola lettura (git status/log/diff, git tag -l, gh pr view...).
// Il comando è cercato solo in posizione di comando: testo dentro virgolette, heredoc
// o commenti non conta (es. git commit -m "docs: git push" passa). Fail-open: input
// illeggibile o errore interno -> nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`.
// Richiede Node.js e, per il controllo del branch, git nel PATH.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const PROTECTED_BRANCHES = new Set(["main", "develop"]);
const WRAPPERS = new Set(["sudo", "command", "env", "time", "exec", "nohup", "call", "builtin", "nice"]);
const SHELLS = new Set(["bash", "sh", "zsh", "dash", "pwsh", "powershell", "cmd"]);
const REMOVERS = new Set(["rm", "rmdir", "remove-item", "ri", "del", "erase", "rd"]);
// File che non devono entrare nel repository (git.md, «Cosa non entra mai»). .env.example è consentito.
const SENSITIVE_PATH = /(^|[\\/])(\.env(\.(?!example$)[\w.-]+)?|secrets\.json)$|\.(pfx|p12|key|pem|jks)$/i;
// Branch remoti che si possono cancellare con git push --delete (git.md, «Branch»).
const WORK_BRANCH = /^(feature|bugfix|release|hotfix)\/\w[\w./-]*$/;
const COMMIT_TYPES = "feat|fix|refactor|perf|test|docs|build|ci|chore|revert";

const baseName = (text) => text.split(/[\\/]/).pop().replace(/\.exe$/i, "");
const isFlag = (t) => !t.quoted && t.text.startsWith("-");
// Flag corta che contiene la lettera `ch` (es. -f, -fu): `--long` non conta.
const shortHas = (t, ch) => !t.quoted && /^-[A-Za-z]+$/.test(t.text) && t.text.includes(ch);

// Riga della GitHub CLI (git.md, «Integrazione GitHub»). Formato fisso; la data è facoltativa.
// Una riga con altro formato non vale come «sì».
const GH_LINE = /^- \*\*GitHub CLI \(gh\) installata:\*\* (s[ìi]|no)(?: \(\d{4}-\d{2}-\d{2}\))?\s*$/im;

/** Radice del repository che contiene `dir`; se `dir` non è in un repository, `dir` stessa. */
function repoRoot(dir) {
  try {
    const top = execFileSync("git", ["-C", dir, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return top || dir;
  } catch {
    return dir;
  }
}

/** La GitHub CLI è dichiarata installata nel CLAUDE.md della radice del repository in `dir`. File assente o riga assente/malformata: no (fail closed). */
function ghInstalled(dir) {
  let text;
  try {
    text = readFileSync(path.join(repoRoot(dir), "CLAUDE.md"), "utf8");
  } catch {
    return false;
  }
  const m = GH_LINE.exec(text);
  return m ? /^s/i.test(m[1]) : false;
}

// Command text being analysed (set by check(); needed to read heredoc commit messages).
let source = "";

/** Removes heredoc bodies, keeping the line that opens them. */
function stripHeredocs(cmd) {
  return cmd.replace(
    /<<-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n[\s\S]*?\n[ \t]*\2[ \t]*(?=\n|$)/g,
    (m) => m.slice(0, m.indexOf("\n"))
  );
}

/** Splits a command line into segments of tokens {text, quoted}, honouring quotes and comments. */
function split(cmd) {
  const segments = [];
  let tokens = [];
  let cur = null;
  const endToken = () => {
    if (cur) tokens.push(cur);
    cur = null;
  };
  const endSegment = () => {
    endToken();
    if (tokens.length) segments.push(tokens);
    tokens = [];
  };
  let i = 0;
  while (i < cmd.length) {
    const c = cmd[i];
    if (c === "'") {
      cur ??= { text: "", quoted: false };
      cur.quoted = true;
      const j = cmd.indexOf("'", i + 1);
      const end = j < 0 ? cmd.length : j;
      cur.text += cmd.slice(i + 1, end);
      i = end + 1;
    } else if (c === '"') {
      cur ??= { text: "", quoted: false };
      cur.quoted = true;
      i++;
      while (i < cmd.length && cmd[i] !== '"') {
        if (cmd[i] === "\\" && (cmd[i + 1] === '"' || cmd[i + 1] === "\\")) {
          cur.text += cmd[i + 1];
          i += 2;
        } else {
          cur.text += cmd[i++];
        }
      }
      i++;
    } else if (c === "#" && !cur) {
      while (i < cmd.length && cmd[i] !== "\n") i++;
    } else if ("\n;|&()`{}".includes(c)) {
      endSegment();
      i++;
    } else if (c === " " || c === "\t" || c === "\r") {
      endToken();
      i++;
    } else {
      cur ??= { text: "", quoted: false };
      cur.text += c;
      i++;
    }
  }
  endSegment();
  return segments;
}

function currentBranch(dir) {
  try {
    return execFileSync("git", ["branch", "--show-current"], {
      cwd: dir,
      encoding: "utf8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function developExists(dir) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", "refs/heads/develop"], {
      cwd: dir,
      timeout: 3000,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

// Instruction for Claude when a commit is blocked on a protected branch (git.md: git flow with develop).
let blockHint = null;

function isForcedRecursiveRemove(args) {
  let recurse = false;
  let force = false;
  for (const t of args.filter(isFlag)) {
    const raw = t.text;
    if (raw === "--recursive") recurse = true;
    else if (raw === "--force") force = true;
    else if (/^-[A-Za-z]+$/.test(raw)) {
      const s = raw.slice(1);
      if (/^[rRf]+$/.test(s)) {
        if (/[rR]/.test(s)) recurse = true;
        if (s.includes("f")) force = true;
      } else {
        const lower = s.toLowerCase();
        if ("recurse".startsWith(lower)) recurse = true;
        if ("force".startsWith(lower)) force = true;
      }
    }
  }
  return recurse && force;
}

/** git add -A / --all / . aggiunge anche i file non voluti; un file sensibile non entra mai nel repository. */
function analyzeGitAdd(rest) {
  const paths = rest.filter((t) => !isFlag(t)).map((t) => t.text);
  const broad =
    rest.some((t) => !t.quoted && (t.text === "-A" || t.text === "--all")) || paths.some((p) => p === "." || p === "./" || p === ":/");
  if (broad) return "git add -A / --all o git add . (aggiungi i file per nome: git.md)";
  const sensitive = paths.find((p) => SENSITIVE_PATH.test(p));
  return sensitive ? `git add di un file sensibile (${sensitive}): segreti e chiavi non entrano nel repository (git.md)` : null;
}

/** Oggetto del messaggio di commit, se leggibile: heredoc (`cat <<'EOF'`), poi -m / --message / -m"...". */
function commitSubject(rest) {
  const heredoc = /<<-?\s*(['"]?)([A-Za-z_]\w*)\1[^\n]*\n([\s\S]*?)\n[ \t]*\2[ \t]*(?=\n|$)/.exec(source);
  if (heredoc) return heredoc[3].split("\n").find((line) => line.trim())?.trim() ?? null;
  const i = rest.findIndex((t) => !t.quoted && (t.text === "-m" || t.text === "--message"));
  if (i >= 0 && i + 1 < rest.length) return rest[i + 1].text.split("\n")[0].trim();
  const inline = rest.find((t) => /^-m./.test(t.text));
  return inline ? inline.text.slice(2).split("\n")[0].trim() : null;
}

/** Controllo Conventional Commits (git.md). Restituisce il problema, o null se il messaggio è valido o non leggibile. */
function analyzeCommitMessage(rest) {
  const subject = commitSubject(rest);
  if (!subject) return null;
  let problem = null;
  const m = new RegExp(`^(${COMMIT_TYPES})(\\([a-z0-9][a-z0-9._/-]*\\))?!?: (\\S.*)$`).exec(subject);
  if (!m) problem = `"${subject}" non segue tipo(scope): descrizione`;
  if (!problem) return null;
  blockHint =
    "Riscrivi il messaggio in inglese, Conventional Commits (git.md): tipo(scope): descrizione, minuscolo, senza punto finale, " +
    "oggetto di al massimo 72 caratteri; nel corpo spiega il perché.";
  return `messaggio di commit non conforme: ${problem}`;
}

// Opzioni di git tag che non creano un tag (elenco, cancellazione, verifica): sempre consentite.
const TAG_READ_FLAGS = new Set([
  "-l", "--list", "-d", "--delete", "-v", "--verify", "-n", "--contains", "--no-contains",
  "--merged", "--no-merged", "--points-at", "--sort", "--format", "--column", "--no-column",
]);
// Opzioni di git tag che consumano il valore successivo.
const TAG_VALUE_FLAGS = new Set(["-m", "--message", "-F", "--file", "-u", "--local-user", "--cleanup"]);

/** Creazione di un tag (git.md, «Rilascio»): nome X.Y.Z senza `v`, solo dal branch main (dopo il merge). */
function analyzeGitTag(rest, dir) {
  if (rest.some((t) => !t.quoted && (TAG_READ_FLAGS.has(t.text) || t.text.startsWith("--sort=") || t.text.startsWith("--format=")))) return null;
  let name = null;
  for (let k = 0; k < rest.length; k++) {
    if (!rest[k].quoted && TAG_VALUE_FLAGS.has(rest[k].text)) k++;
    else if (!isFlag(rest[k])) {
      name = rest[k].text;
      break;
    }
  }
  if (name === null) return null;
  if (!/^\d+\.\d+\.\d+$/.test(name)) {
    blockHint =
      "Il tag di rilascio ha il formato X.Y.Z, senza prefisso v (git.md, «Rilascio»), uguale alla versione nel file di versione e " +
      "nel CHANGELOG.md. Chiedi all'utente il via con UNA SOLA domanda prima di crearlo.";
    return `nome del tag "${name}" non nel formato X.Y.Z`;
  }
  const branch = currentBranch(dir);
  if (branch !== "main") {
    blockHint =
      "Il tag si crea solo dopo il merge su main, dal branch main e sul commit di merge (git.md, «Rilascio»). " +
      "Chiedi all'utente il via con UNA SOLA domanda dopo aver verificato il merge.";
    return `git tag dal branch "${branch || "sconosciuto"}" (git.md: il tag si crea solo da main, dopo il merge)`;
  }
  return null;
}

/**
 * Drops shell redirections (`2>`, `>file`, `2>>log`, `<in`): they are not arguments of the command. `2>&1`
 * reaches us as the token `2>` (the `&` ends the segment), and `> file` as an operator followed by its target.
 */
function stripRedirections(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.quoted || !/^\d*[<>]/.test(t.text)) {
      out.push(t);
    } else if (/^\d*(>>?|<)$/.test(t.text) && tokens[i + 1]) {
      i++;
    }
  }
  return out;
}

function analyzeGit(allArgs, cwd) {
  const args = stripRedirections(allArgs);
  let dir = cwd;
  let k = 0;
  while (k < args.length && isFlag(args[k])) {
    if (args[k].text === "-C" && k + 1 < args.length) {
      dir = path.resolve(dir, args[k + 1].text);
      k += 2;
    } else if (args[k].text === "-c") k += 2;
    else k += 1;
  }
  const sub = args[k]?.text;
  const rest = args.slice(k + 1);
  switch (sub) {
    case "push": {
      const positional = rest.filter((t) => !isFlag(t));
      const forced =
        rest.some(
          (t) =>
            !t.quoted &&
            (t.text === "--force" || t.text === "--force-if-includes" || t.text === "--mirror" ||
              t.text.startsWith("--force-with-lease") || shortHas(t, "f"))
        ) || positional.some((t) => t.text.startsWith("+"));
      if (forced) return "git push forzato (riscrive la storia remota)";
      const deletes =
        rest.some((t) => !t.quoted && (t.text === "--delete" || shortHas(t, "d"))) || positional.some((t) => t.text.startsWith(":"));
      if (deletes) {
        const refs = positional.slice(1).map((t) => t.text.replace(/^:/, ""));
        if (refs.length > 0 && refs.every((r) => WORK_BRANCH.test(r))) return null;
        blockHint =
          "Si cancellano solo branch remoti di lavoro (feature/, bugfix/, release/, hotfix/), mai main o develop, e solo dopo la " +
          "conferma dell'utente (pr-main, passo 10).";
        return "cancellazione di un branch remoto non ammesso (git push --delete o :branch)";
      }
      return null;
    }
    case "reset":
      return rest.some((t) => !t.quoted && t.text === "--hard") ? "git reset --hard" : null;
    case "clean":
      return rest.some((t) => !t.quoted && (t.text === "--force" || /^-[A-Za-z]*f[A-Za-z]*$/.test(t.text)))
        ? "git clean -f"
        : null;
    case "add":
      return analyzeGitAdd(rest);
    case "tag":
      return analyzeGitTag(rest, dir);
    case "commit": {
      const branch = currentBranch(dir);
      if (PROTECTED_BRANCHES.has(branch)) {
        blockHint = developExists(dir)
          ? "Non committare qui. Crea tu il branch di lavoro, senza chiedere conferma, nel formato tipo/descrizione-breve " +
            "(feature/, bugfix/ o release/ da develop; hotfix/ da main), con git switch -c, e committa lì."
          : 'Il branch "develop" non esiste ed è obbligatorio (git flow completo, git.md). Non partire da main. Chiedi all\'utente, ' +
            "con UNA SOLA domanda, se puoi crearlo da main (branch locale); dopo la risposta crea tu il branch di lavoro " +
            "(per esempio feature/nome-breve) a partire da develop, senza altre conferme.";
        return `git commit sul branch "${branch}" (git.md: mai commit diretti su main/develop)`;
      }
      return analyzeCommitMessage(rest);
    }
    default:
      return null;
  }
}

function analyzeGh(args, cwd) {
  const positional = [];
  for (let k = 0; k < args.length; k++) {
    if (!args[k].quoted && (args[k].text === "-R" || args[k].text === "--repo")) k++;
    else if (!isFlag(args[k])) positional.push(args[k].text);
  }
  const [area, action] = positional;
  if (area === "pr" && (action === "create" || action === "merge")) return { text: `gh pr ${action}`, gate: "gh", dir: cwd };
  if (area === "release" && ["create", "delete", "upload", "edit", "delete-asset"].includes(action))
    return { text: `gh release ${action}`, gate: "gh", dir: cwd };
  return null;
}

function analyzeSegment(tokens, cwd, depth) {
  let i = 0;
  while (i < tokens.length && !tokens[i].quoted && (/^[A-Za-z_]\w*=/.test(tokens[i].text) || WRAPPERS.has(tokens[i].text.toLowerCase()))) i++;
  if (i >= tokens.length) return null;
  const name = baseName(tokens[i].text).toLowerCase();
  const args = tokens.slice(i + 1);

  if (args.some((t) => !t.quoted && t.text === "--no-verify")) return "--no-verify (salto degli hook)";
  if (SHELLS.has(name)) {
    const idx = args.findIndex((t) => !t.quoted && /^(-c|-lc|-ic|-command|\/c|\/k)$/i.test(t.text));
    if (idx >= 0 && idx + 1 < args.length) {
      const inner = ["bash", "sh", "zsh", "dash"].includes(name)
        ? args[idx + 1].text
        : args.slice(idx + 1).map((t) => t.text).join(" ");
      return check(inner, cwd, depth + 1);
    }
    return null;
  }
  if (name === "eval") return check(args.map((t) => t.text).join(" "), cwd, depth + 1);
  if (name === "git") return analyzeGit(args, cwd);
  if (name === "gh") return analyzeGh(args, cwd);
  if (REMOVERS.has(name) && isForcedRecursiveRemove(args)) return "cancellazione ricorsiva forzata (rm -rf / Remove-Item -Recurse -Force)";
  return null;
}

function check(command, cwd, depth = 0) {
  if (depth > 3) return null;
  const outer = source;
  source = command;
  try {
    for (const tokens of split(stripHeredocs(command))) {
      const found = analyzeSegment(tokens, cwd, depth);
      if (!found) continue;
      if (typeof found === "string") return found;
      if (ghInstalled(found.dir)) continue;
      blockHint =
        "Chiedi all'utente, con UNA SOLA domanda, se su questo PC è installata la GitHub CLI (gh). Con la risposta scrivi nel " +
        "CLAUDE.md (sezione «Eccezioni alle regole globali») la riga «GitHub CLI (gh) installata: sì/no (AAAA-MM-GG)» (git.md). " +
        "Senza gh installata, PR e rilasci li esegue l'utente.";
      return `${found.text} richiede la GitHub CLI, non ancora registrata per questo progetto (git.md, «Integrazione GitHub»)`;
    }
    return null;
  } finally {
    source = outer;
  }
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  let reason = null;
  try {
    const input = JSON.parse(raw);
    const command = input?.tool_input?.command;
    if (typeof command === "string") reason = check(command, input.cwd || process.cwd());
  } catch {
    process.exit(0);
  }
  if (reason) {
    const tail = blockHint ?? "Le regole (core.md §6.11, git.md) vietano a Claude questa operazione: la esegue l'utente.";
    process.stderr.write(`Bloccato dall'hook guard-commands: ${reason}. ${tail}\n`);
    process.exit(2);
  }
  process.exit(0);
});
