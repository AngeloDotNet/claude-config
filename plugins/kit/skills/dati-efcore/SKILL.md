---
description: Revisiona e guida il lavoro con Entity Framework Core nel backend (propone, non modifica file): letture senza tracking, migrazioni da non modificare a mano, applicazione delle migrazioni, ciclo di vita del DbContext e ottimizzazione delle query. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-progetto]
---

# Dati con EF Core

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill applica le regole di `backend-app.md` §4.4 (database ed EF Core) e `backend-architecture.md` §2c (accesso ai dati). Le regole sono vincoli: qui si trovano le procedure e i casi.

1. **Letture.** Le letture usano `AsNoTracking` e proiezioni verso DTO. Il tracking si attiva solo dove si modificano entità. Se una lettura mantiene il tracking senza modificare nulla, segnalala.
2. **Modifiche.** Quando si modifica un'entità letta con tracking, il `SaveChangesAsync` va chiamato una sola volta per unità di lavoro. Non mescolare due istanze del contesto per la stessa entità.
3. **Migrazioni.** Le migrazioni si creano, si rimuovono e si applicano con i comandi di EF. Una migrazione già applicata non si modifica mai a mano (`backend-app.md` §4.4). Per rimuovere l'ultima migrazione, vale solo se non è ancora stata applicata a nessun database.
4. **Applicazione delle migrazioni.** Le migrazioni si applicano dal codice all'avvio del backend, con la connessione dell'utente delle migrazioni, separata da quella dell'applicazione. Per gli script SQL di produzione, si generano script idempotenti da rivedere prima dell'esecuzione.
5. **Ciclo di vita del `DbContext`.** Nelle richieste il contesto è scoped. Nei servizi in background si crea uno scope per ciclo di lavoro, senza tenere un contesto per tutta la vita del servizio. Per oggetti di lunga durata si usa una factory.
6. **Errori transitori.** Se il provider può fallire in modo transitorio, si usa la strategia di esecuzione del provider, con i tentativi e il ritardo definiti nel progetto. Le operazioni ritentate devono essere idempotenti.
7. **Aggiornamenti in blocco.** `ExecuteUpdate` ed `ExecuteDelete` evitano di caricare le entità, ma aggirano il tracking e le regole sulle entità: si propongono con motivazione e si usano su conferma (`backend-architecture.md` §2c).
8. **Ottimizzazione.** Prima di intervenire si legge il SQL generato. Poi si verificano:
   - predicati sargabili: nessuna funzione applicata alla colonna indicizzata;
   - N+1: letture dentro i cicli, o navigazioni caricate una per una;
   - più collezioni in un'unica query: query splitting per evitare l'esplosione cartesiana;
   - paginazione con keyset quando la tabella cresce, invece dell'offset;
   - indici: solo dove una query concreta li usa;
   - query compilate solo per quelle eseguite di frequente.
9. **Concorrenza.** Le entità modificabili hanno un concurrency token (`rowversion` su SQL Server, `xmin` come `uint` con `IsRowVersion()` su PostgreSQL). Un conflitto (`DbUpdateConcurrencyException`) o una violazione di indice unique diventa 409 con chiave di traduzione, mai 500; con `If-Match` non soddisfatto, 412 (`backend-app.md` §4.1 e §4.2). Il controllo «esiste già?» non sostituisce il vincolo unique.
10. **Filtri globali.** Soft delete e multi-tenancy, se previsti, sono global query filter decisi una volta per progetto. Ogni `IgnoreQueryFilters` è un'eccezione motivata e rivista; ogni query su dati di un utente è filtrata per proprietario o tenant nel servizio (`backend-app.md` §4.4 e §4.6).
11. **Mapping e configurazione.** Denaro e quantità esatte sono `decimal` con precisione e scala esplicite nel mapping, mai `double` o `float` (`backend.md` §2). `EnsureCreated` non si usa. `EnableSensitiveDataLogging` e `EnableDetailedErrors` solo in Development: scrivono nei log i valori dei parametri (`backend-app.md` §4.4). Le migrazioni usano la connessione `ConnectionStrings:Migrations`, diversa da quella dell'applicazione, che non ha permessi DDL.
12. **Trappole comuni.** Tracking con più contesti, uso incoerente di async, `.Result` o `.Wait()` su operazioni di I/O. N+1 e query dentro i cicli sono già al punto 8: non ripeterli.
13. **Esito.** Chiudi con l'elenco dei punti trovati, per gravità (bloccante, importante, suggerimento: `lavoro.md`, «Gravità dei rilievi»), con file e riga. Le modifiche al codice si propongono e si applicano con una richiesta separata.

Riferimenti: `backend-app.md` §4.1, §4.2, §4.4 e §4.6; `backend.md` §8 (performance); `backend-architecture.md` §2c; `core.md` §4.
