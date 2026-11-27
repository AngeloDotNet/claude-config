# Sicurezza strutturata: ASVS, scansione, dati dettagliati

> Versione 1.6 — ultima revisione: 2026-11-27.
> Richiede `security.md`, `security-avanzata.md` e `core.md`. Contiene le sezioni solo del profilo `strutturato`: threat model, ASVS, scansione dinamica, test di sicurezza automatici e dati e segreti dettagliati. Supply chain, rotazione dei segreti e connessione al database stanno in `security-avanzata.md`, che si carica anche nel profilo `standard`. Caricato solo nel profilo `strutturato`; nei profili `standard` e `mini` sta in `.claude/rules-optional/`.

## Threat model
- **Threat model leggero per le funzionalità sensibili:** prima di scrivere codice per una funzionalità che tocca autenticazione, dati personali, upload o integrazioni con servizi esterni, Claude redige un breve ADR in `docs/adr/` (formato di `core.md` §5b) con: asset da proteggere, attori (anonimo, utente, altro utente, amministratore, servizio esterno), abuse case (come un attore ostile userebbe la funzionalità: enumerazione, abuso di risorse, accesso ai dati altrui, replay) e mitigazione di ciascuno con il test che la verifica. Una pagina basta; non si scrive per modifiche che non toccano questi temi. L'ADR è un passo del piano (`core.md` §6, punto 15) e si approva con l'utente prima del codice.


## Mappa ASVS 5.0 e livelli
Fonte: OWASP ASVS 5.0.0 (maggio 2025), 17 capitoli. La tabella dice dove cercare e cosa il kit aggiunge per livello; non sostituisce il testo dell'ASVS, che si consulta per il livello scelto (note di verifica in `docs/fonti.md`). Le sezioni «Autenticazione e Autorizzazione» (con la voce «Completamenti dell'autenticazione»), «Protezione dell'API», «Abuso di risorse», «Vulnerabilità applicative ricorrenti» e «Upload e parsing di file» sono in `security-backend.md`; «Frontend» è in `frontend.md` §9.

| Capitolo ASVS | Dove nelle regole |
|---|---|
| V1 Encoding and Sanitization | «Vulnerabilità applicative ricorrenti» (injection, XSS, log) |
| V2 Validation and Business Logic | «Protezione dell'API» (input), «Abuso di risorse», `backend-app.md` §4.3 |
| V3 Web Frontend Security | «Frontend», header e CSP in «Protezione dell'API» |
| V4 API and Web Service | «Protezione dell'API», «Configurazione e superficie esposta» (webhook) |
| V5 File Handling | «Upload e parsing di file» |
| V6 Authentication | «Autenticazione e Autorizzazione» (voce «Completamenti dell'autenticazione») |
| V7 Session Management | cookie, sessioni e logout in «Autenticazione e Autorizzazione» |
| V8 Authorization | endpoint protetti, anti-IDOR, `backend-app.md` §4.6 |
| V9 Self-contained Tokens | JWT (punto 3b: validazione, algoritmi, claim) |
| V10 OAuth and OIDC | provider esterno (punto 4), Authorization Code + PKCE |
| V11 Cryptography | «Crittografia»; hashing delle password in `security-backend.md`, «Chiavi e password (.NET)» |
| V12 Secure Communication | HTTPS, HSTS, «Database e canali interni» (`security-avanzata.md`) |
| V13 Configuration | «Dati e Segreti (dettaglio)», «Configurazione e superficie esposta», «Supply chain» (`security-avanzata.md`) |
| V14 Data Protection | «Dati e Segreti (dettaglio)» (backup, `no-store`), «Database, rotazione e dati personali» (`security-avanzata.md`) |
| V15 Secure Coding and Architecture | «Progettazione sicura e fail closed», «Supply chain» (`security-avanzata.md`) |
| V16 Security Logging and Error Handling | «Log di sicurezza e allerta», voce «Errori» (`security-backend.md`), fail closed |
| V17 WebRTC | nessuna regola: se il progetto lo usa, si chiede e si scrive una regola dedicata |

**Cosa cambia con il livello** (scelta del kit, proposta e mai introdotta di iniziativa, `core.md` §6.18):
- **Livello 1:** le regole di questo file sono la base comune.
- **Livello 2 (in più):** i controlli opzionali diventano da proporre sempre (MFA per tutti gli utenti con dati sensibili, ri-autenticazione per azioni sensibili, sessioni revocabili, DAST con ZAP in CI, alert su Grafana).
- **Livello 3 (in più):** quanto sopra come obbligo, Argon2id come deroga da valutare, revisione di sicurezza del progetto da parte di una persona diversa dall'autore e controlli sulla build (provenienza attestata, build riproducibile dove possibile).


## Scansione dinamica, segnalazioni e risposta agli incidenti
(Scelte del kit; OWASP ZAP è Apache-2.0.)
- **DAST con OWASP ZAP baseline (opzionale):** scansione passiva contro un'istanza di prova avviata in CI (mai produzione), con report salvato come artefatto. Il progetto la attiva se ha un ambiente avviabile in CI e lo annota nel `CLAUDE.md`; i falsi positivi si gestiscono in un file di regole versionato, ognuno con il motivo, non si ignora l'intera scansione. Le action o le immagini usate sono fissate come in «Supply chain». Claude scrive il workflow; l'esecuzione è dell'utente.
- **`SECURITY.md`:** nella root di ogni progetto, con come segnalare una vulnerabilità (canale privato, per esempio il reporting privato di GitHub o un indirizzo email), versioni supportate, tempi di risposta attesi e divieto di aprire issue pubbliche per falle non corrette. Contatti e tempi li fornisce l'utente: Claude non li inventa.
- **Runbook minimo** in `docs/runbook-sicurezza.md`, breve e senza segreti, con i passi per: segreto trapelato (considerarlo bruciato, ruotarlo, verificare gli accessi, poi la pulizia della cronologia, come in `git-flusso.md`); account compromesso (revoca di sessioni e token, reset delle credenziali, controllo dei log di sicurezza, avviso al titolare); dipendenza vulnerabile (aggiornare o segnalare, `core.md` §3); violazione di dati personali (avviso al titolare del trattamento: il GDPR prevede la notifica al Garante entro 72 ore). Chi decide e chi esegue lo indica l'utente.


## Test di sicurezza automatici
Si scrivono nel progetto `IntegrationTests` (vedi `backend-app.md` §4.5) e fanno fallire la build; le voci su autenticazione e autorizzazione valgono solo se il progetto le prevede.
- **Endpoint protetti di default:** un test enumera gli endpoint e verifica che senza credenziali rispondano 401, tranne una lista esplicita di endpoint `AllowAnonymous` motivati; un nuovo endpoint pubblico fa fallire il test finché non viene dichiarato nella lista.
- **Ruoli e policy:** per ogni endpoint con ruolo o policy, un test con un utente senza il permesso (403) e uno con il permesso (successo).
- **Proprietà e tenant:** regola e test in `backend-app.md` §4.6 (database di prova e isolamento: §4.5).
- **Frontend:** test sul rendering di input ostili (payload XSS mostrati come testo, mai interpretati); header di sicurezza e CSP verificati sulla risposta reale (test lato server o E2E). Le regole generali dei test frontend sono in `frontend.md` e `qualita.md` §4.
- **Header e CORS:** un test verifica la presenza degli header di sicurezza sulle risposte e che CORS accetti solo le origini in whitelist.
- **Fail closed:** un test rende irraggiungibile o fallimentare la dipendenza da cui dipende un controllo (servizio di autorizzazione, provider, cache) e verifica che la richiesta sia negata e non servita; un altro avvia l'app con una configurazione di sicurezza a segnaposto in un ambiente non di sviluppo e verifica che l'avvio fallisca.
- **File ostili:** per ogni endpoint di upload, test con file di tipo falsificato (estensione e contenuto in contrasto), nome con percorso o doppia estensione, file oltre i limiti, archivio con voci che escono dalla cartella o con rapporto di compressione eccessivo, SVG con script e XML con entità esterne; esito atteso: rifiuto controllato (400, 413 o 422 con `ProblemDetails`), mai file salvato o elaborato.
- **Host ostile:** per ogni flusso che genera link assoluti (reset password, conferma email, inviti), un test invia una richiesta con `Host` e `X-Forwarded-Host` falsificati e verifica che il link generato usi solo il valore di configurazione.



## Dati e Segreti (dettaglio)
▲ Verificato dal plugin `kit`: hook `guard-secrets` (valori reali in `appsettings*.json`, password in chiaro in compose e Dockerfile, chiavi PEM, token JWT bloccati) e `check-quality` (avvisi).
- Data Protection di ASP.NET Core e hashing delle password: regole in `security-backend.md`, «Chiavi e password (.NET)».
- Nessun segreto nel repository: User Secrets in sviluppo; in produzione variabili d'ambiente valorizzate da `.env` fuori dal repository (mai servizi cloud a pagamento come Azure Key Vault o AWS Secrets Manager).
- Le password non sono mai in chiaro, né nei log.
- Dati di test: mai dati reali di produzione in sviluppo o test; usa dati sintetici o anonimizzati.
- Backup e ripristino: backup automatici del database con ripristino testato periodicamente. RPO/RTO e retention si dichiarano nel `CLAUDE.md` di progetto; con Docker, gli artefatti di backup sono descritti in `docker.md`.
- Log di sicurezza: registra login riusciti e falliti, lockout, cambi di ruolo/permessi, accessi negati (401/403) e modifiche a dati critici; il contenuto dei messaggi segue la regola «Log: injection e contenuto» (vedi «Vulnerabilità applicative ricorrenti»).
- **Log di sicurezza e allerta** (OWASP Top 10 2025, A09 «Security Logging and Alerting Failures»; il livello degli alert è una scelta del kit):
  - **Eventi riconoscibili:** gli eventi di sicurezza hanno un nome stabile (es. `AuthLoginFailed`, `AuthLockout`, `AccessDenied`, `RoleChanged`, `RateLimited`, `RefreshTokenReuse`) e proprietà strutturate (utente, IP, risorsa, esito, `traceId`), così si filtrano e si contano senza interpretare il testo.
  - **Alert minimi:** picchi di 401/403/429 rispetto al normale, lockout ripetuti, cambi di ruolo o permessi, riuso di un refresh token, errori 5xx in aumento. Le soglie si concordano per progetto.
  - **Per livelli:** (1) progetto piccolo senza stack di osservabilità: solo log strutturati con gli eventi sopra, e nel `CLAUDE.md` chi li controlla e con quale frequenza; (2) con lo stack self-hosted di `osservabilita.md`: regole di alert in Grafana/Prometheus sugli stessi eventi, con un canale di notifica scelto dall'utente. Lo stack non si impone ai progetti piccoli.
  - **Integrità e retention:** i log di audit non sono modificabili dall'applicazione che li scrive (sola aggiunta; nessun utente applicativo con `UPDATE` o `DELETE` sulle tabelle di audit); la retention si dichiara nel `CLAUDE.md` e tiene conto del GDPR, evitando dati personali non necessari.
  - **Test:** un integration test verifica che login fallito, accesso negato e cambio di ruolo producano l'evento atteso, senza dati personali né segreti.


