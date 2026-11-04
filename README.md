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
| [Plugin `kit`](http://docs-claude-config.aepserver.it/plugin) | Hook personali (domanda unica, comandi vietati, piano a inizio sessione, regole aggiornate): installazione, aggiornamento, migrazione |
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

## Limiti noti

- I controlli sul codice C# (`check-practice` e `guard-patterns` del plugin `kit`) lavorano riga per riga. Un membro pubblico scritto su più righe, o con attributi complessi, può sfuggire: la revisione del codice resta necessaria.

## Licenza

[MIT](LICENSE).
