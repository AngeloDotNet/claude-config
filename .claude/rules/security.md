# Sicurezza (OWASP Top 10 / ASVS come riferimento)

> Versione 2.3 — ultima revisione: 2026-11-13.

> Richiede `core.md`. Questo file contiene i principi di sicurezza sempre attivi. Le sezioni su autenticazione, protezione dell'API, abuso di risorse, vulnerabilità applicative e upload sono in `security-backend.md` (caricato sui file backend); la sezione Frontend è in `security-frontend.md` (caricato sui file Angular).
> **Fonti e versioni di riferimento (verificate il 2026-11-04):** OWASP Top 10 2025 (A01 Broken Access Control … A10 Mishandling of Exceptional Conditions) e OWASP ASVS 5.0.0 (maggio 2025, capitoli V1–V17; mappa in «Mappa ASVS 5.0 e livelli»). Quando escono versioni nuove, si rivedono le regole prima di aggiornare questa riga.
> **Livello ASVS:** il livello di OWASP ASVS cui il progetto tende (1, 2 o 3) si **chiede a ogni progetto**, senza default, e si registra nel `CLAUDE.md` (campo "Livello ASVS"). Le regole di questo file sono la base comune; un livello più alto può richiedere controlli in più, che Claude propone e non introduce di iniziativa.

## Mappa ASVS 5.0 e livelli
Fonte: OWASP ASVS 5.0.0 (maggio 2025), 17 capitoli, elenco dei titoli letto il 2026-11-04 su `github.com/OWASP/ASVS/tree/v5.0.0/5.0/en`. Il livello di ogni singolo requisito (L1/L2/L3) non è stato letto requisito per requisito: la tabella dice dove cercare e cosa il kit aggiunge per livello, non sostituisce il testo dell'ASVS, che si consulta per il livello scelto. Le sezioni «Autenticazione e Autorizzazione», «Completamenti dell'autenticazione», «Protezione dell'API», «Abuso di risorse», «Vulnerabilità applicative ricorrenti» e «Upload e parsing di file» sono in `security-backend.md`; «Frontend» è in `security-frontend.md`.

| Capitolo ASVS | Dove nelle regole |
|---|---|
| V1 Encoding and Sanitization | «Vulnerabilità applicative ricorrenti» (injection, XSS, log) |
| V2 Validation and Business Logic | «Protezione dell'API» (input), «Abuso di risorse», `backend-app.md` §4.3 |
| V3 Web Frontend Security | «Frontend», header e CSP in «Protezione dell'API» |
| V4 API and Web Service | «Protezione dell'API», «Configurazione e superficie esposta» (webhook) |
| V5 File Handling | «Upload e parsing di file» |
| V6 Authentication | «Autenticazione e Autorizzazione», «Completamenti dell'autenticazione» |
| V7 Session Management | cookie, sessioni e logout in «Autenticazione e Autorizzazione» |
| V8 Authorization | endpoint protetti, anti-IDOR, `backend-app.md` §4.6 |
| V9 Self-contained Tokens | JWT (punto 3b: validazione, algoritmi, claim) |
| V10 OAuth and OIDC | provider esterno (punto 4), Authorization Code + PKCE |
| V11 Cryptography | «Crittografia»; hashing delle password in `security-backend.md`, «Chiavi e password (.NET)» |
| V12 Secure Communication | HTTPS, HSTS, «Database e canali interni» |
| V13 Configuration | «Dati e Segreti», «Configurazione e superficie esposta», «Supply chain» |
| V14 Data Protection | «Dati e Segreti» (dati personali, backup, `no-store`) |
| V15 Secure Coding and Architecture | «Progettazione sicura e fail closed», «Supply chain» |
| V16 Security Logging and Error Handling | «Log di sicurezza e allerta», voce «Errori» (`security-backend.md`), fail closed |
| V17 WebRTC | nessuna regola: se il progetto lo usa, si chiede e si scrive una regola dedicata |

**Cosa cambia con il livello** (scelta del kit, proposta e mai introdotta di iniziativa, `core.md` §6.18):
- **Livello 1:** le regole di questo file sono la base comune.
- **Livello 2 (in più):** i controlli opzionali diventano da proporre sempre (MFA per tutti gli utenti con dati sensibili, ri-autenticazione per azioni sensibili, sessioni revocabili, threat model ADR per ogni funzionalità sensibile, DAST con ZAP in CI, alert su Grafana).
- **Livello 3 (in più):** quanto sopra come obbligo, Argon2id come deroga da valutare, revisione di sicurezza del progetto da parte di una persona diversa dall'autore e controlli sulla build (provenienza attestata, build riproducibile dove possibile).

## Progettazione sicura e fail closed
(OWASP Top 10 2025: A06 «Insecure Design» e A10 «Mishandling of Exceptional Conditions».)
- **Threat model leggero per le funzionalità sensibili:** prima di scrivere codice per una funzionalità che tocca autenticazione, dati personali, upload o integrazioni con servizi esterni, Claude redige un breve ADR in `docs/adr/` (formato di `core.md` §5b) con: asset da proteggere, attori (anonimo, utente, altro utente, amministratore, servizio esterno), abuse case (come un attore ostile userebbe la funzionalità: enumerazione, abuso di risorse, accesso ai dati altrui, replay) e mitigazione di ciascuno con il test che la verifica. Una pagina basta; non si scrive per modifiche che non toccano questi temi. L'ADR è un passo del piano (`core.md` §6, punto 15) e si approva con l'utente prima del codice.
- **Fail closed:** quando un controllo non può dare un esito (eccezione, timeout, servizio di autorizzazione o dipendenza non raggiungibile, configurazione mancante o non valida), il default è **negare**, mai concedere. Un errore nel codice di autorizzazione o di validazione produce 401, 403 o 5xx con `ProblemDetails`, non l'accesso. Un `catch` non trasforma un errore di sicurezza in un successo. Una configurazione di sicurezza mancante o ancora a segnaposto in un ambiente non di sviluppo impedisce l'avvio (`ValidateOnStart`).
- **Eccezioni e stato coerente:** le eccezioni non previste non lasciano operazioni a metà (transazione o compensazione) né informazioni nella risposta (vedi la voce «Errori» in `security-backend.md`, «Vulnerabilità applicative ricorrenti»); i timeout e i limiti sulle chiamate verso l'esterno sono sempre impostati.

## Crittografia
- **Solo API crittografiche moderne e non obsolete.** Vietati: MD5, SHA-1, DES/3DES, RC2, RC4, modalità ECB, `RijndaelManaged`, cifratura RSA con padding PKCS#1 v1.5, `Rfc2898DeriveBytes` con costruttori senza hash esplicito, `Random` per token, chiavi o segreti.
- **Consentiti:** AES-GCM, SHA-256/384/512, HMAC-SHA2, ECDSA ed RSA-PSS, PBKDF2 tramite `Rfc2898DeriveBytes.Pbkdf2` con hash esplicito, `RandomNumberGenerator` per ogni valore casuale sensibile.
- **Eccezione SHA-1/HMAC-SHA1:** ammessi solo dove il protocollo li impone, per esempio HMAC-SHA1 nel TOTP (RFC 6238, spesso il default delle app di autenticazione), mai per hash di password, firme o integrità. L'uso va motivato in un commento e, se non è nel TOTP del framework, annotato nel `CLAUDE.md`; il divieto resta per ogni altro caso.
- Gli analyzer di sicurezza di Roslyn segnalano gli usi vietati e fanno fallire la build: `AnalysisLevel` e `AnalysisMode` impostati in `Directory.Build.props` (per esempio `AnalysisLevel` all'ultima versione e `AnalysisMode` `Recommended`) e le regole di sicurezza (`CA5350`, `CA5351`, `CA5358`, `CA5379`, `CA5390`, `CA5403`, `CA2100`, `CA5369`, `CA5372`, `CA2300`–`CA2302`) a severità `error` nell'`.editorconfig` del template. `CA5394` (casualità non sicura) è a `warning`, non `error`, e va in `WarningsNotAsErrors` se il progetto usa `TreatWarningsAsErrors`: `Random` resta ammesso per valori non sensibili (per esempio il jitter dei retry) con un commento sul perché, mai per token, chiavi o segreti (vedi sopra). Gli ID e le impostazioni si verificano al primo uso sulla versione del SDK installata, perché non sono stati riletti dalla documentazione in questa sessione. Una soppressione (`#pragma`, `SuppressMessage`) richiede un commento con il motivo e l'approvazione dell'utente. Un algoritmo proprio o una deroga si propongono con motivo e si attende l'approvazione dell'utente.
- **Confronti a tempo costante:** credenziali, token, hash e firme si confrontano con `CryptographicOperations.FixedTimeEquals`, mai con `==` o `string.Equals`.

## Dati e Segreti
▲ Verificato dal plugin `kit`: hook `guard-secrets` (valori reali in `appsettings*.json`, password in chiaro in compose e Dockerfile, chiavi PEM, token JWT bloccati) e `check-quality` (avvisi).
- Data Protection di ASP.NET Core e hashing delle password: regole in `security-backend.md`, «Chiavi e password (.NET)».
- Rotazione dei segreti: i segreti hanno una data di scadenza o rotazione dichiarata nel `CLAUDE.md` di progetto; un segreto compromesso o finito per errore nel repository si considera bruciato e va sostituito, non solo rimosso.
- Nessun segreto nel repository: User Secrets in sviluppo; in produzione variabili d'ambiente valorizzate da `.env` fuori dal repository (mai servizi cloud a pagamento come Azure Key Vault o AWS Secrets Manager).
- **Database e canali interni:** il database si raggiunge con connessione cifrata e certificato verificato (SQL Server `Encrypt=True` con `TrustServerCertificate=False`; PostgreSQL `SslMode=VerifyFull`); se il server usa un certificato proprio, la CA fidata si concorda per progetto (host gestito dall'utente). Utente applicativo senza DDL e utente separato per le migrazioni: vedi `backend-app.md` §4.4. Redis e RabbitMQ richiedono sempre autenticazione (segreti da variabili d'ambiente valorizzate da `.env`) e non espongono porte sull'host in produzione (`docker.md`); se il traffico esce dalla rete interna del compose, passa su TLS. Nessun servizio interno (database, cache, broker, pannelli di gestione) è raggiungibile da Internet.
- Le password non sono mai in chiaro, né nei log.
- Dati personali: minimizzazione, cifratura dei campi sensibili, retention e diritto all'oblio (GDPR).
- Dati di test: mai dati reali di produzione in sviluppo o test; usa dati sintetici o anonimizzati.
- Backup e ripristino: backup automatici del database con ripristino testato periodicamente. RPO/RTO e retention si dichiarano nel `CLAUDE.md` di progetto; gli artefatti di backup sono descritti in `docker.md`.
- Log di sicurezza: registra login riusciti e falliti, lockout, cambi di ruolo/permessi, accessi negati (401/403) e modifiche a dati critici; il contenuto dei messaggi segue la regola «Log: injection e contenuto» (vedi «Vulnerabilità applicative ricorrenti»).
- **Log di sicurezza e allerta** (OWASP Top 10 2025, A09 «Security Logging and Alerting Failures»; il livello degli alert è una scelta del kit):
  - **Eventi riconoscibili:** gli eventi di sicurezza hanno un nome stabile (es. `AuthLoginFailed`, `AuthLockout`, `AccessDenied`, `RoleChanged`, `RateLimited`, `RefreshTokenReuse`) e proprietà strutturate (utente, IP, risorsa, esito, `traceId`), così si filtrano e si contano senza interpretare il testo.
  - **Alert minimi:** picchi di 401/403/429 rispetto al normale, lockout ripetuti, cambi di ruolo o permessi, riuso di un refresh token, errori 5xx in aumento. Le soglie si concordano per progetto.
  - **Per livelli:** (1) progetto piccolo senza stack di osservabilità: solo log strutturati con gli eventi sopra, e nel `CLAUDE.md` chi li controlla e con quale frequenza; (2) con lo stack self-hosted di `core.md` §5: regole di alert in Grafana/Prometheus sugli stessi eventi, con un canale di notifica scelto dall'utente. Lo stack non si impone ai progetti piccoli.
  - **Integrità e retention:** i log di audit non sono modificabili dall'applicazione che li scrive (sola aggiunta; nessun utente applicativo con `UPDATE` o `DELETE` sulle tabelle di audit); la retention si dichiara nel `CLAUDE.md` e tiene conto del GDPR, evitando dati personali non necessari.
  - **Test:** un integration test verifica che login fallito, accesso negato e cambio di ruolo producano l'evento atteso, senza dati personali né segreti.

## Mobile (sezione minima)
Il kit non ha ancora moduli per il mobile (`core.md` §2): finché non esistono, queste sono le regole di base per un'app che parla con il backend; il riferimento completo è OWASP MASVS (gruppi di controlli: storage, crittografia, autenticazione, rete, piattaforma, codice, resilienza, privacy; elenco e versione da verificare alla fonte al primo uso, non a memoria).
- **Storage:** token e segreti solo nel contenitore sicuro della piattaforma (Keychain su iOS, Keystore su Android, tramite il plugin del framework scelto), mai in preferenze, file o database in chiaro; nessun segreto del backend nell'app (il pacchetto è decompilabile).
- **Rete:** solo HTTPS con verifica del certificato; il pinning del certificato o della chiave pubblica è una scelta da concordare per progetto (aumenta la sicurezza ma richiede un piano di rotazione, altrimenti l'app smette di funzionare).
- **Autenticazione:** Authorization Code con PKCE tramite browser di sistema (mai credenziali in una WebView incorporata); token a vita breve e rinnovabili come da «Autenticazione e Autorizzazione» in `security-backend.md`; sblocco biometrico solo come comodità locale, mai come unico fattore lato server.
- **Dati e log:** nessun dato personale o token nei log, negli screenshot di sistema o negli appunti; backup del dispositivo e anteprime dell'app valutati per i dati sensibili.
- **Link e piattaforma:** deep link validati come ogni input esterno (`Open redirect` compreso); permessi richiesti al minimo.
- **Build:** debug disattivato e codice offuscato dove la piattaforma lo prevede, build di release firmate. Il rilevamento di root o jailbreak non è un controllo di sicurezza affidabile: non si introduce di iniziativa.
- **Test:** si estendono i test di input ostili alla superficie mobile; la scelta della tecnologia mobile e le sue regole dedicate si chiedono al progetto (`CLAUDE.md`, «Sviluppo mobile»).

## Supply chain
- Audit delle dipendenze, SAST, secret scanning, scansione immagini e SBOM: vedi `core.md` (§3 e §5). I controlli concreti sono qui sotto (OWASP Top 10 2025, A03 «Software Supply Chain Failures»).
- **NuGet, package source mapping:** il `NuGet.config` nella root dichiara `<packageSourceMapping>` con una sola fonte per ogni pacchetto (`nuget.org` per `*`; un feed privato, se c'è, per i suoi prefissi), così un pacchetto con lo stesso nome su un'altra fonte non viene scaricato al suo posto (dependency confusion). Vale per tutti i pacchetti, anche transitivi; richiede NuGet 6.0 o successivo e il mapping non si applica ai pacchetti già nella cartella globale (`dotnet list package --vulnerable` interroga comunque tutte le fonti).
- **npm, script di installazione:** `npm ci --ignore-scripts` è la regola, nel Dockerfile, in locale e in CI. Un pacchetto che ne ha davvero bisogno (es. il download dei browser di Playwright) è un'eccezione elencata nel `CLAUDE.md` con il motivo e lo script lanciato esplicitamente a parte.
- **Bot delle dipendenze, attesa sulle versioni nuove:** Dependabot/Renovate propongono una versione solo dopo 7 giorni dalla pubblicazione (`cooldown` di Dependabot; l'equivalente in Renovate); gli aggiornamenti di sicurezza non aspettano (per Dependabot il `cooldown` non li riguarda). Il valore si tiene nella configurazione del bot, non nel codice.
- **GitHub Actions:** ogni action di terze parti fissata al commit SHA completo (preso dal repository originale, non da un fork) con la versione in commento; `permissions:` dichiarati in ogni workflow, di default in sola lettura (`contents: read`) con permessi in più solo sul job che li richiede; nessun segreto esposto ai workflow delle PR da fork.
- **Repository (a cura dell'utente):** protezione del branch `main` e di `develop` (PR obbligatoria, controlli CI richiesti, nessun push diretto) e `CODEOWNERS` per `.github/`, `security.md` e i file di dipendenze. Claude scrive `CODEOWNERS` e i workflow se richiesto; la configurazione su GitHub è dell'utente.
- **Immagine di release:** SBOM già previsto in `core.md` §5; in più, attestazione di provenienza della build (strumento e licenza da verificare al primo uso, `core.md` §3).
- **Controllo licenze:** la regola "solo licenze permissive" (`core.md` §3) si verifica con uno strumento gratuito, non a memoria: per npm `license-checker-rseidelsohn` (BSD-3-Clause, versione 5.x; il progetto passerà a `@lizenz/checker`, oggi ancora pre-1.0: valutarlo quando esce la 1.0), per NuGet `nuget-license` di sensslen (Apache-2.0, dotnet tool `nuget-license`; non confonderlo con il vecchio `dotnet-project-licenses`, abbandonato). Licenze degli strumenti verificate il 2026-10-25; per qualunque altro strumento verifica la licenza prima di proporlo. Il comando e la lista di licenze ammesse stanno nel `CLAUDE.md` o nella CI; una licenza non ammessa o sconosciuta fa fallire il controllo e viene segnalata, non ignorata.

## Scansione dinamica, segnalazioni e risposta agli incidenti
(Scelte del kit; OWASP ZAP è Apache-2.0, licenza verificata il 2026-11-04.)
- **DAST con OWASP ZAP baseline (opzionale):** scansione passiva contro un'istanza di prova avviata in CI (mai produzione), con report salvato come artefatto. Il progetto la attiva se ha un ambiente avviabile in CI e lo annota nel `CLAUDE.md`; i falsi positivi si gestiscono in un file di regole versionato, ognuno con il motivo, non si ignora l'intera scansione. Le action o le immagini usate sono fissate come in «Supply chain». Claude scrive il workflow; l'esecuzione è dell'utente.
- **`SECURITY.md`:** nella root di ogni progetto, con come segnalare una vulnerabilità (canale privato, per esempio il reporting privato di GitHub o un indirizzo email), versioni supportate, tempi di risposta attesi e divieto di aprire issue pubbliche per falle non corrette. Contatti e tempi li fornisce l'utente: Claude non li inventa.
- **Runbook minimo** in `docs/runbook-sicurezza.md`, breve e senza segreti, con i passi per: segreto trapelato (considerarlo bruciato, ruotarlo, verificare gli accessi, poi la pulizia della cronologia, come in `git.md`); account compromesso (revoca di sessioni e token, reset delle credenziali, controllo dei log di sicurezza, avviso al titolare); dipendenza vulnerabile (aggiornare o segnalare, `core.md` §3); violazione di dati personali (avviso al titolare del trattamento: il GDPR prevede la notifica al Garante entro 72 ore). Chi decide e chi esegue lo indica l'utente.

## Test di sicurezza automatici
Si scrivono nel progetto `IntegrationTests` (vedi `backend-app.md` §4.5) e fanno fallire la build; le voci su autenticazione e autorizzazione valgono solo se il progetto le prevede.
- **Endpoint protetti di default:** un test enumera gli endpoint e verifica che senza credenziali rispondano 401, tranne una lista esplicita di endpoint `AllowAnonymous` motivati; un nuovo endpoint pubblico fa fallire il test finché non viene dichiarato nella lista.
- **Ruoli e policy:** per ogni endpoint con ruolo o policy, un test con un utente senza il permesso (403) e uno con il permesso (successo).
- **Proprietà e tenant:** regola e test in `backend-app.md` §4.6 (database di prova e isolamento: §4.5).
- **Frontend:** test sul rendering di input ostili (payload XSS mostrati come testo, mai interpretati); header di sicurezza e CSP verificati sulla risposta reale (test lato server o E2E). Le regole generali dei test frontend sono in `frontend.md` e `core.md` §4.
- **Header e CORS:** un test verifica la presenza degli header di sicurezza sulle risposte e che CORS accetti solo le origini in whitelist.
- **Fail closed:** un test rende irraggiungibile o fallimentare la dipendenza da cui dipende un controllo (servizio di autorizzazione, provider, cache) e verifica che la richiesta sia negata e non servita; un altro avvia l'app con una configurazione di sicurezza a segnaposto in un ambiente non di sviluppo e verifica che l'avvio fallisca.
- **File ostili:** per ogni endpoint di upload, test con file di tipo falsificato (estensione e contenuto in contrasto), nome con percorso o doppia estensione, file oltre i limiti, archivio con voci che escono dalla cartella o con rapporto di compressione eccessivo, SVG con script e XML con entità esterne; esito atteso: rifiuto controllato (400, 413 o 422 con `ProblemDetails`), mai file salvato o elaborato.
- **Host ostile:** per ogni flusso che genera link assoluti (reset password, conferma email, inviti), un test invia una richiesta con `Host` e `X-Forwarded-Host` falsificati e verifica che il link generato usi solo il valore di configurazione.
- **Input malevoli (obbligatori per ogni modifica che tocca input, autenticazione o dati):** ogni endpoint o validatore nuovo o modificato ha test con payload ostili: frammenti SQL/XSS/path traversal nei campi, stringhe oltre i limiti, caratteri di controllo e a capo, JSON malformato o con tipi errati, overposting (campi non ammessi come `Role`, `OwnerId`, `TenantId`), identificatori di altri utenti. L'esito atteso è un rifiuto controllato (400, 404, 413 o 422 con `ProblemDetails`), mai un 500 né il dato elaborato. Gli unit test coprono i validatori, gli integration test l'endpoint.

## Regola operativa
- Se il codice richiesto introduce un rischio (es. disabilitare CORS o la validazione), Claude lo segnala prima di procedere.
- **Security review prima della consegna:** per ogni funzionalità che tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali, Claude esegue la skill `/security-review` sulle modifiche e riporta i risultati nella consegna. Le modifiche solo cosmetiche o di documentazione ne sono escluse. Un problema trovato si corregge in un commit `fix(security)` a sé (vedi `git.md`) o si segnala all'utente se la correzione esula dal compito.
