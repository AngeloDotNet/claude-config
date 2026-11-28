# 0004. Sincronizzazione automatica delle regole all'avvio di Claude Code

**Stato:** proposta (2026-11-28), da approvare prima del codice (#137, parte di #135). Finché non è accettata, il codice dell'automatismo non si scrive.

## Contesto
Un progetto che ha già le regole del kit (`.claude/rules/`, `.claude/rules-optional/`, tre parti di `CLAUDE.md`, file di riferimento in `_template/`) resta indietro ogni volta che il template cambia. Oggi l'allineamento è manuale: si lancia `/kit:regole`, si confronta, si copia o si sposta a mano. Il rischio è duplice: regole vecchie in uso, oppure un aggiornamento fatto alla cieca che sovrascrive modifiche locali del progetto.

Il lavoro tecnico è in `scripts/regole.mjs`, che già confronta, copia, sposta e rimuove file, ma non sa chi è cambiato e non registra nulla. Un hook che agisce all'avvio scrive file e crea branch da solo: è un'azione automatica su progetti altrui, quindi va trattata come superficie sensibile (threat model qui sotto).

Il comportamento del caricamento delle regole in sessione è già stato misurato (#135, analisi): con un hook `SessionStart` che cambia regole senza `paths:`, la stessa sessione vede ancora le vecchie, mentre `--resume` e una nuova sessione vedono le nuove. Le prove in sessione interattiva non sono ancora fatte (#136).

## Decisione
1. **Avvio:** l'automatismo parte da solo con un hook `SessionStart`. Resta **spento per default** fino al passo di attivazione (#144).
2. **Origine:** l'ultimo tag `X.Y.Z` del repository locale del template (`KIT_CONFIG_TEMPLATE_DIR`), letto senza cambiare branch. Tag con prefisso `v` ignorati. Non si fa `fetch` né `pull` dal remoto. Modifiche non committate o successive al tag non entrano.
3. **Ambito:** solo progetti che hanno già `.claude/rules/`. Un progetto senza regole non viene toccato; la prima copia resta a `/kit:regole`.
4. **Registro `.claude/kit-regole.json`, versionato**, con versione, impronte dei file, posizioni, parti del progetto, scelte su conflitti e moduli. Nessun percorso locale e nessun dato personale.
5. **Sincronizzazione per file:**
   - file non modificati dall'utente: aggiornati, spostati o rimossi in automatico;
   - file personalizzati in conflitto: lasciati invariati finché Claude non chiede, **un file alla volta**, se tenere il proprio o applicare il template (con copia di salvataggio). La domanda si ripropone solo se il template cambia quel file;
   - regole proprie del progetto mai toccate; moduli attivati a mano rispettati.
6. **Primo avvio senza registro:** i file identici si registrano; per ogni file diverso Claude chiede.
7. **Modulo nuovo** (anche obbligatorio): Claude spiega a cosa serve e chiede se aggiungerlo.
8. **`CLAUDE.md`:** la sezione «Regole», la versione copiata e i moduli rimossi o non attivati si aggiornano in automatico solo se non sono personalizzate; altrimenti Claude mostra le differenze e chiede. Parti non riconoscibili non si toccano; le altre sezioni non si toccano mai.
9. **Ambito dei file:** inclusi i file di riferimento in `_template/` già presenti. Esclusi `NuGet.config` e `.editorconfig`, per i quali non si creano file mancanti.
10. **Copie di salvataggio** in `.claude/kit-backup/AAAA-MM-GG-HHMM/`, con la struttura originale e un `.gitignore` proprio.
11. **Branch:** su `main` o `develop` l'allineamento avviene su un branch `bugfix/` creato da `develop`, senza commit. Con modifiche non committate o senza `develop`, l'hook non modifica nulla e chiede.
12. **Cambiamenti a sessione avviata:** se qualcosa è cambiato, anche `CLAUDE.md`, Claude chiede di chiudere e riaprire la sessione prima di lavorare.
13. **In caso di errore o dubbio** l'hook non modifica nulla e lo segnala.

## Threat model
**Asset:** file di regole e `CLAUDE.md` del progetto; lavoro non committato dell'utente; branch e cronologia git; il registro; altri progetti sulla stessa macchina.

**Attori:** l'utente; Claude (che esegue l'hook); il repository del template in locale (fonte fidata solo per i suoi tag, ma il suo contenuto è dato); altri repository aperti sulla macchina (dati non fidati); chi scrive nel registro o nel progetto (manomissione).

| # | Abuso | Mitigazione | Test che la verifica |
|---|---|---|---|
| T1 | Registro manomesso per far credere «non modificato» un file personalizzato, o viceversa | Le impronte si ricalcolano dal contenuto attuale; il registro indica solo lo stato precedente, non decide da solo; schema validato | Registro con impronte false: nessuna sovrascrittura silenziosa |
| T2 | Percorsi nel registro o nei file che escono dalla radice del progetto (`..`, assoluti, link simbolici) | Ogni percorso è normalizzato e confinato alla radice; i link simbolici sono rifiutati | Casi di `..`, assoluto, symlink e junction: rifiuto, nessuna scrittura fuori |
| T3 | Template con contenuto ostile o tag inatteso | Si copiano solo file di testo attesi dal manifest; nessuno script del template viene eseguito; nessun `fetch`; tag `X.Y.Z` soltanto | Tag `v…` ignorato; file fuori dal manifest non copiato |
| T4 | Perdita di modifiche dell'utente (sovrascrittura, errore a metà) | Conflitto mai sovrascritto senza domanda; copia di salvataggio prima di ogni modifica; se un passo fallisce, nessuna modifica resta a metà | Errore simulato a metà: ripristino e messaggio; conflitto invariato |
| T5 | Due sessioni che scrivono insieme | Lock file con scadenza; seconda sessione non scrive | Due avvii concorrenti: una sola scrittura |
| T6 | Commit o modifica su `main` o `develop` | Solo branch `bugfix/` da `develop`, senza commit; con modifiche non committate, nessuna modifica | Esecuzione su `main` e su `develop` con e senza modifiche |
| T7 | Agire su repository altrui con una propria `.claude/rules/` | Riconoscimento del progetto del kit (decisione aperta, #135); eventuale esclusione per progetto | Repository senza marcatore del kit: nessun effetto |
| T8 | Dati personali o percorsi locali nel registro, versionato e quindi pubblicabile | Registro senza percorsi né dati personali; scritto con campi fissi | Il registro generato non contiene percorsi assoluti né l'utente |
| T9 | Effetti ripetuti a ogni avvio | Esecuzione idempotente: una seconda esecuzione senza nuovi tag non cambia nulla | Doppia esecuzione: nessuna differenza |
| T10 | Automatismo attivo su codice non finito, su tutti i progetti | Spento per default fino al passo di attivazione; attivazione solo dopo i test di #136 | Verifica che il default sia spento |
| T11 | Regole cambiate a sessione avviata e risposte incoerenti | Richiesta di riavvio della sessione prima di lavorare | Cambio durante la sessione: messaggio di riavvio |

**Rischio residuo:** un tag del template compromesso viene copiato in tutti i progetti che si allineano. La fonte è la macchina dell'utente; la protezione è la revisione dei rilasci prima del tag, non l'hook.

## Conseguenze
- Il registro diventa un file versionato nei progetti: va committato con le regole, e il suo formato è un contratto da mantenere.
- L'automatismo scrive in progetti altrui: per questo resta spento fino ai test di #136 e di #144.
- Lo script `regole.mjs` cresce: confronto per impronta, registro, lock e backup. I test restano nel plugin (#144).
- Il caricamento delle regole in una sessione già aperta richiede riavvio, come da analisi di #135.

## Decisioni aperte (da chiedere una alla volta, prima del passo che le usa)
- Branch di lavoro con modifiche non committate: allineare lì o rimandare (prima del passo 6).
- Riconoscimento del progetto del kit ed eventuale esclusione per progetto (prima del passo 7).
- Eventi di avvio oltre a `startup` (`resume`, `clear`) (prima del passo 7).
- Modulo nuovo rifiutato: non richiederlo ai rilasci successivi (proposta; prima del passo 5).
- Cosa resta a `/kit:regole` (prima copia, file di root, allineamento manuale) (prima del passo 8).
