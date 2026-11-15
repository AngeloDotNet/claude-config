#!/usr/bin/env node
// Comando /kit:modelli (skill omonima): stampa il log dei modelli della sessione indicata.
// Uso: node modelli.mjs <id-sessione> | node modelli.mjs --file <registro.jsonl>
// Sola lettura. Fail-open: senza registro stampa un messaggio e termina con exit 0.

import { findTranscript, modelLog, readModelRows } from "./lib/modelli.mjs";

try {
  const [first, second] = process.argv.slice(2);
  const file = first === "--file" ? second : findTranscript(first);
  if (!file) {
    console.log("Registro della sessione non trovato: non posso dire quali modelli sono stati usati.");
  } else {
    console.log(modelLog(readModelRows(file), { totals: true }));
  }
} catch {
  console.log("Registro della sessione non leggibile: non posso dire quali modelli sono stati usati.");
}
