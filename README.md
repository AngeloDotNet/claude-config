# Template di progetto per Claude Code

Repository di partenza per i nuovi progetti sviluppati con [Claude Code](https://claude.com/claude-code).

Contiene le regole di sviluppo (stack .NET + Angular, git flow, sicurezza, Docker) già organizzate nel formato che Claude Code carica da solo, più un `CLAUDE.md` da compilare per il progetto.

Le regole sono in italiano; codice, identificatori e messaggi di commit che ne derivano sono in inglese.

> [!WARNING]
> Questo `README.md` descrive il template. In un progetto nuovo va **sostituito** con il README del progetto.

## Documentazione

<!--
La documentazione è nel sito [wiki.aepserver.it](http://wiki.aepserver.it/claude-config/intro) (sorgenti nella cartella `docs/claude-config` del repository `wiki`). Il sito è servito in HTTP; HTTPS verrà aggiunto in seguito.
-->

| Documento | Contenuto |
|---|---|
| [Cosa contiene](http://wiki.aepserver.it/claude-config/contenuto) | Struttura del repository, moduli delle regole, cartella `_template/` e plugin |
| [Plugin `kit`](http://wiki.aepserver.it/claude-config/plugin) | Hook personali (domanda unica, comandi vietati, regole aggiornate) e comandi `/kit:...`: installazione, aggiornamento, migrazione |
| [Come si usa, nei dettagli](http://wiki.aepserver.it/claude-config/uso) | Quale caso è il tuo (progetto nuovo, esistente senza regole, esistente con regole), il template come cartella a parte, `/kit:copia-regole` e `/kit:aggiorna-regole`, moduli da tenere per tipo di progetto |
| [Come funziona](http://wiki.aepserver.it/claude-config/funzionamento) | Caricamento delle regole, deroghe, cosa chiede Claude e cosa fa da solo |
| [Manutenzione](http://wiki.aepserver.it/claude-config/manutenzione) | Verifiche periodiche, risoluzione dei problemi, punti aperti, aggiornamento del template |

La documentazione completa è disponibile [qui](http://wiki.aepserver.it/claude-config/intro)

## Come si usa, in breve

Le regole non si "installano": si **copiano nel progetto** e Claude Code le legge da solo. Apri Claude Code nella cartella del progetto e scrivi, per un progetto nuovo, *"Avvia un nuovo progetto"*; negli altri casi (progetto esistente, solo regole Git, aggiornamento) vedi [Come si usa, nei dettagli](http://wiki.aepserver.it/claude-config/uso).

Il [plugin `kit`](http://wiki.aepserver.it/claude-config/plugin) rende tecnici i divieti (per esempio `push --force`, `reset --hard`, `--no-verify`) e la regola della domanda unica; si installa una volta per macchina:

```
claude plugin marketplace add AngeloDotNet/claude-config
claude plugin install kit@claude-config
```

I controlli del plugin stanno in sei script. I controlli su scrittura sono raggruppati: `guard-write` (segreti e pattern vietati, prima della scrittura), `check-write` (piano, qualità e pratica, dopo la scrittura). Gli altri sono `guard-commands`, `limit-one-question`, `prompt-start` (regola della domanda unica, regole cambiate e, finché non si risponde, la domanda sulla wiki del progetto) e `session-close` (promemoria a fine di ogni risposta: piano, chiusura e sito di documentazione). I controlli sono tredici in tutto. Non c'è più un hook che inserisce il piano a inizio sessione: la rilettura di `CLAUDE.md`, delle regole e di `PIANO.md` è la regola di `core.md` §6.16, che Claude applica a ogni sessione. Il comando `/kit:buongiorno` la ripete su richiesta, con il riepilogo del lavoro.

## Comandi del plugin

Il plugin aggiunge ventuno comandi, che si lanciano solo su richiesta. Sono disponibili nel plugin:

- `/kit:buongiorno`: riprende il lavoro dal piano e dalla checklist, e propone il primo passo.
- `/kit:buonasera`: salva lo stato dei lavori in `PIANO.md` e i problemi in `CHECKLIST.md`, aggiorna senza conferma `README.md`, `CHANGELOG.md` e la wiki (se presente), propone la cancellazione dei file non più utili (solo con la tua conferma) e ricorda `/compact`.
- `/kit:avvia-progetto`: avvia un progetto nuovo con le domande di avvio, e compila il `CLAUDE.md`.
- `/kit:copia-regole`: copia le regole in un progetto che non le ha (usa la cartella corrente quando è valida, altrimenti chiede il percorso).
- `/kit:aggiorna-regole`: aggiorna le regole di un progetto (file diversi, moduli rimossi dal template e righe del `CLAUDE.md` legate alle regole), con conferma e `.bak`.
- `/kit:consegna`: controlla il lavoro corrente contro la checklist di consegna.
- `/kit:review-regole`: revisione del codice secondo le regole del progetto.
- `/kit:pr-develop` e `/kit:pr-main` si usano solo se la GitHub CLI è installata e autenticata (`gh --version`, `gh auth status`): altrimenti terminano subito e dicono cosa manca. `/kit:commit-passo` non richiede `gh`.
- `/kit:commit-passo`: crea i commit in sequenza e senza conferme intermedie (il lancio è il via libera), mai su `main` o `develop` (crea direttamente il branch di lavoro), con piano in `piano-commit.md`; chiede il tipo di commit solo se ambiguo e si ferma con una domanda solo nei casi anomali.
- `/kit:pr-develop`: apre con `gh` la PR dal branch di lavoro verso `develop`, con push e creazione senza altra conferma; si può lanciare anche da `/kit:commit-passo`, che a fine commit lo propone con una domanda; il merge (squash) resta all'utente.
- `/kit:pr-main`: apre con `gh` la PR da `develop` (o `release/*`, `hotfix/*`) verso il branch principale, dopo il controllo di `main` avanti rispetto a `develop`; il merge (merge commit) resta all'utente. Dopo il merge, quando lo confermi, elenca i branch di lavoro cancellabili (locali e remoti), cancella solo quelli che confermi e allinea `main` e `develop` con `git pull --ff-only`, segnalando se serve la sincronizzazione di `main` in `develop`.
- `/kit:aggiorna-docs`: aggiorna README, CHANGELOG e, se esiste, il sito di documentazione, senza chiedere conferma; crea il README se manca e scrive la voce di rilascio su richiesta.
- `/kit:verifica`: esegue i controlli di una soluzione .NET (ripristino, formattazione, build senza avvisi, test, pacchetti vulnerabili, modello EF, compose, spazi bianchi) e riporta l'esito, senza modificare file.
- `/kit:sicurezza`: controlla le voci di sicurezza della consegna sul lavoro corrente (threat model, test con input ostili, fail closed, abuso di risorse, log e alert, `SECURITY.md`), lancia `/security-review` e unisce i risultati, senza modificare file.
- `/kit:verifica-frontend`: esegue i controlli di un frontend Angular (installazione, lint, formattazione, test con copertura, build di produzione, audit npm, `any`, colori fissi, traduzioni) e riporta l'esito, senza modificare file.
- `/kit:qualita-test`: revisiona i test (falsa sicurezza, fragilità, duplicati) e propone test xUnit parametrici e leggibili.
- `/kit:dati-efcore`: guida il lavoro con EF Core (letture senza tracking, migrazioni, `DbContext`, ottimizzazione delle query).
- `/kit:accessi-api`: guida autenticazione e autorizzazione di un'API ASP.NET Core (schemi, policy, handler, scope, claim).
- `/kit:gdpr-dati`: revisiona il backend rispetto ai principi GDPR (minimizzazione, conservazione, log, diritti). Non è consulenza legale.
- `/kit:accessibilita-ui`: revisiona l'accessibilità dell'interfaccia rispetto a WCAG 2.2 e propone le correzioni, senza modificare file.
- `/kit:colori-tema`: costruisce o verifica la palette per i temi chiaro e scuro, con il contrasto misurato.
- `/kit:localizzazione`: verifica il layout per testi tradotti più lunghi, RTL, ordine di lettura e zoom.

Tabella riepilogativa con gli argomenti di ogni comando: [`docs/skill.md`](docs/skill.md). Dettagli nella pagina [Plugin](http://wiki.aepserver.it/claude-config/plugin).

## Limiti noti

- I controlli sul codice C# (`check-practice` e `guard-patterns` del plugin `kit`, eseguiti dagli script `check-write` e `guard-write`) lavorano riga per riga. Un membro pubblico scritto su più righe, o con attributi complessi, può sfuggire: la revisione del codice resta necessaria.

## Licenza

[MIT](LICENSE).
