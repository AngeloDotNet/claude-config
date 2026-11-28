# Template di progetto per Claude Code

Repository di partenza per i nuovi progetti sviluppati con [Claude Code](https://claude.com/claude-code).

Contiene le regole di sviluppo (stack .NET + Angular, git flow, sicurezza, Docker come modulo opzionale) già organizzate nel formato che Claude Code carica da solo, più un `CLAUDE.md` da compilare per il progetto.

Le regole sono in italiano; i commenti di codice sono in italiano per default, mentre identificatori e messaggi di commit sono in inglese.

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
| [Come si usa, nei dettagli](http://wiki.aepserver.it/claude-config/uso) | Quale caso è il tuo (progetto nuovo, esistente senza regole, esistente con regole), il template come cartella a parte, `/kit:regole`, moduli da tenere per tipo di progetto |
| [Come funziona](http://wiki.aepserver.it/claude-config/funzionamento) | Caricamento delle regole, deroghe, cosa chiede Claude e cosa fa da solo |
| [Manutenzione](http://wiki.aepserver.it/claude-config/manutenzione) | Verifiche periodiche, risoluzione dei problemi, punti aperti, aggiornamento del template |

La documentazione completa è disponibile [qui](http://wiki.aepserver.it/claude-config/intro)

## Come si usa, in breve

Le regole non si "installano": si **copiano nel progetto** e Claude Code le legge da solo. Per un progetto nuovo, con il plugin `kit`, apri Claude Code nella cartella del progetto e lancia `/kit:avvia-progetto` (senza plugin, nella copia del template scrivi *"Avvia un nuovo progetto"*); negli altri casi (progetto esistente, solo regole Git, aggiornamento) vedi [Come si usa, nei dettagli](http://wiki.aepserver.it/claude-config/uso).

Il [plugin `kit`](http://wiki.aepserver.it/claude-config/plugin) rende tecnici i divieti (per esempio `push --force`, `reset --hard`, `--no-verify`) e la regola della domanda unica; si installa una volta per macchina:

```
claude plugin marketplace add AngeloDotNet/claude-config
claude plugin install kit@claude-config
```

**Dopo ogni rilascio il plugin non si aggiorna da solo**: ogni macchina resta sulla versione installata finché non la aggiorni, e le skill nuove o modificate (per esempio il campo `model`) non hanno effetto. Da una sessione Claude Code qualsiasi (sono comandi slash, non di shell), con la cartella del marketplace su `develop` o `main` se è registrato come `directory`:

1. `/plugin marketplace update claude-config`
2. `/plugin update kit@claude-config`
3. `/reload-plugins` (o riavvia la sessione)
4. `/plugin` per verificare che la versione sia quella del rilascio.

Un progetto con le regole del kit non riceve ancora gli aggiornamenti da solo: l'allineamento automatico all'avvio è in progettazione (`docs/adr/0004-sincronizzazione-automatica-regole.md`, ancora da approvare) e non è attivo. Fino ad allora si usa `/kit:regole`.

Con `KIT_CONFIG_TEMPLATE_DIR` impostata, il plugin lo ricorda da solo: una volta per sessione e per progetto, se la versione installata è più vecchia di quella nel template, Claude suggerisce questi comandi. Funziona solo dal primo aggiornamento che contiene il controllo, quindi il primo si fa a mano.

Le operazioni sui file di `/kit:regole` (copia per profilo, confronto, aggiornamento con `.bak`, spostamenti) le fa lo script `regole.mjs`, con i suoi test. L'elenco dei moduli (nome, cartella, profilo minimo, versione breve, descrizione) sta nel manifest del template, `_template/moduli.json`, non nel codice. I controlli del plugin stanno in sei script. I controlli su scrittura sono raggruppati: `guard-write` (segreti e pattern vietati, prima della scrittura), `check-write` (qualità e pratica, dopo la scrittura). Gli altri sono `guard-commands`, `limit-one-question`, `prompt-start` (regola della domanda unica, con il richiamo a piano e issue solo nei progetti con il kit e profilo diverso da `mini`, regole cambiate, versione del plugin più vecchia di quella nel template, una volta per sessione, e, finché non si risponde, la domanda sulla wiki del progetto) e `session-close` (promemoria a fine di ogni risposta: chiusura e sito di documentazione, più l'avviso sul cambio di modello, una volta per sessione). Il piano non è più un file controllato dagli hook: vive nelle issue, e la rilettura di `CLAUDE.md`, delle regole e delle issue aperte è la regola di `core.md` §6.16, che Claude applica a ogni sessione. Il comando `/kit:buongiorno` la ripete su richiesta, con il riepilogo del lavoro.

## Comandi del plugin

Il plugin aggiunge dieci comandi, che si lanciano solo su richiesta. Sono disponibili nel plugin:

- `/kit:buongiorno`: riprende il lavoro dalle issue del progetto (issue padre e sue sub-issue), e propone il primo passo.
- `/kit:buonasera`: salva lo stato dei lavori nelle issue (chiude le sub-issue verificate, registra la ripartenza sulla issue padre, apre le issue dei problemi nuovi), aggiorna senza conferma `README.md`, `CHANGELOG.md` e la wiki (se presente), propone la cancellazione dei file non più utili (solo con la tua conferma) e ricorda `/clear` o `/compact`.
- `/kit:avvia-progetto`: avvia un progetto nuovo in un solo percorso: domande di avvio (profilo compreso), copia delle regole e compilazione del `CLAUDE.md`.
- `/kit:regole`: copia le regole in un progetto che non le ha, o le aggiorna se le ha già (con conferma e `.bak`); usa la cartella corrente quando è valida, altrimenti chiede il percorso.
- `/kit:pr-develop` e `/kit:pr-main` si usano solo se la GitHub CLI è installata e autenticata (`gh --version`, `gh auth status`): altrimenti terminano subito e dicono cosa manca. `/kit:commit-passo` usa `gh` solo per le issue del lavoro o della serie, se la riga gh è «sì».
- `/kit:commit-passo`: crea i commit in sequenza e senza conferme intermedie (il lancio è il via libera), mai su `main` o `develop` (crea direttamente il branch di lavoro); apre issue per la serie solo con almeno tre commit, fuori da `mini` e se il lavoro non ne ha già una; chiede il tipo di commit solo se ambiguo e si ferma con una domanda solo nei casi anomali.
- `/kit:pr-develop`: apre con `gh` la PR dal branch di lavoro verso `develop`, con push e creazione senza altra conferma; si può lanciare anche da `/kit:commit-passo`, che a fine commit lo propone con una domanda; il merge (squash) resta all'utente.
- `/kit:pr-main`: apre con `gh` la PR da `develop` (o `release/*`, `hotfix/*`) verso il branch principale, dopo il controllo di `main` avanti rispetto a `develop`; il merge (merge commit) resta all'utente. Dopo il merge, con `/kit:pr-main pulizia`, verificato con `gh` che la PR risulta mergiata, cancella i branch di lavoro corrispondenti (locali e remoti) e allinea `main` e `develop` con `git pull --ff-only`, segnalando se serve la sincronizzazione di `main` in `develop`.
- `/kit:verifica`: controlla il lavoro corrente contro la checklist di consegna, poi esegue i controlli di una soluzione .NET, di un frontend Angular o di entrambi nei progetti fullstack, in base ai file toccati (build, test, lint, audit, formattazione) e riporta l'esito, senza modificare file.
- `/kit:revisione <tema>`: revisione in sola lettura di un tema (accessi API, EF Core, GDPR, accessibilità, colori, localizzazione, test, regole del progetto, sicurezza). Senza tema elenca i temi e chiede quale usare.
- `/kit:modelli`: mostra quali modelli sono stati usati nella sessione e per cosa (sessione, skill, subagent), leggendo il registro della sessione; sola lettura. Lo stesso log compare da solo, una volta per sessione, al primo cambio di modello.
