---
description: Avvia un progetto nuovo in un solo percorso. Fa in sequenza le domande di avvio del template, una per messaggio, copia le regole nel progetto e compila il CLAUDE.md con le risposte. Si lancia solo su richiesta, in una cartella di progetto vuota o appena creata.
model: sonnet
argument-hint: [nome-progetto]
disable-model-invocation: true
---

# Avvio progetto

Rispondi in italiano. Una sola domanda per messaggio, mai elenchi di domande.

1. Leggi il file di avvio del template: `avvio-progetto.md`, nella cartella del template indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR` (in `_template/avvio-progetto.md`); è sempre la copia del template, la più aggiornata, non quella eventualmente copiata nel progetto da `/kit:regole`. Se la variabile non è impostata o il file manca, dillo e fermati.
   Se nella radice del progetto esiste già un `CLAUDE.md`, non sovrascriverlo: poni una sola domanda (completare solo i campi ancora a segnaposto, partire da un modello nuovo salvando il vecchio come `CLAUDE.md.bak`, oppure fermarsi) e attendi la risposta.
2. Segui le domande di quel file nell'ordine indicato al §1 («Ordine»): prima se il progetto è solo Git, poi, se non lo è, la domanda 0 (il profilo) e le altre. Per ogni risposta registra il valore; non assumere nulla che l'utente non ha detto. Se è stato passato un nome progetto come argomento, usalo come valore proposto per i campi «Solution» e «Namespace radice» (da confermare, non da presumere) e non rifare quella domanda.
3. Quando hai tutte le risposte, mostra il riepilogo e chiedi conferma prima di scrivere.
   **Con il profilo `mini`** il piano resta nella chat: basta questa conferma, senza issue né repository remoto su GitHub.
   Con `standard`, `strutturato` o solo Git, prima di scrivere nel progetto scrivi il piano di avvio come issue padre con le sub-issue, come descritto al §2b del file di avvio (`core.md` §6.15). Il progetto deve avere il repository remoto su GitHub: se manca, fermati e chiedi all'utente di crearlo (non lo crei tu). Se esiste già una issue padre di avvio aperta, chiedi con una sola domanda se riprenderla o sostituirla.
   La conferma del riepilogo vale per tutto l'avvio (eccezione del §2b del file di avvio): esegui i passi di seguito, senza chiedere un ok a ogni punto, e chiudi le sub-issue man mano che completi i passi. Se un passo fallisce, fermati e lascia aperta la sua sub-issue.
4. **Copia delle regole**, dopo l'ok. Se il progetto non ha `.claude/rules/`, leggi `../regole/SKILL.md` (rispetto alla cartella di questa skill) ed esegui il **caso A** sulla cartella corrente, senza che l'utente debba lanciare `/kit:regole`. Usa le risposte già date (solo Git, profilo, backend, frontend, regole di sicurezza estese, flusso per entità per `feature-workflow.md`, `NuGet.config` ed `.editorconfig`) e **non rifare quelle domande**. `backend-email.md` e `backend-infra.md` non si chiedono all'avvio (§2 del file di avvio): non includerli. Chiedi, una per volta, solo ciò che le risposte non coprono (per esempio `.gitignore` e `.gitattributes`). Se il progetto ha già `.claude/rules/`, non copiare nulla: dillo e indica `/kit:regole` per allinearle.
5. Compila `CLAUDE.md` nella radice del progetto con le risposte, nei campi del modello (la copia del passo 4 lo crea dal template se manca; un file preesistente si tratta come deciso al passo 1). Compila anche la sezione «Regole» in base ai moduli copiati, la riga «Versione delle regole copiate» e quella dei moduli non attivati. Non scrivere valori reali di segreti: solo segnaposto.
6. **Chiusura.** Riepiloga file copiati e campi compilati o rimasti a segnaposto. Di' all'utente di aprire una sessione nuova nel progetto (o usare `/clear`) e di controllare con `/context` che le regole siano caricate: non servono altri comandi o frasi di avvio.
7. Non creare commit e non modificare file oltre a quelli dei passi 4 e 5; il piano vive nella issue padre (con `mini` nella chat), non in un file.
