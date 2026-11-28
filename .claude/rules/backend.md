---
paths:
  - "**/*.{cs,csproj,props}"
  - "**/appsettings*.json"
  - "**/NuGet.config"
  - "**/.editorconfig"
  - "**/global.json"
  - "**/*.sln"
  - "**/*.slnx"
---

# Regole Backend (.NET 10, Architettura & Dati)

> Versione 1.16 — ultima revisione: 2026-11-28.

> Richiede `core.md` (contratto con il frontend, licenze, workflow). Per la sicurezza vedi anche `security.md` e `security-backend.md`. Il modulo è diviso in quattro file con la stessa intestazione `paths:`: questo (stack, comunicazione, dati, operatività, servizi di contorno) e `backend-regole.md` (§2, regole di struttura, validazione, codice, errori, configurazione e job). In più, `backend-architecture.md` (§2a Vertical Slice, §2b Clean Architecture, §2c accesso ai dati e pattern) e `backend-app.md` (§4 logica applicativa e infrastruttura). La numerazione dei paragrafi è rimasta quella storica.

## 1. Stack Backend
- **Runtime:** .NET 10 Web API, C# 14.
- **Serializzazione JSON:** `System.Text.Json` (NO Newtonsoft.Json).
- **Architettura:** Vertical Slice Architecture (§2a) o Clean Architecture (§2b), alla pari. Si decide una volta per progetto (vedi `core.md` §6.4) e la scelta sta nel `CLAUDE.md`; in un progetto esistente si rileva dal codice e si conferma con l'utente.
- **ORM:** Entity Framework Core 10 è il default. **Dapper è l'alternativa da valutare ogni volta**, mai una scelta scontata né da copiare dal progetto precedente: all'avvio si chiede quale usare; se in corso d'opera emerge un caso che sembra adatto (query di lettura molto complesse o critiche per prestazioni, report, operazioni bulk) Claude lo propone con motivazione e **aspetta conferma**, senza introdurlo di sua iniziativa. Se si adotta Dapper (da solo o accanto a EF Core), l'utente decide come gestire schema e migrazioni (le regole di §4.4 valgono per EF Core) e la scelta va nel `CLAUDE.md`; Claude verifica la licenza (vedi `core.md` §3). Le query restano sempre parametrizzate (mai concatenazione di stringhe SQL).
- **Database:** il motore (SQL Server o PostgreSQL) si **chiede sempre** a ogni progetto: mai darlo per scontato né copiarlo dal progetto precedente. Dalla risposta dipende il provider NuGet di EF Core (`Microsoft.EntityFrameworkCore.SqlServer`, `Npgsql.EntityFrameworkCore.PostgreSQL`). MySQL è escluso per ora. La scelta va nel `CLAUDE.md`.
- **Finiture:** NO MediatR (approccio custom), NO AutoMapper (mapping manuale tramite metodi di estensione). Oltre alla scelta del kit, i due pacchetti hanno una licenza commerciale dalle versioni recenti (MediatR dalla 13, AutoMapper dalla 15; le versioni precedenti restano open source, ma senza evoluzione), quindi contrastano con `core.md` §3; la licenza si verifica comunque sulla fonte al momento della decisione.
- **Gestione Errori/Risposte:** per ogni sviluppo backend (solo API o fullstack) la libreria per il core business e l'integrazione con le Minimal API è **`OperationResults` di Marco Minerva** (https://github.com/marcominerva/OperationResults). La scelta è fissa e non si chiede. La variante `OperationResults` di AppEngine (https://github.com/AngeloDotNet/AppEngine/tree/main/src/AppEngine.Tools/OperationResults) è **sospesa fino a nuova modifica** delle regole, perché subirà un refactoring completo: non va proposta né usata.
  Gli esempi e i nomi di queste regole (`Result<T>`, `FailureReasons`, `AddOperationResult()`, `CreateResponse(result)`) si riferiscono a questa libreria, ma ciò non esime dal controllo: prima di scrivere codice, verifica nel repository e nella versione installata nome del pacchetto NuGet, namespace e firme delle API effettivamente usate (la libreria continua a evolversi), oltre alla licenza (vedi `core.md` §3). La versione scelta va nel `CLAUDE.md`.

---


## 2. Regole Backend
La sezione 2 (struttura e linguaggio, validazione e OpenAPI, codice e organizzazione, errori, configurazione e resilienza, tipi e dati, job in background, servizi di contorno) è in `backend-regole.md`, con la stessa numerazione.

## 3. Comunicazione, Mapping & Data Transfer
- **DTO:** ogni richiesta/risposta ha un `record` dedicato. Mai esporre entità EF Core al frontend.
- **Mapping:** solo metodi di estensione statici in classi dedicate. Niente AutoMapper né factory interne ai DTO.
- **Naming:** C# PascalCase per tipi, metodi e proprietà; camelCase per parametri e variabili locali; campi privati `_camelCase`; interfacce con prefisso `I`; metodi asincroni con suffisso `Async` (tranne gli handler degli endpoint).
- **Stile del codice:** file-scoped namespace; un tipo per file, con il nome del file uguale al tipo; `sealed` su classi e record non pensati per l'ereditarietà; **si preferisce `record` (sealed) per i tipi di dati immutabili**: DTO, value object, messaggi ed eventi, comandi/query, Options; `class` per entità EF (identità e change tracking, mai `record`), servizi, handler e tipi con stato mutabile o comportamento; `var` solo quando il tipo è evidente; `using` ordinati (il formato è imposto da `.editorconfig` e dagli analyzer, non a mano).
- **Serializzazione:** configura esclusivamente `System.Text.Json` (`JsonNamingPolicy.CamelCase`) per la conversione automatica.
- **Endpoint REST:** risorse al plurale, kebab-case, verbi HTTP corretti e codici di stato coerenti.
- **Risposte tipizzate (PREFER):** negli endpoint Minimal API si restituisce `TypedResults` (con `Results<...>` come tipo di ritorno quando le risposte possibili sono più d'una), così i tipi di risposta sono espliciti, entrano nello schema OpenAPI e sono verificabili nei test; `Produces`/`ProducesProblem` restano per ciò che il tipo di ritorno non descrive. Si verifica sulla versione installata (`core.md` §6.13).

---

## 4. Logica Applicativa e Infrastruttura
Errori e risposte API (§4.1), concorrenza (§4.2), paginazione (§4.3), database ed EF Core (§4.4), integration test (§4.5), utente corrente e controlli di proprietà (§4.6) sono in **`backend-app.md`**.

---

## 5. Messaggistica, Cache, Eventi ed Email (moduli opzionali)
Le regole su **messaggistica (RabbitMQ), outbox, eventi di dominio e cache applicativa (FusionCache L1 preferita o memory cache nativa, L2 Redis solo se concordato)** stanno in `backend-infra.md`; quelle sull'**invio email** in `backend-email.md`. Si importano solo se il progetto usa quelle funzionalità (domande di avvio in `avvio-progetto.md`). Se una funzionalità serve e il modulo non è incluso, Claude lo segnala e propone di aggiungerlo (`avvio-progetto.md` §4); non improvvisa le regole.

---

## 5b. Esecuzione su Più Container
Poiché più container applicativi girano in parallelo, nessuno stato deve vivere nel singolo processo.
- **Shutdown:** arresto graduale (graceful shutdown) con `CancellationToken` rispettato da `BackgroundService` e hosted service; i job in corso terminano o vengono ripresi.
- **Repliche:** l'app deve poter girare in più repliche senza stato locale (sessione, file, cache, scheduler).
- **Job schedulati:** un `BackgroundService` che esegue lavoro "unico" (outbox, pulizie) deve usare un lock distribuito (lock su database o `FOR UPDATE SKIP LOCKED`), altrimenti gira N volte. Per Coravel e per gli hosted service con più container non c'è una regola fissa: **chiedi caso per caso** come garantire che un job unico giri una sola volta.
- **Consumer RabbitMQ:** più consumer sulla stessa coda sono voluti (competing consumers), ma idempotenti.
- **Rate limiting:** i limiti in memoria sono per container; per limiti globali precisi serve un contatore condiviso, da chiedere prima di introdurre.
- **File e sessione:** nessun file locale come stato e nessuna sessione né stato di autenticazione nella memoria del singolo processo; l'eventuale stato (refresh token, denylist di revoca) sta su database o archivio condiviso. Storage dietro astrazione (vedi §2).
- **SignalR:** con più container richiede un backplane. Redis è riservato alla cache, quindi chiedi prima di introdurne uno.
- **Data Protection:** le chiavi di ASP.NET Core Data Protection sono persistite su database o volume condiviso, comuni a tutti i container (vedi `security-backend.md`, «Chiavi e password (.NET)»).

---

## 6. Export, Import e Documenti
- **Export:** CSV (streaming per dataset grandi), Excel e PDF generati dal backend, con endpoint dedicato che rispetta filtri e permessi. Operazioni lunghe come job in background con notifica al termine (tipo di job, strumento e retry si chiedono secondo §2 "Lavori in background").
- **Librerie:** solo gratuite e con licenza permissiva (es. ClosedXML, PdfSharp). Evita EPPlus, iText e QuestPDF: licenze commerciali o copyleft.
- **Import:** validazione riga per riga, report degli errori per riga, dry-run prima dell'applicazione e transazione, mai import parziale silenzioso.

---

## 7. Convenzioni Database
- **Naming:** tabelle al plurale (`Products`) in PascalCase su SQL Server; `snake_case` su PostgreSQL (`UseSnakeCaseNamingConvention()`, dal pacchetto `EFCore.NamingConventions`, Apache-2.0, da dichiarare come dipendenza: `core.md` §6.8). Chiavi `PK_`, esterne `FK_`, indici `IX_`.
- **Indici:** sulle chiavi esterne e su ogni colonna usata in filtri e ordinamenti frequenti; verificati con il piano di esecuzione. Niente indici speculativi.
- **Seeding:** dati di riferimento (ruoli, lingue, chiavi di traduzione base) tramite migrazione o script idempotente, mai a mano. I dati di sviluppo sono separati e non vanno in produzione.
- **Primo amministratore:** se il progetto ha utenti, l'account amministratore iniziale si crea con un comando o uno step one-shot dedicato (con Docker, vedi `docker.md`), non nel seeding della migrazione e non all'avvio dell'app. Email e password iniziali arrivano da variabili d'ambiente valorizzate da `.env`, mai nel codice né nel repository; la password non viene mai scritta nei log. Lo step è idempotente (se l'amministratore esiste non fa nulla) e impone il cambio password al primo accesso. Dove il progetto usa Keycloak, l'amministratore iniziale è un'operazione dell'IdP, da documentare nel README.
- **Vincoli:** integrità nel database (not null, unique, check, FK), non solo nel codice.

---

## 8. Feature Flag, Deprecazione e Performance
- **Feature flag:** `Microsoft.FeatureManagement` (MIT), con flag a vita breve da rimuovere dopo il rilascio completo. Mai flag per la sicurezza.
- **Deprecazione API:** versione nuova affiancata alla vecchia, header `Deprecation` e `Sunset`, data di dismissione dichiarata. Mai cambiare un contratto esistente in modo incompatibile senza nuova versione.
- **Performance:** obiettivo p95 < 300 ms per letture semplici e < 1 s per scritture, salvo diversa indicazione. Misura prima di ottimizzare (OpenTelemetry, `EXPLAIN`). Per i progetti critici, test di carico con uno strumento gratuito a licenza permissiva (es. Bombardier, MIT); verifica la licenza prima di proporne altri.

---

## 9. Localizzazione, Temi e Date (lato server)
- **Dizionario:** stringhe, messaggi di errore e dizionari sono su database (Chiave-Valore-Lingua) ed esposti da un endpoint dedicato (es. `/api/localization/dictionary?lang=it`).
- **Cache:** il dizionario è cacheato lato server (con la cache concordata per il progetto, vedi `backend-infra.md`) con invalidazione alla modifica e supporto ETag/`If-None-Match`.
- **Preferenze utente:** tema e fuso orario IANA (es. `Europe/Rome`) sono salvati nel profilo e inclusi nel payload del profilo, se il progetto ha un profilo utente; altrimenti la sede si concorda (vedi `frontend.md` §4.1).
- **Date:** storage SEMPRE in UTC. In C# usa `DateTimeOffset` oppure `DateTime` con `Kind=Utc`. Su PostgreSQL `timestamp with time zone`.
- **Fusi orari:** i fusi si identificano con il nome IANA (es. `Europe/Rome`), mai con un offset fisso, e `TimeZoneInfo` li risolve nel container: il runtime deve includere `tzdata` (con Docker, vedi `docker.md`). Le pianificazioni ricorrenti in ora locale salvano l'orario locale e il fuso IANA; l'istante successivo si calcola ogni volta con `TimeZoneInfo`, perché l'ora legale sposta l'istante. Il fuso non si salva mai come solo offset.
