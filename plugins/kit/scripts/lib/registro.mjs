// Registro della sincronizzazione `.claude/kit-regole.json`: per ogni file gestito, l'impronta della
// versione del template all'ultima sincronizzazione (`modello`) e quella del file nel progetto dopo
// la sincronizzazione (`progetto`). Non contiene percorsi locali né dati personali: solo impronte,
// il tag e il profilo. Un registro malformato non viene usato: il chiamante non modifica nulla.

import { createHash } from "node:crypto";
import path from "node:path";
import { PROFILES, REFERENCE, isManagedModule } from "./layout.mjs";

export const REGISTRO = ".claude/kit-regole.json";
const HASH = /^[0-9a-f]{64}$/;
const RELEASE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PARTI_CLAUDE = ["regole", "versione", "moduli"];
const NOME_MODULO = /^[a-z0-9][a-z0-9-]*$/;

/** Impronta SHA-256 del testo, con fine riga normalizzati a LF. */
export function impronta(text) {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

/** Registro vuoto: primo avvio, nessuna impronta nota. */
export function registroVuoto() {
  return { schema: 1, tag: null, profilo: null, file: {}, claudeMd: {}, moduli: { rifiutati: [] } };
}

/** Chiave di file sicura: relativa, normalizzata, dentro le cartelle gestite. */
function chiaveValida(key) {
  if (typeof key !== "string" || key.startsWith("/") || key.includes("\\") || key.includes("..")) return false;
  if (path.posix.normalize(key) !== key) return false;
  return REFERENCE.includes(key) || isManagedModule(key);
}

const voceValida = (v) => v && typeof v === "object" && HASH.test(v.modello) && HASH.test(v.progetto);

/**
 * Legge il testo del registro e lo convalida. Restituisce { registro } oppure { errore }.
 * `testo` è null se il file non esiste: in quel caso è il primo avvio.
 */
export function leggiRegistro(testo) {
  if (testo === null) return { registro: registroVuoto() };
  let r;
  try {
    r = JSON.parse(testo);
  } catch {
    return { errore: "il registro .claude/kit-regole.json non è JSON valido" };
  }
  if (!r || typeof r !== "object" || Array.isArray(r)) return { errore: "il registro non è un oggetto" };
  if (r.schema !== 1) return { errore: "versione di schema del registro non supportata" };
  if (r.tag !== null && !(typeof r.tag === "string" && RELEASE.test(r.tag))) return { errore: "tag del registro non valido" };
  if (r.profilo !== null && !PROFILES.includes(r.profilo)) return { errore: "profilo del registro non valido" };
  if (!r.file || typeof r.file !== "object" || Array.isArray(r.file)) return { errore: "registro: sezione file non valida" };
  for (const [key, voce] of Object.entries(r.file)) {
    if (!chiaveValida(key)) return { errore: `registro: percorso non ammesso: ${key}` };
    if (!voceValida(voce)) return { errore: `registro: impronte non valide per ${key}` };
  }
  if (!r.claudeMd || typeof r.claudeMd !== "object") return { errore: "registro: sezione claudeMd non valida" };
  for (const [key, voce] of Object.entries(r.claudeMd)) {
    if (!PARTI_CLAUDE.includes(key)) return { errore: `registro: parte di CLAUDE.md non ammessa: ${key}` };
    if (!voceValida(voce)) return { errore: `registro: impronte non valide per la parte ${key}` };
  }
  const rifiutati = r.moduli?.rifiutati;
  if (!Array.isArray(rifiutati) || !rifiutati.every((n) => typeof n === "string" && NOME_MODULO.test(n))) {
    return { errore: "registro: elenco dei moduli rifiutati non valido" };
  }
  return { registro: { schema: 1, tag: r.tag, profilo: r.profilo, file: r.file, claudeMd: r.claudeMd, moduli: { rifiutati } } };
}

/** Testo stabile del registro (chiavi ordinate, due spazi, fine riga LF). */
export function scriviRegistro(registro) {
  const ordina = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  const pronto = {
    schema: 1,
    tag: registro.tag,
    profilo: registro.profilo,
    file: ordina(registro.file),
    claudeMd: ordina(registro.claudeMd),
    moduli: { rifiutati: [...registro.moduli.rifiutati].sort() },
  };
  return JSON.stringify(pronto, null, 2) + "\n";
}
