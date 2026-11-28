#!/usr/bin/env node
// Hook UserPromptSubmit: unisce due controlli che aggiungono testo al contesto di Claude a ogni messaggio.
// Lo stdout di un hook UserPromptSubmit viene aggiunto al contesto di Claude.
// - ask-one-question: ricorda la regola inviolabile di core.md ("nel dubbio, una domanda alla volta").
//   Il testo qui sotto va tenuto allineato a core.md. Sulla stessa riga, solo nei progetti con il kit e
//   con un profilo diverso da `mini`, richiama il piano e le issue (core.md §6.15c; ADR 0001).
// - rules-watch: confronta le impronte di CLAUDE.md e .claude/rules/*.md con quelle salvate in
//   ~/.claude/session-rules-state.json. Se qualcosa è cambiato
//   durante la sessione (per esempio dopo un `git pull`), ordina di rileggere i file cambiati e allega
//   il `git diff` dei soli file cambiati, calcolato dall'hash di HEAD salvato. Una volta per sessione
//   confronta anche le regole del progetto con quelle del template (KIT_CONFIG_TEMPLATE_DIR, vedi
//   lib/template.mjs). Non copia nulla e non obbliga Claude a rileggere.
// - plugin-version (lib/plugin-version.mjs): una volta per sessione e progetto, in ogni progetto,
//   segnala se il template ha una versione del plugin `kit` più recente di quella in esecuzione.
// - site-question (core.md §5b, lib/sito.mjs): finché la voce `sito` di ~/.claude/kit-progetti.json
//   manca o dice `esiste: false` senza `chiesto`, chiede a Claude di domandare se esiste una wiki.
// Ogni controllo è isolato: una sezione che fallisce non nasconde l'altra. Fail-open: nessun blocco.
//
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.

import { headKey, loadState, projectKey, recordSnapshot, ruleFingerprints, rulesDiff, saveState } from "./lib/rules.mjs";
import { templateSection } from "./lib/template.mjs";
import { pluginVersionSection } from "./lib/plugin-version.mjs";
import { readConfig, repoRoot, siteQuestion } from "./lib/sito.mjs";
import { riconosciutoDalKit, sincronizzazioneAttiva } from "./lib/avvio.mjs";
import { projectProfile, projectUsesKit } from "./lib/text.mjs";

const REMINDER = `[Regola inviolabile, sempre attiva] Se hai un dubbio, un'ambiguità o più strade ragionevoli, NON decidere in autonomia e NON procedere per assunzione: fermati, poni UNA SOLA domanda (anche con AskUserQuestion: una domanda per chiamata, mai più insieme) e attendi la risposta prima di fare altro che ne dipenda. Dettagli: core.md, sezione in testa e §6 punto 5.`;

const PLAN_REMINDER = ` Per il lavoro non piccolo (workflow.md §6 punto 15c) tieni il piano nella issue padre, con le conclusioni dell'analisi, prima di modificare codice; i problemi trovati lavorando diventano issue senza interrompere il lavoro (workflow.md §6 punti 20-22).`;

/** Promemoria di una sola riga: la parte su piano e issue solo dove il profilo la prevede. */
function reminder(cwd) {
  const root = repoRoot(cwd);
  return projectUsesKit(root) && projectProfile(root) !== "mini" ? REMINDER + PLAN_REMINDER : REMINDER;
}

// `state` è lo stato letto una sola volta da main: le sezioni lo modificano, main lo salva.
function rulesChangedSection(cwd, state) {
  const current = ruleFingerprints(cwd);
  if (!Object.keys(current).length) return null;
  const key = projectKey(cwd);
  const previous = state[key];
  if (!previous || typeof previous !== "object") {
    recordSnapshot(state, cwd, current); // prima volta: solo registrazione
    return null;
  }

  const changed = Object.keys(current).filter((f) => previous[f] !== current[f]);
  const removed = Object.keys(previous).filter((f) => !(f in current));
  if (!changed.length && !removed.length) return null;

  // Il diff si calcola prima di aggiornare lo stato: parte dall'hash di HEAD salvato.
  const diff = rulesDiff(cwd, state[headKey(cwd)], [...changed, ...removed]);
  recordSnapshot(state, cwd, current);

  let text = "[Regole cambiate durante la sessione]";
  if (changed.length) {
    text += ` Prima di rispondere rileggi con Read questi file, perché contengono regole nuove o modificate: ${changed.join(", ")}.`;
  }
  if (removed.length) text += ` File di regole rimossi: ${removed.join(", ")}.`;
  if (diff) text += `\n\nDifferenze rispetto all'ultima registrazione (git diff):\n${diff}`;
  return text;
}

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const parts = [REMINDER];
  try {
    let cwd = process.cwd();
    let sessionId = "";
    try {
      const input = JSON.parse(raw);
      cwd = input?.cwd || cwd;
      sessionId = typeof input?.session_id === "string" ? input.session_id : "";
    } catch {
      // stdin non JSON: si usa la cartella corrente
    }
    try {
      parts[0] = reminder(cwd);
    } catch {
      // resta la sola regola della domanda unica
    }
    const state = loadState();
    const before = JSON.stringify(state);
    // Con la sincronizzazione attiva l'avviso sul template lo dà già l'hook SessionStart (lib/avvio.mjs).
    const sincronizzata = (() => {
      try {
        const root = repoRoot(cwd);
        return sincronizzazioneAttiva(readConfig(), root) && riconosciutoDalKit(root);
      } catch {
        return false;
      }
    })();
    for (const section of [() => rulesChangedSection(cwd, state), () => (sincronizzata ? null : templateSection(cwd, sessionId, state)), () => pluginVersionSection(cwd, sessionId, state), () => siteQuestion(cwd)]) {
      try {
        const text = section();
        if (text) parts.push(text);
      } catch {
        // una sezione che fallisce non deve nascondere l'altra
      }
    }
    if (JSON.stringify(state) !== before) saveState(state);
  } catch {
    // fail-open: resta il promemoria
  }
  process.stdout.write(parts.join("\n\n") + "\n");
});
