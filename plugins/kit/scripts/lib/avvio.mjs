// Sincronizzazione all'avvio della sessione (ADR 0004, #142). Spenta per default: parte solo per i
// progetti con `"sincronizzazione": true` nella loro voce di ~/.claude/kit-progetti.json, e solo a
// `startup` o `resume`. Riconosce il progetto del kit dal profilo dichiarato nel CLAUDE.md e da
// .claude/rules/core.md: un repository altrui con una propria .claude/rules/ non viene toccato.
// Il testo restituito va nel contesto di Claude (additionalContext del SessionStart). Fail-open:
// una eccezione non modifica nulla e non blocca l'avvio.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { loadState, projectKey, recordSnapshot, ruleFingerprints, saveState } from "./rules.mjs";
import { PROFILE_VALUE } from "./layout.mjs";
import { readConfig, repoRoot } from "./sito.mjs";
import { applica, pianifica } from "./sync.mjs";
import { templateDir } from "./template.mjs";

const SORGENTI = ["startup", "resume"];

/** La voce del progetto in configurazione chiede la sincronizzazione (default: no). */
export function sincronizzazioneAttiva(config, root) {
  const voce = config?.[projectKey(root)];
  return Boolean(voce && typeof voce === "object" && voce.sincronizzazione === true);
}

/** Progetto del kit: .claude/rules/core.md e un profilo dichiarato nel CLAUDE.md. */
export function riconosciutoDalKit(root) {
  try {
    const claude = path.join(root, "CLAUDE.md");
    return existsSync(path.join(root, ".claude", "rules", "core.md")) && existsSync(claude) && PROFILE_VALUE.test(readFileSync(claude, "utf8"));
  } catch {
    return false;
  }
}

/** Una domanda in sospeso, in una riga di testo per Claude. */
function descrivi(q) {
  const id = `[id: ${q.id}]`;
  switch (q.tipo) {
    case "nuovo-modulo":
      return `modulo nuovo «${q.modulo}» (${q.cartella}): ${q.descrizione || "nessuna descrizione"} ${id}`;
    case "fuori-posto":
      return `file fuori posto e modificato: ${q.da} (atteso in ${q.a}) ${id}`;
    case "rimosso-modificato":
      return `modulo rimosso dal template ma modificato nel progetto: ${q.chiave} ${id}`;
    default:
      return `file ${q.chiave} (${q.motivo === "primo-avvio" ? "primo avvio, diverso dal template" : "conflitto con il template"}) ${id}`;
  }
}

/**
 * Testo per Claude sulla sincronizzazione della sessione, o null se non c'è nulla da dire.
 * `config`, `now` e `template` si passano nei test; in uso sono quelli dell'ambiente.
 */
export function avvioSessione({ cwd, source, config = readConfig(), now = new Date(), template = templateDir() }) {
  if (!SORGENTI.includes(source)) return null;
  const root = repoRoot(cwd);
  if (!sincronizzazioneAttiva(config, root) || !riconosciutoDalKit(root)) return null;
  if (!template) {
    return "[Sincronizzazione delle regole non eseguita] La variabile KIT_CONFIG_TEMPLATE_DIR non è impostata: non posso leggere il template. Nessuna modifica. Segnalalo all'utente con una sola domanda: qual è il percorso del template?";
  }

  const piano = pianifica({ template, target: root });
  if (piano.stato !== "pronto") {
    // Con modifiche in corso il lavoro dell'utente ha la precedenza: silenzio, nessuna modifica.
    if (/modifiche non committate/.test(piano.motivo)) return null;
    return `[Sincronizzazione delle regole rimandata] ${piano.motivo}. Nessuna modifica.`;
  }

  const righe = [];
  const scrive = piano.scritture.length > 0 || piano.rimozioni.length > 0 || piano.registroCambia;
  if (scrive) {
    const esito = applica(piano, { target: root, now });
    if (esito.stato !== "applicata") {
      return `[Sincronizzazione delle regole non riuscita] ${esito.motivo}.`;
    }
    // Le regole già lette in questa sessione restano quelle di prima: si registra lo stato attuale,
    // così il controllo delle regole cambiate non chiede di rileggerle.
    const stato = loadState();
    recordSnapshot(stato, root, ruleFingerprints(root));
    saveState(stato);

    const file = [...esito.scritti, ...esito.rimossi.map((r) => `${r} (rimosso)`)];
    righe.push(
      `[Regole allineate al template v${piano.tag}] File: ${file.length ? file.join(", ") : "solo il registro"}.` +
        (esito.copieDiSalvataggio ? ` Copie di salvataggio in ${esito.copieDiSalvataggio}.` : "") +
        (esito.branch ? ` Lavoro su branch ${esito.branch}, nessun commit.` : ""),
    );
    righe.push("Le regole cambiate non si rileggono in questa sessione: chiedi all'utente di chiudere e riaprire Claude Code prima di lavorare.");
  }
  if (piano.domande.length) {
    righe.push(
      `[Domande in sospeso sulla sincronizzazione] ${piano.domande.map(descrivi).join("; ")}. ` +
        "Non applicare nulla senza risposta: ponile all'utente una alla volta, con una sola domanda per messaggio.",
    );
  }
  return righe.length ? righe.join("\n") : null;
}
