---
description: Esegue il controllo di verifica di una soluzione .NET prima di dichiarare chiuso un lavoro: ripristino, build in Release, test, pacchetti vulnerabili, modifiche al modello EF senza migrazione e spazi bianchi. Riporta l'esito reale senza modificare file. Si lancia solo su richiesta.
argument-hint: [cartella-soluzione]
disable-model-invocation: true
---

# Verifica della soluzione .NET

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill esegue i controlli e riporta l'esito. Non corregge nulla: se un controllo fallisce, lo riporta con il dettaglio. Il ripristino dei pacchetti scrive nelle cartelle di build (`bin`, `obj`), ma non modifica il codice.

1. **Soluzione.** Cerca il file `.sln` nella cartella indicata o nella radice del repository. Se ce ne sono più di uno, chiedi una sola domanda: quale verificare.
2. **Ripristino.** Esegui il ripristino dei pacchetti della soluzione. Se fallisce, riporta l'errore e fermati: gli altri controlli non hanno senso senza pacchetti.
3. **Build.** Esegui la build in configurazione Release. Un avviso è un problema: `core.md` §4 richiede una build senza warning. Riporta ogni avviso con il file e la riga.
4. **Test.** Esegui i test della soluzione. Riporta il numero di test eseguiti, falliti e saltati. Un test saltato è segnalato, non ignorato (`core.md` §4).
5. **Pacchetti vulnerabili.** Esegui il controllo dei pacchetti vulnerabili, transitivi inclusi (`core.md` §3). Riporta ogni pacchetto con la sua gravità. Non aggiornare pacchetti da questa skill.
6. **Modello EF.** Se il progetto usa EF Core, verifica che il modello non abbia modifiche senza una migrazione corrispondente. Se lo strumento non è installato o non è disponibile, il controllo risulta «non verificato», non superato.
7. **Spazi bianchi.** Nelle modifiche non committate, controlla la presenza di spazi bianchi alla fine delle righe e di fine riga incoerenti (`git diff --check`). Se il repository non è git, il controllo risulta «non verificato».
8. **Esito.** Chiudi con un esito complessivo: «superata» solo se tutti i controlli sono passati, altrimenti «non superata», con l'elenco dei controlli falliti o non verificati.

Il gate non sostituisce i test di integrazione sul database di prova, che richiedono la connessione di prova (`backend-app.md` §4.5): se sono previsti, lo segnala come controllo non eseguito.

Riferimenti: `core.md` §0b, §3 e §4; `backend-app.md` §4.5.
