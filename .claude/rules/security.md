# Sicurezza (OWASP Top 10 / ASVS come riferimento)

> Versione 2.6 — ultima revisione: 2026-11-22. Resta qui solo «Dati e Segreti» e «Regola operativa»; il resto è in `security-avanzata.md` (profili standard e strutturato).

> Richiede `core.md`. Questo file contiene i principi di sicurezza sempre attivi. Le sezioni su autenticazione, protezione dell'API, abuso di risorse, vulnerabilità applicative e upload sono in `security-backend.md` (caricato sui file backend); la sezione Frontend è in `security-frontend.md` (caricato sui file Angular).
> **Fonti e versioni di riferimento (verificate il 2026-11-04):** OWASP Top 10 2025 (A01 Broken Access Control … A10 Mishandling of Exceptional Conditions) e OWASP ASVS 5.0.0 (maggio 2025, capitoli V1–V17; mappa in «Mappa ASVS 5.0 e livelli»). Quando escono versioni nuove, si rivedono le regole prima di aggiornare questa riga.
> **Livello ASVS:** il livello di OWASP ASVS cui il progetto tende (1, 2 o 3) si **chiede a ogni progetto**, senza default, e si registra nel `CLAUDE.md` (campo "Livello ASVS"). Le regole di questo file sono la base comune; un livello più alto può richiedere controlli in più, che Claude propone e non introduce di iniziativa.

Le sezioni «Mappa ASVS 5.0 e livelli», «Progettazione sicura e fail closed», «Crittografia», «Mobile (sezione minima)», «Supply chain», «Scansione dinamica, segnalazioni e risposta agli incidenti» e «Test di sicurezza automatici» stanno in `security-avanzata.md`, con gli stessi titoli (profili standard e strutturato).

## Dati e Segreti
▲ Verificato dal plugin `kit`: hook `guard-secrets` (valori reali in `appsettings*.json`, password in chiaro in compose e Dockerfile, chiavi PEM, token JWT bloccati) e `check-quality` (avvisi).
- Data Protection di ASP.NET Core e hashing delle password: regole in `security-backend.md`, «Chiavi e password (.NET)».
- Rotazione dei segreti: i segreti hanno una data di scadenza o rotazione dichiarata nel `CLAUDE.md` di progetto; un segreto compromesso o finito per errore nel repository si considera bruciato e va sostituito, non solo rimosso.
- Nessun segreto nel repository: User Secrets in sviluppo; in produzione variabili d'ambiente valorizzate da `.env` fuori dal repository (mai servizi cloud a pagamento come Azure Key Vault o AWS Secrets Manager).
- **Database e canali interni:** il database si raggiunge con connessione cifrata e certificato verificato (SQL Server `Encrypt=True` con `TrustServerCertificate=False`; PostgreSQL `SslMode=VerifyFull`); se il server usa un certificato proprio, la CA fidata si concorda per progetto (host gestito dall'utente). Utente applicativo senza DDL e utente separato per le migrazioni: vedi `backend-app.md` §4.4. Redis e RabbitMQ richiedono sempre autenticazione (segreti da variabili d'ambiente valorizzate da `.env`) e non espongono porte sull'host in produzione (con Docker, `docker.md`); se il traffico esce dalla rete interna del compose, passa su TLS. Nessun servizio interno (database, cache, broker, pannelli di gestione) è raggiungibile da Internet.
- Le password non sono mai in chiaro, né nei log.
- Dati personali: minimizzazione, cifratura dei campi sensibili, retention e diritto all'oblio (GDPR).
- Dati di test: mai dati reali di produzione in sviluppo o test; usa dati sintetici o anonimizzati.
- Backup e ripristino: backup automatici del database con ripristino testato periodicamente. RPO/RTO e retention si dichiarano nel `CLAUDE.md` di progetto; con Docker, gli artefatti di backup sono descritti in `docker.md`.
- Log di sicurezza: registra login riusciti e falliti, lockout, cambi di ruolo/permessi, accessi negati (401/403) e modifiche a dati critici; il contenuto dei messaggi segue la regola «Log: injection e contenuto» (vedi «Vulnerabilità applicative ricorrenti»).
- **Log di sicurezza e allerta** (OWASP Top 10 2025, A09 «Security Logging and Alerting Failures»; il livello degli alert è una scelta del kit):
  - **Eventi riconoscibili:** gli eventi di sicurezza hanno un nome stabile (es. `AuthLoginFailed`, `AuthLockout`, `AccessDenied`, `RoleChanged`, `RateLimited`, `RefreshTokenReuse`) e proprietà strutturate (utente, IP, risorsa, esito, `traceId`), così si filtrano e si contano senza interpretare il testo.
  - **Alert minimi:** picchi di 401/403/429 rispetto al normale, lockout ripetuti, cambi di ruolo o permessi, riuso di un refresh token, errori 5xx in aumento. Le soglie si concordano per progetto.
  - **Per livelli:** (1) progetto piccolo senza stack di osservabilità: solo log strutturati con gli eventi sopra, e nel `CLAUDE.md` chi li controlla e con quale frequenza; (2) con lo stack self-hosted di `osservabilita.md`: regole di alert in Grafana/Prometheus sugli stessi eventi, con un canale di notifica scelto dall'utente. Lo stack non si impone ai progetti piccoli.
  - **Integrità e retention:** i log di audit non sono modificabili dall'applicazione che li scrive (sola aggiunta; nessun utente applicativo con `UPDATE` o `DELETE` sulle tabelle di audit); la retention si dichiara nel `CLAUDE.md` e tiene conto del GDPR, evitando dati personali non necessari.
  - **Test:** un integration test verifica che login fallito, accesso negato e cambio di ruolo producano l'evento atteso, senza dati personali né segreti.

## Regola operativa
- Se il codice richiesto introduce un rischio (es. disabilitare CORS o la validazione), Claude lo segnala prima di procedere.
- **Security review prima della consegna:** per ogni funzionalità che tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali, Claude esegue la skill `/security-review` sulle modifiche e riporta i risultati nella consegna. Le modifiche solo cosmetiche o di documentazione ne sono escluse. Un problema trovato si corregge in un commit `fix(security)` a sé (vedi `git.md`) o si segnala all'utente se la correzione esula dal compito.
