---
description: Revisiona e corregge l'accessibilità di un'interfaccia web rispetto a WCAG 2.2: tastiera, focus, nomi accessibili, form e errori, annunci dinamici, contrasto e movimento. Riporta i problemi per gravità. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-componente]
disable-model-invocation: true
---

# Accessibilità dell'interfaccia

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill applica i requisiti di `frontend.md` §3 (WCAG 2.2 AA) con la procedura di revisione. Ogni problema si collega a un criterio WCAG 2.2 o a una pratica dell'ARIA Authoring Practices Guide.

1. **Ambito.** Individua i componenti o le pagine da revisionare. Se l'ambito non è chiaro, chiedi una sola domanda.
2. **Verifica automatica.** Se il progetto ha uno strumento di verifica (per esempio axe-core nei test E2E, `frontend.md` §10), eseguilo e riporta i risultati. Lo strumento trova solo una parte dei problemi: il resto richiede la verifica manuale.
3. **Elementi nativi.** Usa per primi i controlli nativi (`button`, `a`, `input`, `select`). Un ruolo ARIA aggiunto a un elemento nativo è una segnalazione, a meno che non sia necessario.
4. **Stati disabilitati.** Un controllo disabilitato è reso non disponibile davvero (WCAG 2.2, 4.1.2), non solo visivamente.
5. **Tastiera e focus.** Ogni funzione è raggiungibile e utilizzabile con la tastiera (2.1.1). Il focus è visibile (2.4.7) e non è coperto da altri elementi (2.4.11). Nei dialog il focus resta dentro il dialog e torna all'elemento che l'ha aperto (2.1.2, ARIA APG).
6. **Area di tocco.** I controlli hanno un'area di tocco minima (2.5.8).
7. **Nomi e form.** Ogni controllo ha un nome accessibile e un'etichetta visibile associata (4.1.2, 3.3.2). Gli errori di un form sono indicati vicino al campo e annunciati (3.3.1, 4.1.3).
8. **Annunci dinamici.** I contenuti che cambiano senza un'azione dell'utente (notifiche, esiti di salvataggio, risultati di ricerca) si annunciano con una regione live appropriata (4.1.3).
9. **Colore e contrasto.** Il colore non è l'unico segnale (1.4.1). Il contrasto rispetta le soglie della skill `colori-tema`.
10. **Movimento e tempo.** Le animazioni rispettano la preferenza di movimento ridotto (2.3.3). Nessun contenuto necessario scade da solo (2.2.1).
11. **Immagini e struttura.** Le immagini hanno un testo alternativo per lo scopo (1.1.1). Titoli e punti di riferimento descrivono la struttura della pagina (1.3.1, 2.4.1).
12. **Zoom.** Il contenuto regge lo zoom e il ridimensionamento del testo (1.4.4, 1.4.10). La skill `localizzazione` tratta il layout con testi più lunghi.
13. **Priorità.** Ogni problema ha una gravità: critico (blocca l'uso), grave (ostacola l'uso), moderato (degrada l'esperienza). I critici si correggono per primi.
14. **Esito.** Chiudi con l'elenco dei problemi per gravità, con file e riga, il criterio WCAG collegato e la correzione proposta. Le modifiche si applicano con una richiesta separata, e la verifica manuale con tastiera e lettore di schermo resta da fare.

Riferimenti: `frontend.md` §3 e §10; WCAG 2.2; ARIA Authoring Practices Guide.
