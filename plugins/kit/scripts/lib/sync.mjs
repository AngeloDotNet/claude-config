// Motore della sincronizzazione delle regole all'avvio (ADR 0004). Due funzioni:
//   pianifica({ template, target, now })  calcola il piano e non scrive nulla;
//   applica(piano, { target, now })       esegue le sole operazioni automatiche, con backup, lock e rollback.
// Le domande (conflitti, primo avvio, moduli nuovi, file fuori posto, regole personalizzate) non si
// applicano qui: il piano le restituisce e la skill le pone una alla volta (#143).
// Regole di decisione per ogni file gestito, confrontando il progetto con il template del tag:
//   uguale al template                      -> nessuna azione (se manca nel registro, si registra)
//   nel progetto manca il registro          -> domanda (primo avvio)
//   non modificato, template cambiato       -> aggiornamento automatico (con backup)
//   modificato, template invariato          -> si tiene la versione del progetto, senza domanda
//   modificato e template cambiato          -> domanda (conflitto), il file resta invariato
// Il registro indica solo lo stato precedente: un registro manomesso può far sembrare non modificato
// un file personalizzato, per questo ogni sovrascrittura ha prima la sua copia di salvataggio.

import { copyFileSync, existsSync, lstatSync, mkdirSync, openSync, closeSync, readFileSync, rmSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { git, gitState } from "./git.mjs";
import { releaseSource } from "./release.mjs";
import { impronta, leggiRegistro, scriviRegistro, REGISTRO } from "./registro.mjs";
import { DETAIL, EXTRA, PROFILE_VALUE, REFERENCE, RULES, expectedFolder, isManagedModule } from "./layout.mjs";

const LOCK = ".claude/kit-regole.lock";
const LOCK_SCADUTO_MS = 10 * 60 * 1000;
const GENERATA = [/^- \*\*Versione delle regole copiate:\*\*/, /^- \*\*Moduli rimossi o non attivati/];
const PREFISSO_VERSIONE = "- **Versione delle regole copiate:**";
const PREFISSO_MODULI = "- **Moduli rimossi o non attivati";

/** Percorso del progetto, rifiutato se esce dalla cartella o passa da un link simbolico. */
export function sicuro(target, relative) {
  if (typeof relative !== "string" || path.isAbsolute(relative) || relative.includes("\\") || relative.split("/").includes("..")) {
    throw new Error(`percorso non sicuro: ${relative}`);
  }
  const parti = relative.split("/");
  let cartella = target;
  for (const parte of parti.slice(0, -1)) {
    cartella = path.join(cartella, parte);
    if (existsSync(cartella) && lstatSync(cartella).isSymbolicLink()) throw new Error(`link simbolico nel percorso: ${relative}`);
  }
  const full = path.join(target, relative);
  if (existsSync(full) && lstatSync(full).isSymbolicLink()) throw new Error(`link simbolico: ${relative}`);
  return full;
}

/** Testo di un file del progetto, o null se non esiste. */
function leggi(target, relative) {
  const full = sicuro(target, relative);
  return existsSync(full) && statSync(full).isFile() ? readFileSync(full, "utf8") : null;
}

/** Chiavi in cui può trovarsi un modulo: rules, rules-optional e dettaglio. */
const posizioniModulo = (nome) => [RULES, EXTRA, DETAIL].map((f) => `${f}/${nome}.md`);

/**
 * Decisione per un file o una parte di CLAUDE.md, confrontando il progetto (`corrente`), il template
 * del tag (`desiderato`) e il registro (`voce`, { modello, progetto } o undefined).
 */
export function decidi(corrente, desiderato, voce) {
  if (corrente === null) return { azione: "assente" };
  const hc = impronta(corrente);
  const ht = impronta(desiderato);
  if (hc === ht) {
    const gia = voce && voce.modello === ht && voce.progetto === hc;
    return gia ? { azione: "nulla" } : { azione: "registra", voce: { modello: ht, progetto: hc } };
  }
  if (!voce) return { azione: "domanda", motivo: "primo-avvio" };
  const modificato = hc !== voce.progetto;
  const cambiato = ht !== voce.modello;
  if (!modificato) return cambiato ? { azione: "aggiorna", voce: { modello: ht, progetto: ht } } : { azione: "nulla" };
  return cambiato ? { azione: "domanda", motivo: "conflitto" } : { azione: "mantieni" };
}

/** Sezione «## Regole» senza le due righe generate dal kit, come testo confrontabile. */
function regoleConfrontabili(testo) {
  const righe = testo.replace(/\r\n/g, "\n").split("\n");
  const i = righe.findIndex((r) => /^## Regole\s*$/.test(r));
  if (i < 0) return null;
  let j = i + 1;
  while (j < righe.length && !/^## /.test(righe[j])) j++;
  return righe.slice(i + 1, j).filter((r) => !GENERATA.some((re) => re.test(r))).join("\n");
}

/** Riga di CLAUDE.md che inizia con il prefisso, o null. */
function rigaCon(testo, prefisso) {
  return testo.replace(/\r\n/g, "\n").split("\n").find((r) => r.startsWith(prefisso)) ?? null;
}

/** Sostituisce la prima riga che inizia con il prefisso, mantenendo i fine riga del testo. */
function sostituisciRiga(testo, prefisso, nuova) {
  const eol = testo.includes("\r\n") ? "\r\n" : "\n";
  const righe = testo.replace(/\r\n/g, "\n").split("\n");
  const k = righe.findIndex((r) => r.startsWith(prefisso));
  if (k < 0) return null;
  righe[k] = nuova;
  return righe.join(eol);
}

/** Versione e data di core.md nel testo del template, o null. */
function versioneCore(testo) {
  const v = /^>\s*Versione\s+(\d+(?:\.\d+)*)/m.exec(testo)?.[1];
  const d = /ultima revisione:\s*(\d{4}-\d{2}-\d{2})/.exec(testo)?.[1];
  return v && d ? { v, d } : null;
}

/** Piano che rifiuta la sincronizzazione senza scrivere nulla. */
const rifiuto = (motivo) => ({ stato: "rifiutato", motivo });

/**
 * Calcola il piano di sincronizzazione del progetto rispetto all'ultimo tag del template.
 * Nessuna scrittura: restituisce { stato: "pronto", scritture, rimozioni, domande, registro, ... }
 * oppure { stato: "rifiutato", motivo }.
 */
export function pianifica({ template, target }) {
  try {
    return calcola({ template, target });
  } catch (error) {
    return rifiuto(error.message);
  }
}

function calcola({ template, target }) {
  const fonte = releaseSource(template);
  if (fonte.errore) return rifiuto(fonte.errore);
  const moduli = fonte.moduli;

  const registroTesto = leggi(target, REGISTRO);
  const letto = leggiRegistro(registroTesto);
  if (letto.errore) return rifiuto(letto.errore);
  const registro = letto.registro;

  const claudeTesto = leggi(target, "CLAUDE.md");
  const profilo = claudeTesto ? PROFILE_VALUE.exec(claudeTesto)?.[1]?.toLowerCase() ?? null : null;
  if (!profilo) return rifiuto("CLAUDE.md senza profilo dichiarato: nessuna sincronizzazione, nessuno spostamento");

  const file = { ...registro.file };
  const scritture = [];
  const rimozioni = [];
  const domande = [];
  const trattate = new Set();
  const presenti = new Set(); // nomi dei moduli presenti nel progetto, in qualunque cartella

  const haAncora = (nome) => posizioniModulo(nome).some((k) => leggi(target, k) !== null);
  const applicabile = (m) => {
    switch (m.applicabilita) {
      case "sempre":
      case "profilo":
        return true;
      case "backend":
        return haAncora("backend");
      case "frontend":
        return haAncora("frontend");
      case "sicurezza-estesa":
        return (haAncora("security-avanzata") || haAncora("security-strutturato")) && (!m.richiedeBackend || haAncora("backend"));
      default:
        return false; // i moduli opzionali si attivano a mano: nessuna domanda
    }
  };

  /** Registra la decisione sul file e aggiorna il registro nel piano. */
  const gestisci = (chiave, da, testo, dove = chiave) => {
    trattate.add(chiave);
    const d = decidi(da, testo, file[chiave]);
    if (d.azione === "registra" || d.azione === "aggiorna") {
      file[chiave] = d.voce;
      if (d.azione === "aggiorna") scritture.push({ tipo: "file", chiave, azione: "aggiorna", testo });
    } else if (d.azione === "domanda") {
      domande.push({ tipo: "conflitto", chiave, motivo: d.motivo });
    }
    return d;
  };

  for (const m of moduli) {
    const nome = m.nome;
    const fullTesto = [`${RULES}/${nome}.md`, `${EXTRA}/${nome}.md`].map((k) => fonte.leggi(k)).find((t) => t !== null) ?? null;
    const breveTesto = m.versioneBreve ? fonte.leggi(m.versioneBreve) : null;
    if (fullTesto === null && breveTesto === null) continue; // il manifest nomina un file che il tag non ha
    const standardBreve = profilo === "standard" && Boolean(m.versioneBreve) && breveTesto !== null;
    const desiderato = standardBreve ? breveTesto : fullTesto;
    const presentiQui = posizioniModulo(nome).filter((k) => leggi(target, k) !== null);
    if (presentiQui.length) presenti.add(nome);

    if (m.applicabilita === "opzionale") {
      // Si attivano a mano: restano dove sono, aggiornati dal template.
      for (const k of presentiQui) gestisci(k, leggi(target, k), fullTesto);
      continue;
    }

    const attesa = `${expectedFolder(m, profilo)}/${nome}.md`;
    const corrente = leggi(target, attesa);
    if (corrente !== null) {
      gestisci(attesa, corrente, desiderato);
    } else {
      const fuori = presentiQui.find((k) => k !== `${DETAIL}/${nome}.md`);
      if (fuori) {
        // Il registro può avere la voce sotto il percorso vecchio: la si cerca per nome del modulo.
        const vecchia = posizioniModulo(nome).find((k) => file[k] !== undefined) ?? null;
        const testoFuori = leggi(target, fuori);
        const d = decidi(testoFuori, desiderato, vecchia ? file[vecchia] : undefined);
        trattate.add(fuori);
        if (d.azione === "aggiorna" || d.azione === "nulla" || d.azione === "registra") {
          const testoNuovo = d.azione === "aggiorna" ? desiderato : testoFuori;
          const voce = d.azione === "nulla" ? file[vecchia] : d.voce;
          if (vecchia) delete file[vecchia];
          file[attesa] = voce;
          trattate.add(attesa);
          scritture.push({ tipo: "sposta", da: fuori, a: attesa, testo: testoNuovo });
        } else if (d.azione === "domanda") {
          domande.push({ tipo: "fuori-posto", da: fuori, a: attesa, motivo: d.motivo });
        }
      } else if (applicabile(m) && !registro.moduli.rifiutati.includes(nome)) {
        domande.push({ tipo: "nuovo-modulo", modulo: nome, cartella: attesa, descrizione: m.descrizione ?? "" });
      }
    }
    if (standardBreve) {
      const dettaglio = `${DETAIL}/${nome}.md`;
      if (leggi(target, dettaglio) !== null) gestisci(dettaglio, leggi(target, dettaglio), fullTesto);
    }
  }

  // File di riferimento: solo quelli che il progetto ha già.
  for (const k of REFERENCE) {
    const corrente = leggi(target, k);
    const desiderato = fonte.leggi(k);
    if (corrente === null || desiderato === null) continue;
    gestisci(k, corrente, desiderato);
  }

  // Moduli gestiti che il template non ha più: rimozione automatica solo se non modificati.
  for (const k of Object.keys(registro.file)) {
    if (trattate.has(k)) continue;
    const corrente = leggi(target, k);
    if (corrente === null) {
      delete file[k];
    } else if (impronta(corrente) === registro.file[k].progetto) {
      rimozioni.push({ chiave: k });
      delete file[k];
    } else {
      domande.push({ tipo: "rimosso-modificato", chiave: k });
    }
  }

  // CLAUDE.md: la sezione «Regole» si cambia solo con un ok; le due righe generate si aggiornano da sole.
  let claudeNuovo = null;
  const claude = {};
  if (claudeTesto !== null) {
    const aggiornaParte = (parte, corrente, desiderato, forzaDomanda) => {
      const d = decidi(corrente, desiderato, registro.claudeMd[parte]);
      if (d.azione === "registra") claude[parte] = d.voce;
      if (d.azione === "aggiorna" && forzaDomanda) domande.push({ tipo: "conflitto", chiave: `CLAUDE.md:${parte}`, motivo: "conflitto" });
      else if (d.azione === "aggiorna") claude[parte] = d.voce;
      else if (d.azione === "domanda") domande.push({ tipo: "conflitto", chiave: `CLAUDE.md:${parte}`, motivo: d.motivo });
      return d;
    };

    const regoleTpl = fonte.leggi("CLAUDE.md");
    const regoleProgetto = regoleConfrontabili(claudeTesto);
    const regoleModello = regoleTpl ? regoleConfrontabili(regoleTpl) : null;
    if (regoleProgetto !== null && regoleModello !== null) aggiornaParte("regole", regoleProgetto, regoleModello, true);

    const core = fonte.leggi(`${RULES}/core.md`);
    const versione = core ? versioneCore(core) : null;
    const rigaVersione = rigaCon(claudeTesto, PREFISSO_VERSIONE);
    if (versione && rigaVersione !== null) {
      const nuova = `${PREFISSO_VERSIONE} \`core.md\` v${versione.v} del ${versione.d}`;
      const d = aggiornaParte("versione", rigaVersione, nuova, false);
      if (d.azione === "aggiorna") claudeNuovo = sostituisciRiga(claudeTesto, PREFISSO_VERSIONE, nuova);
    }

    const rigaModuli = rigaCon(claudeTesto, PREFISSO_MODULI);
    if (rigaModuli !== null) {
      // Si tiene il prefisso scritto dal progetto (fino a «:**»), e si cambia solo l'elenco.
      const fine = rigaModuli.indexOf(":**");
      const base = fine >= 0 ? rigaModuli.slice(0, fine + 3) : PREFISSO_MODULI;
      const mancanti = moduli.filter((m) => !presenti.has(m.nome)).map((m) => m.nome);
      const nuova = `${base} ${mancanti.length ? mancanti.join(" | ") : "nessuno"}`;
      const d = aggiornaParte("moduli", rigaModuli, nuova, false);
      if (d.azione === "aggiorna") claudeNuovo = sostituisciRiga(claudeNuovo ?? claudeTesto, PREFISSO_MODULI, nuova);
    }
  }

  const nuovoRegistro = {
    schema: 1,
    tag: fonte.tag,
    profilo,
    file,
    claudeMd: { ...registro.claudeMd, ...claude },
    moduli: { rifiutati: registro.moduli.rifiutati },
  };
  const registroCambia = registroTesto === null || scriviRegistro(nuovoRegistro) !== registroTesto;
  if (claudeNuovo !== null) scritture.push({ tipo: "claude", chiave: "CLAUDE.md", testo: claudeNuovo });

  const scrive = scritture.length > 0 || rimozioni.length > 0 || registroCambia;
  let branch = null;
  if (scrive) {
    const stato = gitState(target);
    if (!stato.versionata) return rifiuto("cartella non versionata: nessuna modifica (la sincronizzazione lavora solo su repository git)");
    // Con modifiche non committate la sincronizzazione aspetta il commit, su qualunque branch (decisione del 2026-11-28).
    if (stato.modificato) return rifiuto("modifiche non committate: sincronizzazione rimandata, nessuna modifica");
    if (stato.staccata) return rifiuto("HEAD staccata: nessuna modifica");
    if (stato.inCorso) return rifiuto("merge o rebase in corso: nessuna modifica");
    if (stato.branch === "main" || stato.branch === "develop") {
      if (!stato.haDevelop) return rifiuto("manca il branch develop: non creo il branch di lavoro, serve la tua risposta");
      branch = { nome: nomeLibero(target, `bugfix/kit-regole-${dataIso(new Date())}`), da: "develop" };
    }
  }

  return {
    stato: "pronto",
    tag: fonte.tag,
    profilo,
    scritture,
    rimozioni,
    domande,
    branch,
    registro: nuovoRegistro,
    registroCambia,
    testoRegistro: scriviRegistro(nuovoRegistro),
  };
}

/** Primo nome di branch libero: il nome di base, poi con -2, -3, ... (non si riusa né si cancella un branch esistente). */
function nomeLibero(repo, base) {
  for (let n = 1; ; n++) {
    const nome = n === 1 ? base : `${base}-${n}`;
    if (git(repo, ["rev-parse", "--verify", "--quiet", `refs/heads/${nome}`]) === null) return nome;
  }
}

const dataIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const stampa = (d) => `${dataIso(d)}-${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;

/** Lock di sincronizzazione: un solo processo alla volta; un lock più vecchio di 10 minuti è scaduto. */
function acquisisci(target, now) {
  const full = sicuro(target, LOCK);
  mkdirSync(path.dirname(full), { recursive: true });
  for (let tentativo = 0; tentativo < 2; tentativo++) {
    try {
      closeSync(openSync(full, "wx"));
      return full;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const eta = now.getTime() - statSync(full).mtimeMs;
      if (eta < LOCK_SCADUTO_MS) return null;
      unlinkSync(full);
    }
  }
  return null;
}

/** Scrittura di default di un file del progetto, con le cartelle create al bisogno. */
const scriviDefault = (full, testo) => {
  mkdirSync(path.dirname(full), { recursive: true });
  writeFileSync(full, testo);
};

/**
 * Applica il piano: backup delle copie che cambiano, poi scritture, rimozioni e registro. Se un passo
 * fallisce, le operazioni già fatte vengono annullate dall'originale salvato in memoria.
 * `scrivi` si può sostituire nei test per simulare un errore a metà.
 */
export function applica(piano, { target, now = new Date(), scrivi = scriviDefault } = {}) {
  if (piano.stato !== "pronto") return { stato: "non-applicata", motivo: piano.motivo };
  const lock = acquisisci(target, now);
  if (lock === null) return { stato: "non-applicata", motivo: "sincronizzazione già in corso in un'altra sessione" };
  try {
    if (piano.branch) {
      const ok = git(target, ["checkout", "-q", "-b", piano.branch.nome, piano.branch.da]);
      if (ok === null) return { stato: "non-applicata", motivo: `impossibile creare il branch ${piano.branch.nome}` };
    }

    // Operazioni in ordine: ogni voce sa come eseguirsi e come annullarsi.
    const operazioni = [];
    const versione = (chiave, testo) => {
      const full = sicuro(target, chiave);
      const originale = leggi(target, chiave);
      return {
        chiave,
        esegui: () => scrivi(full, testo),
        annulla: () => (originale === null ? rmSync(full, { force: true }) : writeFileSync(full, originale)),
      };
    };
    const rimuovi = (chiave) => {
      const full = sicuro(target, chiave);
      const originale = readFileSync(full, "utf8");
      return { chiave, esegui: () => rmSync(full), annulla: () => writeFileSync(full, originale) };
    };

    for (const s of piano.scritture) {
      if (s.tipo === "sposta") {
        operazioni.push(versione(s.a, s.testo));
        operazioni.push(rimuovi(s.da));
      } else {
        operazioni.push(versione(s.chiave, s.testo));
      }
    }
    for (const r of piano.rimozioni) operazioni.push(rimuovi(r.chiave));
    if (piano.registroCambia) operazioni.push(versione(REGISTRO, piano.testoRegistro));

    // Copie di salvataggio prima di toccare qualunque file.
    const cartella = path.join(target, ".claude", "kit-backup", stampa(now));
    const backupDi = [...new Set(operazioni.map((o) => o.chiave))].filter((k) => leggi(target, k) !== null);
    if (backupDi.length) {
      mkdirSync(cartella, { recursive: true });
      const gitignore = path.join(path.dirname(cartella), ".gitignore");
      if (!existsSync(gitignore)) writeFileSync(gitignore, "*\n");
      for (const k of backupDi) {
        const dove = path.join(cartella, ...k.split("/"));
        mkdirSync(path.dirname(dove), { recursive: true });
        copyFileSync(sicuro(target, k), dove);
      }
    }

    const fatte = [];
    try {
      for (const op of operazioni) {
        op.esegui();
        fatte.push(op);
      }
    } catch (error) {
      for (const op of fatte.reverse()) op.annulla();
      return { stato: "annullata", motivo: `errore durante la scrittura, nessuna modifica resta: ${error.message}` };
    }
    return {
      stato: "applicata",
      scritti: piano.scritture.map((s) => (s.tipo === "sposta" ? `${s.da} -> ${s.a}` : s.chiave)),
      rimossi: piano.rimozioni.map((r) => r.chiave),
      copieDiSalvataggio: backupDi.length ? path.relative(target, cartella).split(path.sep).join("/") : null,
      branch: piano.branch?.nome ?? null,
    };
  } finally {
    unlinkSync(lock);
  }
}
