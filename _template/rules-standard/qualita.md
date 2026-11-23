# Regole di qualità e checklist di consegna (versione standard)

> Versione 1.0 — ultima revisione: 2026-11-23.
> Versione breve per il profilo `standard`, estratto di `core.md` §0b e §4. Il testo completo è in `.claude/rules-optional/dettaglio/qualita.md`, da leggere su richiesta. Richiede `core.md`.

## 0b. Checklist di consegna
Prima di dichiarare concluso un compito, verifica (le voci non pertinenti si ignorano):
- [ ] Nessuna decisione presa per assunzione: le scelte dubbie si chiedono.
- [ ] Piano come issue padre per il lavoro non piccolo, aggiornato a ogni passo.
- [ ] `README.md` e `CHANGELOG.md` creati o aggiornati per questo passo.
- [ ] Build senza warning e test passati, con gli errori riportati così come sono.
- [ ] Commenti XML in inglese sui tipi e i membri pubblici.
- [ ] Pacchetti senza vulnerabilità note (audit NuGet e npm).
- [ ] Test con input malevoli per ogni modifica che tocca input, autenticazione o dati.
- [ ] Lint e formattazione puliti; nessun `any`, nessuna stringa o colore hardcoded (frontend).
- [ ] Chiavi di traduzione IT/EN fornite.
- [ ] Endpoint protetti, input validati lato server, controlli di proprietà (anti-IDOR).
- [ ] Security review per autenticazione, autorizzazione, upload, URL esterni o dati personali (`security-avanzata.md`).
- [ ] Migrazione EF inclusa, se il modello è cambiato.
- [ ] Nessuna dipendenza non dichiarata; solo software gratuito con licenza permissiva.
- [ ] Nessun valore reale in `appsettings.json`: solo segnaposto, valori reali da variabili d'ambiente.

## 4. Test e qualità
- **Backend:** xUnit, con unit test (logica isolata, senza database né rete) e integration test (endpoint e accesso ai dati) dove hanno senso; se uno dei due non si applica, lo si dichiara.
- **Frontend:** unit test con Vitest ed E2E con Playwright.
- **Regola:** ogni funzionalità nuova arriva con i suoi test; ogni bug corretto ha un test che lo riproduce.
- **Analisi statica:** analyzer Roslyn, ESLint, Prettier; build senza warning.
- **Codice non coperto:** prima di un refactoring si scrivono test di caratterizzazione in un commit `test` separato.
- **Test rossi non correlati:** si riportano con l'errore così com'è, senza correggerli né nasconderli.
- **Scorciatoie vietate:** test saltati (`skip`, `Ignore`), attese arbitrarie (`Task.Delay`, `Thread.Sleep`), `NoWarn` nei progetti, `catch` vuoti. Una deroga motivata si dichiara con `kit-allow`.
- **Test instabili:** si corregge la causa (attese, orologio, ordine, dati condivisi); mai con retry o sleep.
- **Copertura ≥ 80%** sul codice nuovo e accessibilità automatica (axe) sono previste dal profilo `strutturato`.
