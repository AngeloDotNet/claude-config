---
description: Avvia un progetto nuovo. Fa in sequenza le domande di avvio del template, una per messaggio, e compila il CLAUDE.md del progetto con le risposte. Si lancia solo su richiesta, in una cartella di progetto vuota o appena creata.
model: haiku
argument-hint: [nome-progetto]
disable-model-invocation: true
---

# Avvio progetto

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio, mai elenchi di domande.

1. Leggi il file di avvio del template: `avvio-progetto.md`, nella cartella del template indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR` (in `_template/avvio-progetto.md`); è sempre la copia del template, la più aggiornata, non quella eventualmente copiata nel progetto da `/kit:copia-regole`. Se la variabile non è impostata o il file manca, dillo e fermati.
   Se nella radice del progetto esiste già un `CLAUDE.md`, non sovrascriverlo: poni una sola domanda (completare solo i campi ancora a segnaposto, partire da un modello nuovo salvando il vecchio come `CLAUDE.md.bak`, oppure fermarsi) e attendi la risposta.
2. Segui le domande di quel file nell'ordine indicato. Per ogni risposta registra il valore; non assumere nulla che l'utente non ha detto. Se è stato passato un nome progetto come argomento, usalo come valore proposto per i campi «Solution» e «Namespace radice» (da confermare, non da presumere) e non rifare quella domanda.
3. Quando hai tutte le risposte, mostra il riepilogo e chiedi conferma prima di scrivere.
   Prima di scrivere nel progetto, scrivi il piano di avvio in `PIANO.md` come descritto al §2b del file di avvio (`core.md` §6.15); se un `PIANO.md` con passi aperti esiste già, chiedi con una sola domanda se riprenderlo o sostituirlo.
4. Dopo l'ok, compila `CLAUDE.md` nella radice del progetto con le risposte, nei campi del modello. Non scrivere valori reali di segreti: solo segnaposto.
5. Segnala i moduli di regole da copiare: non copiarli qui, usa `/kit:copia-regole`.
6. Non creare commit e non modificare altri file (oltre a `CLAUDE.md` e `PIANO.md`).
