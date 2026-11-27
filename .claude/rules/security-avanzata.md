# Sicurezza avanzata: progettazione, crittografia e test di input

> Versione 2.2 — ultima revisione: 2026-11-25.
> Richiede `security.md` e `core.md`. Estratto da `security.md` con gli stessi titoli di sezione. Caricato nei profili standard e strutturato. Le sezioni ASVS, supply chain, scansione dinamica, mobile, test di sicurezza automatici, threat model e dettaglio di dati e segreti sono in `security-strutturato.md` (solo profilo strutturato).

## Progettazione sicura e fail closed
(OWASP Top 10 2025: A06 «Insecure Design» e A10 «Mishandling of Exceptional Conditions».)
- **Fail closed:** quando un controllo non può dare un esito (eccezione, timeout, servizio di autorizzazione o dipendenza non raggiungibile, configurazione mancante o non valida), il default è **negare**, mai concedere. Un errore nel codice di autorizzazione o di validazione produce 401, 403 o 5xx con `ProblemDetails`, non l'accesso. Un `catch` non trasforma un errore di sicurezza in un successo. Una configurazione di sicurezza mancante o ancora a segnaposto in un ambiente non di sviluppo impedisce l'avvio (`ValidateOnStart`).
- **Eccezioni e stato coerente:** le eccezioni non previste non lasciano operazioni a metà (transazione o compensazione) né informazioni nella risposta (vedi la voce «Errori» in `security-backend.md`, «Vulnerabilità applicative ricorrenti»); i timeout e i limiti sulle chiamate verso l'esterno sono sempre impostati.


## Crittografia
- **Solo API crittografiche moderne e non obsolete.** Vietati: MD5, SHA-1, DES/3DES, RC2, RC4, modalità ECB, `RijndaelManaged`, cifratura RSA con padding PKCS#1 v1.5, `Rfc2898DeriveBytes` con costruttori senza hash esplicito, `Random` per token, chiavi o segreti.
- **Consentiti:** AES-GCM, SHA-256/384/512, HMAC-SHA2, ECDSA ed RSA-PSS, PBKDF2 tramite `Rfc2898DeriveBytes.Pbkdf2` con hash esplicito, `RandomNumberGenerator` per ogni valore casuale sensibile.
- **Eccezione SHA-1/HMAC-SHA1:** ammessi solo dove il protocollo li impone, per esempio HMAC-SHA1 nel TOTP (RFC 6238, spesso il default delle app di autenticazione), mai per hash di password, firme o integrità. L'uso va motivato in un commento e, se non è nel TOTP del framework, annotato nel `CLAUDE.md`; il divieto resta per ogni altro caso.
- Gli analyzer di sicurezza di Roslyn segnalano gli usi vietati e fanno fallire la build: `AnalysisLevel` e `AnalysisMode` impostati in `Directory.Build.props` (per esempio `AnalysisLevel` all'ultima versione e `AnalysisMode` `Recommended`) e le regole di sicurezza (`CA5350`, `CA5351`, `CA5358`, `CA5379`, `CA5390`, `CA5403`, `CA2100`, `CA5369`, `CA5372`, `CA2300`–`CA2302`) a severità `error` nell'`.editorconfig` del template. `CA5394` (casualità non sicura) è a `warning`, non `error`, e va in `WarningsNotAsErrors` se il progetto usa `TreatWarningsAsErrors`: `Random` resta ammesso per valori non sensibili (per esempio il jitter dei retry) con un commento sul perché, mai per token, chiavi o segreti (vedi sopra). Gli ID e le impostazioni si verificano al primo uso sulla versione del SDK installata, perché non sono stati riletti dalla documentazione in questa sessione. Una soppressione (`#pragma`, `SuppressMessage`) richiede un commento con il motivo e l'approvazione dell'utente. Un algoritmo proprio o una deroga si propongono con motivo e si attende l'approvazione dell'utente.
- **Confronti a tempo costante:** credenziali, token, hash e firme si confrontano con `CryptographicOperations.FixedTimeEquals`, mai con `==` o `string.Equals`.


## Test di sicurezza automatici (minimo)
Si scrivono nel progetto `IntegrationTests` (vedi `backend-app.md` §4.5) e fanno fallire la build.
- **Input malevoli (obbligatori per ogni modifica che tocca input, autenticazione o dati):** ogni endpoint o validatore nuovo o modificato ha test con payload ostili: frammenti SQL/XSS/path traversal nei campi, stringhe oltre i limiti, caratteri di controllo e a capo, JSON malformato o con tipi errati, overposting (campi non ammessi come `Role`, `OwnerId`, `TenantId`), identificatori di altri utenti. L'esito atteso è un rifiuto controllato (400, 404, 413 o 422 con `ProblemDetails`), mai un 500 né il dato elaborato. Gli unit test coprono i validatori, gli integration test l'endpoint.
