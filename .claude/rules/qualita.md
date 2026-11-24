# Regole di qualità e checklist di consegna

> Versione 1.0 — ultima revisione: 2026-11-22.
> Richiede `core.md`. Estratto da `core.md` §0b (checklist di consegna) e §4 (test e qualità), con la stessa numerazione: i riferimenti «§0b» e «§4» restano validi. Caricato nei profili standard e strutturato; nel profilo mini sta in `.claude/rules-optional/`.

## 0b. Checklist di consegna
Prima di dichiarare concluso un compito, verifica (le voci non pertinenti al progetto si ignorano). Le voci con ▲ sono verificate anche dai hook del plugin `kit` (avvisi o blocchi); il criterio resta quello scritto qui:
- [ ] Nessuna decisione presa per assunzione (regola inviolabile in testa a questo file).
- [ ] Piano come issue padre con le sub-issue come passi, aperto prima di toccare qualsiasi file, per ogni lavoro non piccolo, e aggiornato (sub-issue chiuse) a ogni passo; per una modifica piccola senza piano, la richiesta soddisfa i criteri del §6, punto 15c.
- [ ] `README.md` e `CHANGELOG.md` creati o aggiornati per questo passo (§5b).
- [ ] Build senza warning e test passati (riporta gli errori così come sono), verificati prima di chiudere la sub-issue del passo (§6, punto 15a).
- [ ] Commenti XML in italiano su tutti i tipi e i membri pubblici, e gli altri commenti di codice in italiano, salvo richiesta diversa (§5b, `core.md` §9).
- [ ] ▲ Pacchetti (NuGet e npm) privi di vulnerabilità note, con l'audit indicato al §3.
- [ ] Test di sicurezza con input malevoli per ogni modifica che tocca input, autenticazione o dati (`security.md`).
- [ ] Lint e formattazione puliti.
- [ ] ▲ Nessun `any`, nessuna stringa hardcoded, nessun colore hardcoded (frontend).
- [ ] Nuove chiavi di traduzione fornite (IT/EN).
- [ ] Endpoint protetti (se la sicurezza è prevista dal progetto, vedi `security-backend.md`), input validati lato server, controlli di proprietà (anti-IDOR).
- [ ] Se la funzionalità tocca autenticazione, autorizzazione, upload, URL esterni o dati personali: security review eseguita (`security.md`).
- [ ] Per le stesse funzionalità sensibili: threat model leggero (ADR) approvato prima del codice, fail closed con test, upload con file ostili, link assoluti con test di `Host` ostile (`security-avanzata.md` «Progettazione sicura e fail closed», `security-backend.md`).
- [ ] Abuso di risorse e API: `pageSize` limitato, rate limit, timeout, `matchTimeout`, `no-store`, endpoint operativi non pubblici, webhook firmati (`security-backend.md`, «Abuso di risorse» e «Protezione dell'API»); eventi di sicurezza con alert, `SECURITY.md` e runbook (`security.md`).
- [ ] Migrazioni con l'utente database dedicato e connessione cifrata, nessun servizio interno esposto (`backend-app.md` §4.4, `security.md`).
- [ ] Migrazione EF inclusa, se il modello è cambiato.
- [ ] Nessuna nuova dipendenza non dichiarata e tutte gratuite con licenza permissiva.
- [ ] Test scritti per la nuova funzionalità (unit e integration test dove hanno senso, vedi §4).
- [ ] Integration test nel progetto `IntegrationTests` su database reale di prova, dove hanno senso (`backend-app.md` §4.5).
- [ ] Test di architettura verdi (solo Clean Architecture, `backend-architecture.md` §2b).
- [ ] Per ogni risorsa di un utente, test che un altro utente o tenant non la raggiunge (`backend-app.md` §4.6).
- [ ] Copertura sul codice nuovo o modificato ≥ 80% (§4).
- [ ] ▲ Nessun valore reale (chiavi JWT, password SMTP/Redis, ecc.) in `appsettings.json`: solo segnaposto; valori reali da variabili d'ambiente valorizzate da `.env`, elencati in `.env.example`.
- [ ] Se toccati Dockerfile o compose: `docker compose config` valido, immagine buildata, nessun segreto nei file, `.env.example` aggiornato.

## 4. Test e Qualità
- **Backend:** xUnit v3 per i progetti nuovi (un progetto esistente su xUnit v2 resta tale finché non si decide la migrazione per progetto), con due livelli: **unit test** (handler, validatori, servizi e logica di business isolati, con dipendenze sostituite, senza database né rete) e **integration test** (con `WebApplicationFactory`, per endpoint, pipeline e accesso ai dati). Ogni nuova funzionalità prevede entrambi i livelli dove hanno senso; se uno dei due non si applica, lo dichiari. Gli integration test, su database reale di prova, sono regolati da `backend-app.md` §4.5 (progetto dedicato, isolamento, privilegi, mock). **Struttura dei progetti di unit test:** in Clean Architecture, un progetto per livello, nominato `[Solution].UnitTests.<Livello>` (`Domain`, `Application`, `Infrastructure`, e `Api` solo se ha logica propria); ogni progetto referenzia solo il proprio livello e quelli da cui dipende, così una dipendenza vietata non compila. I test di architettura stanno in `[Solution].UnitTests.Architecture`, che referenzia tutti i livelli. Fake e builder condivisi da più livelli stanno in `[Solution].UnitTests.Shared`, solo se servono davvero a più di un progetto. In Vertical Slice resta un unico progetto `[Solution].UnitTests`. La struttura si registra nel `CLAUDE.md` del progetto. Se un test richiede un database diverso (es. SQLite), **chiedi prima di procedere**: SQLite non è mai una scelta di default, perché può comportarsi diversamente dal motore reale. Mai EF Core InMemory.
- **Frontend:** unit test ed E2E come da `frontend.md` §10.
- **Regola:** ogni nuova feature arriva con i suoi test.
- **Analisi statica:** analyzers Roslyn, `.editorconfig`, ESLint, Prettier. Build senza warning.
- **Copertura:** minimo 80% sulla logica di business (handler, validatori, servizi) del codice nuovo o modificato; la copertura non sostituisce test sensati. Si misura nel backend con `coverlet.collector` (MIT) e il report con `ReportGenerator` (Apache-2.0), nel frontend con la copertura di Vitest (provider v8); licenze e versioni si verificano al primo uso (§3) e gli strumenti si dichiarano come dipendenze. Per ogni bug corretto, un test che lo riproduce.
- **Test di contratto:** lo schema OpenAPI è versionato; una modifica incompatibile fa fallire la CI.
- **Accessibilità automatica:** `@axe-core/playwright` sulle pagine principali, con zero violazioni gravi.
- **Dati di test:** builder o fixture dedicati, indipendenti tra loro; i test non dipendono dall'ordine di esecuzione.
- **Progetti esistenti senza test:** Claude non retrofitta test su tutto il codice. Il codice che tocca o aggiunge ha test (la soglia dell'80% vale sul codice nuovo o modificato, non sull'intero progetto); prima di un refactoring di codice non coperto scrive test di caratterizzazione che fissano il comportamento attuale, in un commit `test` separato. Le lacune più ampie le segnala, senza colmarle di iniziativa.
- **Test rossi non correlati:** se build o test falliscono per cause estranee al lavoro in corso (test già rotti, ambiente), Claude non li corregge né li disabilita e non li nasconde: verifica sul codice non modificato (`git stash` solo se l'utente lo consente, oppure leggendo l'errore), li riporta nella consegna con l'errore così com'è e committa solo ciò che ha verificato. Mai `skip`, `Ignore` o soglie abbassate per far passare la suite. Scorciatoie vietate, con controllo automatico del plugin `kit` (`guard-patterns`): test saltati, attese arbitrarie nei test (`Task.Delay`, `Thread.Sleep`), `NoWarn` di progetto nei `.csproj` e `.props`, `catch` con blocco vuoto. Una deroga motivata si dichiara sulla riga con `kit-allow: <id> — <motivo>`.
- **Test instabili (flaky):** un test che passa e fallisce a parità di codice si segnala e si corregge alla causa (attese, orologio, ordine, dati condivisi); mai risolto con retry o sleep arbitrari.

