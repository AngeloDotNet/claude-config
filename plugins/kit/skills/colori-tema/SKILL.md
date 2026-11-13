---
description: Costruisce o verifica la palette di un progetto con token semantici per i temi chiaro e scuro, e controlla il contrasto sui valori resi. Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-progetto]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Colori del tema

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill costruisce o verifica la palette del progetto. Il vincolo obbligatorio (niente colori fissi nei componenti, token CSS, multi-tema) sta in `frontend.md` §3 e §4.1: qui si applica la procedura.

1. Leggi i token esistenti: le variabili CSS in `:root` e nel tema scuro, e i colori usati nei componenti. Se non ci sono token, chiedi una sola domanda: colore primario e sfondo di partenza.
2. Assegna a ogni colore un ruolo: sfondo, superficie, bordo, testo, testo secondario, azione primaria, azione secondaria, stato (errore, avviso, successo), focus. I token si nominano per ruolo (per esempio `--color-text-muted`), mai per tinta (per esempio `--blue-500`) nei componenti.
3. Costruisci per ogni tinta una scala di passi. Ogni passo ha una funzione, e non si aggiungono passi per sfumature che nessun ruolo usa. Il tema chiaro e il tema scuro usano la stessa tinta, con passi scelti per la stessa funzione.
4. Un colore, un significato: se due ruoli usano lo stesso valore, verifica che il significato sia lo stesso; altrimenti separa i token.
5. Misura il contrasto sui valori resi, in ogni coppia del tema chiaro e del tema scuro, dopo overlay e trasparenze:
   - testo normale: almeno 4,5:1 (WCAG 2.2, 1.4.3);
   - testo grande (almeno 24 px, oppure 18,66 px in grassetto): almeno 3:1 (WCAG 2.2, 1.4.3);
   - bordi di componenti, icone funzionali, indicatori di stato e contorno di focus: almeno 3:1 contro lo sfondo adiacente (WCAG 2.2, 1.4.11).
   **Metodo di calcolo** (non stimare a occhio; se hai Node, esegui il calcolo con un breve script nella cartella temporanea della sessione):
   - valore reso: se il colore ha trasparenza, componi canale per canale sullo sfondo reale, `c = α·primo piano + (1 − α)·sfondo`, in sRGB 0-255; token con `color-mix()`, `oklch()` o altre notazioni si convertono prima in sRGB; un valore letto da `getComputedStyle` è già reso;
   - luminanza relativa: per ogni canale `s = c / 255`, poi `lineare = s ≤ 0,04045 ? s / 12,92 : ((s + 0,055) / 1,055)^2,4`; `L = 0,2126·R + 0,7152·G + 0,0722·B`;
   - rapporto: `(L chiaro + 0,05) / (L scuro + 0,05)`, arrotondato per difetto a un decimale (4,49 non passa 4,5).
   Se non puoi leggere i valori resi (per esempio uno sfondo con immagine), dillo e segna la coppia «non verificabile» invece di dare un rapporto inventato.
6. Il colore non è l'unico segnale: ogni stato (errore, avviso, successo) ha anche un testo o un'icona (WCAG 2.2, 1.4.1).
7. Gradienti: dichiara lo spazio di interpolazione (per esempio `in oklch`). Verifica il contrasto nei punti del gradiente su cui sta del testo.
8. Chiudi con una tabella delle coppie: ruolo, tema, colore di primo piano, colore di sfondo, rapporto, soglia, esito. Le coppie che non passano restano segnalate, con il valore più vicino che passa la soglia, da confermare con l'utente prima di cambiarlo.

Riferimenti: `frontend.md` §3 e §4.1; WCAG 2.2, criteri 1.4.1, 1.4.3 e 1.4.11.
