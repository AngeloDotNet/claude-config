# Template di progetto per Claude Code

Repository di partenza per i nuovi progetti sviluppati con [Claude Code](https://claude.com/claude-code).

Contiene le regole di sviluppo (stack .NET + Angular, git flow, sicurezza, Docker) già organizzate nel formato che Claude Code carica da solo, più un `CLAUDE.md` da compilare per il progetto.

Le regole sono in italiano; codice, identificatori e messaggi di commit che ne derivano sono in inglese.

> [!WARNING]
> Questo `README.md` descrive il template. In un progetto nuovo va **sostituito** con il README del progetto.

## Documentazione

<!--
La documentazione è nel sito [docs-claude-config.aepserver.it](http://docs-claude-config.aepserver.it/) (sorgenti nel repository `claude-config-docs`). Il sito è servito in HTTP; HTTPS verrà aggiunto in seguito.
-->

| Documento | Contenuto |
|---|---|
| [Cosa contiene](http://docs-claude-config.aepserver.it/contenuto) | Struttura del repository, moduli delle regole, cartella `_template/` e plugin |
| [Plugin `kit`](http://docs-claude-config.aepserver.it/plugin) | Hook personali (domanda unica, comandi vietati, piano a inizio sessione, regole aggiornate) e comandi `/kit:...`: installazione, aggiornamento, migrazione |
| [Come si usa, nei dettagli](http://docs-claude-config.aepserver.it/uso) | Quale caso è il tuo (progetto nuovo, esistente senza regole, esistente con regole), il template come cartella a parte, `copia-regole.bat`, moduli da tenere per tipo di progetto |
| [Come funziona](http://docs-claude-config.aepserver.it/funzionamento) | Caricamento delle regole, deroghe, cosa chiede Claude e cosa fa da solo |
| [Manutenzione](http://docs-claude-config.aepserver.it/manutenzione) | Verifiche periodiche, risoluzione dei problemi, punti aperti, aggiornamento del template |

La documentazione completa è disponibile [qui](http://docs-claude-config.aepserver.it/)

## Come si usa, in breve

Le regole non si "installano": si **copiano nel progetto** e Claude Code le legge da solo. Apri Claude Code nella cartella del progetto e scrivi, per un progetto nuovo, *"Avvia un nuovo progetto"*; negli altri casi (progetto esistente, solo regole Git, aggiornamento) vedi [Come si usa, nei dettagli](http://docs-claude-config.aepserver.it/uso).

Il [plugin `kit`](http://docs-claude-config.aepserver.it/plugin) rende tecnici i divieti (niente `git init`, push, PR, tag o rilasci) e la regola della domanda unica; si installa una volta per macchina:

```
claude plugin marketplace add AngeloDotNet/claude-config
claude plugin install kit@claude-config
```

## Comandi del plugin

Il plugin aggiunge sedici comandi, che si lanciano solo su richiesta. Sono disponibili dalla versione 1.9.0 del plugin, in arrivo:

- `/kit:buongiorno`: riprende il lavoro dal piano e dalla checklist, e propone il primo passo.
- `/kit:buonasera`: salva lo stato dei lavori in `PIANO.md` e i problemi in `CHECKLIST.md`.
- `/kit:avvia-progetto`: avvia un progetto nuovo con le domande di avvio, e compila il `CLAUDE.md`.
- `/kit:copia-regole`: copia le regole in un progetto che non le ha.
- `/kit:aggiorna-regole`: aggiorna le regole di un progetto, con conferma per ogni file.
- `/kit:consegna`: controlla il lavoro corrente contro la checklist di consegna.
- `/kit:code-review`: revisione del codice secondo le regole del progetto.
- `/kit:aggiorna-docs`: aggiorna README, CHANGELOG e, se esiste, il sito di documentazione; crea il README se manca e scrive la voce di rilascio su richiesta.
- `/kit:verifica`: esegue i controlli di una soluzione .NET (ripristino, build, test, pacchetti vulnerabili, modello EF, spazi bianchi) e riporta l'esito, senza modificare file.
- `/kit:qualita-test`: revisiona i test (falsa sicurezza, fragilità, duplicati) e propone test xUnit parametrici e leggibili.
- `/kit:dati-efcore`: guida il lavoro con EF Core (letture senza tracking, migrazioni, `DbContext`, ottimizzazione delle query).
- `/kit:accessi-api`: guida autenticazione e autorizzazione di un'API ASP.NET Core (schemi, policy, handler, scope, claim).
- `/kit:gdpr-dati`: revisiona il backend rispetto ai principi GDPR (minimizzazione, conservazione, log, diritti). Non è consulenza legale.
- `/kit:accessibilita-ui`: revisiona e corregge l'accessibilità dell'interfaccia rispetto a WCAG 2.2.
- `/kit:colori-tema`: costruisce o verifica la palette per i temi chiaro e scuro, con il contrasto misurato.
- `/kit:localizzazione`: verifica il layout per testi tradotti più lunghi, RTL, ordine di lettura e zoom.

Dettagli nella pagina [Plugin](http://docs-claude-config.aepserver.it/plugin).

## Limiti noti

- I controlli sul codice C# (`check-practice` e `guard-patterns` del plugin `kit`) lavorano riga per riga. Un membro pubblico scritto su più righe, o con attributi complessi, può sfuggire: la revisione del codice resta necessaria.

## Licenza

[MIT](LICENSE).
