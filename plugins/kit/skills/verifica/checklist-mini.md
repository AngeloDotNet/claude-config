# Checklist di consegna del profilo `mini`

Si usa al posto di `qualita.md` §0b, che nel profilo `mini` non è caricato. Contiene gli obblighi che l'ADR 0001 del template assegna a `mini`; le voci non pertinenti si ignorano. La fonte di ogni obbligo resta la regola citata: se divergono, vale la regola.

- [ ] Nessuna decisione presa per assunzione (`core.md`, regola in testa).
- [ ] Identificatori e messaggi di commit in inglese, commenti di codice e spiegazioni in italiano, salvo richiesta diversa (`core.md` §6, punto 9).
- [ ] Conventional Commits, lavoro su un branch di lavoro, nessun `push --force` e nessun `--no-verify` (`git.md`).
- [ ] Nessun segreto nel repository: valori reali da variabili d'ambiente (`security.md`, «Dati e Segreti»).
- [ ] Nessun dato personale né segreto nei log, che passano da `ILogger` nel backend .NET (`security.md`; `osservabilita.md`).
- [ ] Build senza warning e test passati, con gli errori riportati così come sono; se il progetto non ha build o test, lo si dichiara (`core.md` §6, punto 7).
- [ ] Nuove dipendenze dichiarate con nome, versione e motivo, gratuite e con licenza permissiva, con il lock file committato (`core.md` §3 e §6, punto 8).
- [ ] `README.md` e `CHANGELOG.md` aggiornati per questo passo (`core.md` §5b).
- [ ] Se il lavoro tocca autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali: security review eseguita e risultato riportato (`security.md`, «Regola operativa»).
- [ ] Per ogni modifica a input, autenticazione, upload o dati: test con input malevoli (`security.md`, «Regola operativa»).
