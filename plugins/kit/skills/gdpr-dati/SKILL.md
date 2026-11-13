---
description: Revisiona un progetto backend rispetto ai principi del GDPR: minimizzazione dei dati, conservazione (backup e log di audit compresi), log senza dati personali, errori senza dettagli sensibili, cifratura, consenso, diritti degli interessati e risposta a una violazione. Non è consulenza legale. Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-progetto]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Dati personali nel backend (GDPR)

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill revisiona gli aspetti tecnici del trattamento dei dati personali nel backend. Non è consulenza legale: le basi giuridiche, la valutazione d'impatto e gli obblighi verso gli interessati si decidono con il titolare del trattamento. Le regole di base stanno in `security.md` («Dati e Segreti») e `core.md` §5.

1. **Mappa dei dati.** Individua i modelli e i campi che contengono dati personali (nome, email, indirizzo, identificativi, dati di pagamento, dati sanitari, geolocalizzazione). Se il progetto non lo dichiara, chiedi una sola domanda: quali categorie di dati personali tratta.
2. **Minimizzazione.** Per ogni campo verifica che serva a una finalità dichiarata. I DTO di richiesta accettano solo i campi necessari, e le risposte non espongono campi che il chiamante non usa.
3. **Conservazione.** Ogni tipo di dato ha un periodo di conservazione, scritto nel progetto. Alla scadenza il dato è cancellato o reso anonimo. Verifica che esista un processo o un job per farlo.
4. **Log.** I log non contengono dati personali né segreti. Un identificativo interno è preferibile a un'email o a un nome. I valori forniti dall'utente entrano nei log come parametri strutturati (`security-backend.md`, «Vulnerabilità applicative ricorrenti», voce «Log: injection e contenuto»).
5. **Errori.** Le risposte di errore verso il client non rivelano dettagli interni, come stack trace, nomi di tabelle o dati dell'utente.
6. **Cifratura e pseudonimizzazione.** I dati sensibili a riposo sono cifrati, o pseudonimizzati quando non serve riconoscere la persona. La cifratura usa algoritmi moderni (`security.md`, «Crittografia»).
7. **Password.** Solo hash lenti e moderni, con sale. Nessuna password in chiaro in alcun punto.
8. **Dati di test.** I test usano dati sintetici, mai copie di dati reali (`security.md`, «Dati e Segreti», voce «Dati di test»).
9. **Diritti degli interessati.** Il progetto prevede come soddisfare accesso, rettifica, cancellazione e portabilità. Verifica che esistano gli endpoint o i processi necessari, o che la loro assenza sia dichiarata nel `CLAUDE.md`.
10. **Backup e log di audit.** I dati personali sono anche nei backup: retention e RPO/RTO sono dichiarati nel `CLAUDE.md` e la cancellazione richiesta da un interessato ha un modo dichiarato di propagarsi (scadenza del backup, o ripristino seguito da nuova cancellazione). I log di audit sono di sola aggiunta (nessun `UPDATE` o `DELETE` dall'utente applicativo), con retention dichiarata e senza dati personali non necessari (`security.md`, «Dati e Segreti», voce «Log di sicurezza e allerta»).
11. **Consenso e preferenze.** Se c'è un frontend: il consenso (necessari, statistici, marketing) è salvato, revocabile in ogni momento e non carica script o risorse di terzi prima della scelta; tema, fuso orario e consenso stanno nel profilo o in una sede concordata (`frontend.md` §4.1 e §6).
12. **Violazione dei dati.** Esiste il runbook `docs/runbook-sicurezza.md` con i passi per una violazione di dati personali, compreso l'avviso al titolare, che notifica al Garante entro 72 ore, e chi decide e chi esegue (`security.md`, «Scansione dinamica, segnalazioni e risposta agli incidenti»). Se manca, è un rilievo.
13. **Segreti.** Nessun segreto nel codice, nel repository o nelle immagini: solo variabili d'ambiente valorizzate da `.env` (con Docker, `docker.md`, «Configurazione e segreti»).
14. **Esito.** Chiudi con un elenco per area (dati, API, log, conservazione, segreti, diritti), con il punto trovato, il file e la riga, e la gravità (bloccante, importante, suggerimento: `lavoro.md`, «Gravità dei rilievi»). Ricorda che l'esito tecnico non sostituisce il parere del titolare o di un consulente legale.

Riferimenti: `security.md` («Dati e Segreti», con le voci «Log di sicurezza e allerta» e «Dati di test»; «Scansione dinamica, segnalazioni e risposta agli incidenti»); `frontend.md` §6; `security-backend.md` («Vulnerabilità applicative ricorrenti»; «Chiavi e password (.NET)», per il punto 7); `core.md` §5; `docker.md` (se attivo).
