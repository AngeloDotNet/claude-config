# Documentazione: README, changelog, ADR e commenti (versione standard)

> Versione 1.0 — ultima revisione: 2026-11-23.
> Versione breve per il profilo `standard`, estratto di `core.md` §5b. Il testo completo è in `.claude/rules-optional/dettaglio/documentazione.md`, da leggere su richiesta.

- **Lingua:** quella dichiarata nel `CLAUDE.md` per README e CHANGELOG; nomi di file, identificatori ed endpoint restano nella forma originale.
- **README.md:** creato e aggiornato a ogni passo che cambia comportamento, configurazione o struttura. Contiene almeno titolo, cosa fa, avvio rapido, configurazione senza valori segreti e struttura del progetto.
- **CHANGELOG.md:** creato e aggiornato a ogni passo del piano. Giorni più recenti in alto, con un titolo `## AAAA-MM-GG` per giorno; per ogni intervento una sottosezione `### titolo breve` senza numeri di issue o PR, con le etichette in grassetto **Perché:**, **Cosa:** o **Dove:**, **Verifica:** ed eventualmente **Note:**. Le voci obsolete si racchiudono in un commento HTML.
- **Rilascio:** solo una sottosezione `### Rilascio X.Y.Z` nel titolo del giorno del rilascio, con **Aggiunto:**, **Modificato:**, **Corretto:**, **Sicurezza:** solo quando servono.
- **ADR:** per ogni scelta che devia dalle regole, un file breve in `docs/adr/NNNN-titolo.md` con contesto, decisione e conseguenze. Claude propone di scriverlo.
- **Commenti XML** (`<summary>`) in inglese su tipi e membri pubblici, esclusi i membri ovvi. Commenti nel codice solo per il perché, non per il cosa.
- **Sito di documentazione esterno:** se esiste, si aggiorna solo la pagina che descrive ciò che è cambiato, senza pubblicarlo senza conferma.
