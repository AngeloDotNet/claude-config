# 0003. Migrazioni EF Core come passo unico prima delle repliche

**Stato:** accettata (2026-11-27), decisione dell'utente dopo la verifica della documentazione.

## Contesto
`backend-app.md` §4.4 diceva di applicare le migrazioni da codice, all'avvio di ogni container del backend (`Database.MigrateAsync()`), senza uno step dedicato. Con più repliche, due istanze possono provare a migrare insieme.

La documentazione ufficiale di EF Core («Applying Migrations», Microsoft Learn) dice che da EF Core 9 `MigrateAsync` e `Migrate` acquisiscono un lock a livello di database prima di applicare le migrazioni, e che il meccanismo di lock varia tra i provider. Per la produzione con repliche, indicata come rollout coordinato o alta disponibilità, la stessa pagina raccomanda un passo di deploy separato: il bundle generato in build, eseguito come job one-shot dopo che il database è pronto, e non le migrazioni al proprio avvio da ogni replica.

Un repro di terze parti segnala un possibile buco del lock con Npgsql 11 su PostgreSQL. Non l'ho confermato.

## Decisione
- Le migrazioni si applicano con un **passo unico prima dell'avvio delle repliche**: il bundle (`dotnet ef migrations bundle`) eseguito come job one-shot, che deve terminare con successo prima che l'app serva richieste.
- In Docker, il servizio `migrate` del compose esegue il bundle, e `api` dipende da `migrate` con `condition: service_completed_successfully`.
- L'app non applica migrazioni al proprio avvio.
- Il lock di EF Core 9 o successivo resta una protezione in più, non il meccanismo principale.
- La stringa di connessione con l'utente DDL è usata solo dal job di migrazione.

## Conseguenze
- Cambia la regola precedente, che non prevedeva un servizio one-shot nel compose: `backend-app.md` §4.4 e `docker.md` sono aggiornati.
- Un progetto senza Docker deve avere un passo equivalente nel proprio deploy (per esempio il bundle lanciato prima di avviare le repliche). Il deploy è dell'utente.
- Il job va verificato in CI su un database di prova, insieme alle migrazioni expand/contract di `backend-app.md` §4.4.
- Fonte: [Applying Migrations, Microsoft Learn](https://learn.microsoft.com/en-us/ef/core/managing-schemas/migrations/applying).
