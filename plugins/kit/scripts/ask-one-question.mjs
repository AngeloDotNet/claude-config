#!/usr/bin/env node
// Hook UserPromptSubmit: reinserisce a ogni messaggio dell'utente il promemoria
// della regola inviolabile di core.md ("nel dubbio, una domanda alla volta").
// Lo stdout di un hook UserPromptSubmit viene aggiunto al contesto di Claude.
// Registrato in hooks/hooks.json del plugin `kit`. Richiede Node.js.
// Il testo qui sotto va tenuto allineato a core.md.

const reminder = `[Regola inviolabile, sempre attiva] Se hai un dubbio, un'ambiguità o più strade ragionevoli, NON decidere in autonomia e NON procedere per assunzione: fermati, poni UNA SOLA domanda (anche con AskUserQuestion: una domanda per chiamata, mai più insieme) e attendi la risposta prima di fare altro che ne dipenda. Dettagli: core.md, sezione in testa e §6 punto 5. Prima di modificare codice tieni il piano in PIANO.md (con le conclusioni dell'analisi); i problemi trovati lavorando vanno in CHECKLIST.md senza interrompere il lavoro (core.md §6 punti 20-22).`;

process.stdout.write(reminder + "\n");
