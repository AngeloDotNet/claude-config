---
description: Guida il lavoro con Entity Framework Core nel backend: letture senza tracking, migrazioni da non modificare a mano, applicazione delle migrazioni, ciclo di vita del DbContext e ottimizzazione delle query. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-progetto]
disable-model-invocation: true
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
9. **Trappole comuni.** Controlla N+1, query dentro i cicli, tracking con più contesti, uso incoerente di async e chiamate sincrone su operazioni di I/O.
10. **Esito.** Chiudi con l'elenco dei punti trovati, per gravità, con file e riga. Le modifiche al codice si propongono e si applicano con una richiesta separata.

Riferimenti: `backend-app.md` §4.4 e §8; `backend-architecture.md` §2c; `core.md` §4.
