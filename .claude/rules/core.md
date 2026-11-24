# Regole Core (sempre caricate)

> Versione 4.0 — ultima revisione: 2026-11-23.
> Questo file contiene il minimo che vale in ogni progetto. Il profilo (`mini`, `standard`, `strutturato`) è dichiarato nel `CLAUDE.md`. Il resto sta nei moduli indicati qui sotto, con la stessa numerazione, e si carica nei profili `standard` e `strutturato`.
> **Mappa:** §1 e §2 in `contratto.md`; §5 e §5a in `operativita.md`; §5b in `documentazione.md`; §5c in `git.md` e `git-flusso.md`; §6 punti 15, 16, 19, 21, 22 in `workflow.md`.

## Regola inviolabile: nel dubbio, una domanda alla volta
**MUST, sempre attiva, senza che l'utente debba ricordarla o richiederla.** Se c'è un dubbio, un'ambiguità o più strade ragionevoli, Claude **non decide in autonomia e non procede per assunzione**: si ferma, pone **una sola domanda**, e **attende la risposta** prima di fare altro che ne dipenda.
- Una domanda per messaggio e per decisione, mai elenchi. Vale anche con lo strumento di domande interattivo (`AskUserQuestion`): **una sola domanda per chiamata**, mai 2-4 insieme, anche se sembrano indipendenti.
- Prevale su qualsiasi tendenza a "procedere quando si hanno abbastanza informazioni". Se le informazioni non bastano, o la scelta spetta all'utente, si chiede.
- Dettagli ed eccezioni (ovvio e reversibile senza costi): §6, punto 5.

## 0. Come leggere queste regole
- **Priorità:** il `CLAUDE.md` di progetto prevale su questi file in caso di conflitto. Se il conflitto non è chiaro, chiedi.
- **Valore delle regole:** ciò che è scritto con "sempre", "mai", "vietato", "obbligatorio" è **MUST/NEVER**: si deroga solo con approvazione esplicita dell'utente. Ciò che è scritto con "preferisci", "preferita", "valuta" è **PREFER**: è il default, modificabile se c'è un motivo che Claude dichiara.
- **Motivazioni:** quando una regola ha un "perché", rispettane lo scopo anche nei casi limite non previsti.

Checklist di consegna (§0b) e test e qualità (§4): in `qualita.md`, con la stessa numerazione.

## 3. Dipendenze e Licenze
- **Solo software gratuito e open source con licenza permissiva** (MIT, Apache-2.0, BSD). Mai pacchetti a pagamento, con licenza commerciale o con funzioni essenziali nel tier a pagamento. Licenze copyleft (GPL, LGPL, AGPL) solo previa approvazione esplicita.
- **Eccezione per i servizi di infrastruttura esterni e non modificati** (PostgreSQL, Redis, RabbitMQ, ecc.): non sono librerie collegate al codice, quindi la loro licenza non si estende all'applicazione. SQL Server è ammesso solo nelle edizioni Express/Developer o con licenza già in possesso del cliente. Quando proponi il motore, segnala questo vincolo di licenza di SQL Server.
- **Eccezione axe-core (strumenti di test di accessibilità):** `axe-core` e `@axe-core/playwright` sono ammessi anche se la loro licenza è copyleft debole (MPL-2.0, per quanto noto), perché si usano solo in sviluppo e in CI, non entrano nella build distribuita e non vengono modificati. La licenza attuale si verifica al primo uso sul repository ufficiale, senza darla per scontata; l'eccezione non si estende ad altre librerie copyleft.
- **PrimeNG solo versione gratuita (open source):** mai componenti, template o servizi PrimeNG a pagamento (PrimeBlocks, Premium Templates, licenze Pro).
- **Niente servizi cloud a pagamento** (Azure, AWS, Google Cloud o simili) per identità, segreti, storage, code, database o monitoraggio: tutto è self-hosted in container.
- Se una soluzione richiede una funzione a pagamento, Claude la segnala e propone un'alternativa gratuita.
- **Audit:** `npm audit` e `dotnet list package --vulnerable --include-transitive` (transitive incluse) eseguiti a ogni passo del piano che aggiunge o aggiorna pacchetti e in CI a ogni PR, con `NuGetAudit` attivo nel build (gestione degli avvisi `NU190x` con `TreatWarningsAsErrors`: `backend.md` §2); aggiornamenti automatici (Dependabot/Renovate). Un pacchetto vulnerabile si aggiorna, oppure si segnala all'utente con il motivo se non esiste una correzione: mai ignorato. Versioni fisse tramite lock file. Source mapping NuGet, `npm ci --ignore-scripts`, attesa del bot sulle versioni nuove e pinning delle GitHub Actions: `security.md` («Supply chain»).

## 5b. Changelog e README (minimo)
- **CHANGELOG.md:** creato e aggiornato da Claude **a ogni step del piano**, non solo al rilascio. Formato e lingua: `documentazione.md` (§5b).
- **README.md:** creato e aggiornato a ogni step che cambia comportamento, configurazione o struttura. Dettagli in `documentazione.md` (§5b).

## 5c. Git (minimo)
Regole minime in `git.md`; il flusso completo (branch, messaggi, integrazione GitHub) in `git-flusso.md`.

## 6. Regole di Interazione con l'Utente (minime)
Gli altri punti del §6 (15, 16, 19, 21, 22 e i restanti) stanno in `workflow.md`, con la stessa numerazione.

5. **Nel dubbio, ferma e chiedi** (regola inviolabile in testa a questo file): per qualsiasi aspetto dello sviluppo (requisiti, dati, architettura, librerie, sicurezza, interfaccia, test, git, documentazione), se c'è un dubbio, un'ambiguità o più strade ragionevoli, Claude **non decide in autonomia e non procede per assunzione**. Si ferma e pone all'utente **domande precise, sempre una alla volta in tutto il workflow** (avvio, requisiti, piano, git, sicurezza, ogni altro punto): una sola domanda per messaggio e per decisione, e **attende la risposta prima di porre la successiva o di procedere**; mai elenchi di domande insieme, nemmeno quando sembrano indipendenti (se ne servono molte, le pone in sequenza, la più bloccante per prima), con il contesto minimo per rispondere e, quando utile, le opzioni con pro e contro e una raccomandazione motivata. Non scrive codice che dipende dalla risposta finché non l'ha ricevuta. Può invece proseguire con le parti non influenzate dal dubbio, dichiarando cosa ha lasciato in sospeso. Le risposte che valgono oltre il caso singolo vanno nel `CLAUDE.md` di progetto (come già per le scelte "chiesto, non presunto", elencate in `avvio-progetto.md` §1b). Non serve chiedere ciò che le regole o il `CLAUDE.md` già stabiliscono, né ciò che è ovvio e reversibile senza costi (es. il nome di una variabile locale). **Deroga approvata per il profilo `mini`:** le voci «chiesto, non presunto» del `CLAUDE.md` prendono il default dichiarato nel `CLAUDE.md` stesso (sezione «Progetto», riga «Default del profilo `mini`») senza domanda; restano da chiedere le voci elencate lì.
7. **Verifica:** esegui build e test prima di dichiarare concluso un compito. Riporta gli errori così come sono, senza minimizzarli.
8. **Dipendenze:** non aggiungere pacchetti senza dichiarare nome, versione e motivo. Preferisci quelli già presenti.
9. **Lingua:** identificatori (nomi di classi, metodi, variabili, file) in inglese; **commenti di codice in italiano, di default, per ogni commento** (anche i commenti XML `<summary>`), salvo richiesta esplicita diversa dell'utente; spiegazioni e risposte in italiano; messaggi di commit in inglese.
11. **Azioni git e distruttive:** commit, push, tag, PR, rilasci (con `gh`) e pipeline seguono `git-flusso.md`, in particolare «Integrazione GitHub». Mai `reset --hard`, `push --force`, cancellazione di branch o di dati senza conferma (eccezione: i piani `.md` di Claude, punto 15c).
14. **Segnalazione di conflitti:** se una richiesta contraddice queste regole (es. una dipendenza a pagamento, un `any`), dillo e proponi l'alternativa conforme prima di eseguire.
