---
description: Revisiona un progetto backend rispetto ai principi del GDPR: minimizzazione dei dati, conservazione, log senza dati personali, errori senza dettagli sensibili, cifratura e diritti degli interessati. Non è consulenza legale. Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-progetto]
---

# Dati personali nel backend (GDPR)

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill revisiona gli aspetti tecnici del trattamento dei dati personali nel backend. Non è consulenza legale: le basi giuridiche, la valutazione d'impatto e gli obblighi verso gli interessati si decidono con il titolare del trattamento. Le regole di base stanno in `security.md` («Dati e Segreti») e `core.md` §5.

1. **Mappa dei dati.** Individua i modelli e i campi che contengono dati personali (nome, email, indirizzo, identificativi, dati di pagamento, dati sanitari, geolocalizzazione). Se il progetto non lo dichiara, chiedi una sola domanda: quali categorie di dati personali tratta.
2. **Minimizzazione.** Per ogni campo verifica che serva a una finalità dichiarata. I DTO di richiesta accettano solo i campi necessari, e le risposte non espongono campi che il chiamante non usa.
3. **Conservazione.** Ogni tipo di dato ha un periodo di conservazione, scritto nel progetto. Alla scadenza il dato è cancellato o reso anonimo. Verifica che esista un processo o un job per farlo.
4. **Log.** I log non contengono dati personali né segreti. Un identificativo interno è preferibile a un'email o a un nome. I valori forniti dall'utente entrano nei log come parametri strutturati (`security.md`, «Log»).
5. **Errori.** Le risposte di errore verso il client non rivelano dettagli interni, come stack trace, nomi di tabelle o dati dell'utente.
6. **Cifratura e pseudonimizzazione.** I dati sensibili a riposo sono cifrati, o pseudonimizzati quando non serve riconoscere la persona. La cifratura usa algoritmi moderni (`security.md`, «Crittografia»).
7. **Password.** Solo hash lenti e moderni, con sale. Nessuna password in chiaro in alcun punto.
8. **Dati di test.** I test usano dati sintetici, mai copie di dati reali (`core.md` §4).
9. **Diritti degli interessati.** Il progetto prevede come soddisfare accesso, rettifica, cancellazione e portabilità. Verifica che esistano gli endpoint o i processi necessari, o che la loro assenza sia dichiarata nel `CLAUDE.md`.
10. **Segreti.** Nessun segreto nel codice, nel repository o nelle immagini: solo variabili d'ambiente valorizzate da `.env` (`docker.md`, «Configurazione e segreti»).
11. **Esito.** Chiudi con un elenco per area (dati, API, log, conservazione, segreti, diritti), con il punto trovato, il file e la riga, e la gravità. Ricorda che l'esito tecnico non sostituisce il parere del titolare o di un consulente legale.

Riferimenti: `security.md` («Dati e Segreti», «Log di sicurezza»); `core.md` §5; `docker.md`; `backend.md` §7.
