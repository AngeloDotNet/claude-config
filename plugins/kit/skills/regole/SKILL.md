---
description: Gestisce le regole Claude di un progetto. Se il progetto non le ha, le copia dal template con i moduli e il profilo scelti (caso A). Se le ha già, le confronta con il template e le aggiorna con conferma (caso B). Si lancia solo su richiesta, con la cartella del progetto come argomento.
model: sonnet
argument-hint: [cartella-progetto]
disable-model-invocation: true
---

# Regole del progetto: copia o aggiornamento

Rispondi in italiano. Una sola domanda per messaggio. Questa skill ha due casi: il caso A copia le regole in un progetto che non le ha; il caso B confronta e aggiorna le regole di un progetto che le ha già. Il caso si decide al passo 3 del caso A (o del caso B), in base a `.claude/rules/`.

## Lo script dei file
Copie, confronti, aggiornamenti, spostamenti e cancellazioni li fa lo script `scripts/regole.mjs` del plugin (`node "${CLAUDE_PLUGIN_ROOT}/scripts/regole.mjs" <comando> …`; se la variabile non è sostituita, il percorso è `../../scripts/regole.mjs` rispetto alla cartella di questa skill). Non copiare né spostare file di regole a mano. Lo script stampa JSON; se esce con errore, riporta il messaggio così com'è e fermati, senza aggirarlo. A te restano le domande, le conferme e i conflitti.

## Caso A: copia delle regole

Rispondi in italiano. Una sola domanda per messaggio. Il template è la cartella indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR`.

1. Se la variabile non è impostata o la cartella non contiene `.claude/rules/core.md`, dillo e fermati.
2. **Progetto di destinazione.** Se è stato passato un argomento, è quello (con precedenza su tutto). Altrimenti usa la cartella corrente se è valida: non coincide con il template (`KIT_CONFIG_TEMPLATE_DIR`), non ha ancora `.claude/rules/` ed è un repository git (`git rev-parse --show-toplevel`); in tal caso scrivi in una riga «Copio le regole in `<cartella>`» e prosegui senza chiedere. Se la cartella corrente non è valida (per esempio è il template), chiedi il percorso con una sola domanda. In ogni caso verifica che la cartella esista e non coincida con il template.
3. Se il progetto ha già `.claude/rules/`, passa al caso B.
4. Chiedi se il progetto è **solo Git** (solo branch e commit: nessun backend, frontend o sicurezza previsti). Con «sì» non chiedere profilo, moduli né `NuGet.config` e `.editorconfig`: passa al punto 6.
5. **Profilo e moduli** (solo con «no» al punto 4). Se il `CLAUDE.md` del progetto ha già il campo «Profilo», usa quello; altrimenti chiedi, con una sola domanda, `strutturato` (default), `standard` o `mini`. Poi chiedi, una per volta e in quest'ordine, se includere: il backend, il frontend Angular, le regole di sicurezza estese (`security.md` non si chiede: si copia sempre, perché i suoi obblighi valgono in ogni profilo) e, tra i moduli opzionali, `feature-workflow.md`, `backend-email.md`, `backend-infra.md`. `docker.md` non si chiede: si attiva solo su richiesta esplicita dell'utente e lo script lo mette sempre in `.claude/rules-optional/`, non caricato; dillo nel riepilogo. Dove vada ogni modulo per profilo (versioni brevi dello `standard` comprese) lo decide lo script.
6. **File di root.** Chiedi, uno per volta e solo per quelli che mancano: `NuGet.config`, `.editorconfig`, `.gitignore`, `.gitattributes` (con «solo Git» solo gli ultimi due). `CLAUDE.md` non si chiede: lo script lo copia se manca e, se esiste, tocca solo la riga «Profilo» quando non è dichiarata. Un profilo già dichiarato non si cambia.
7. **Esecuzione.** `copia --template "<template>" --target "<progetto>"` seguito da `--solo-git`, oppure da `--profilo <valore>` e, secondo le risposte, `--backend`, `--frontend`, `--sicurezza-estesa`, `--opzionali a,b`; con i file di root scelti, `--root file,file`. Lancia prima la stessa riga con `--dry-run`: mostra in breve cosa verrà copiato o saltato, poi eseguila senza dry-run, senza chiedere altre conferme. Lo script copia anche in `_template/` i file di consultazione (`avvio-progetto.md`, `settings.example.json`, `eslint.config.example.js`, `ci/`): non sono attivi, l'attivazione si decide dopo con `avvio-progetto.md`. Non sovrascrive file esistenti.
8. Chiudi con il riepilogo di cosa è stato copiato e saltato e con il prossimo passo: aprire Claude Code nel progetto, compilare i campi del `CLAUDE.md` rimasti a segnaposto (per un progetto esistente: «Applica le regole di questo progetto») e verificare con `/context`.
9. Non creare commit.

## Caso B: aggiornamento delle regole

Rispondi in italiano. Una sola domanda per messaggio. Il template è la cartella indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR`.

1. Se la variabile non è impostata o la cartella non contiene `.claude/rules/core.md`, dillo e fermati.
2. Progetto: se è stato passato un argomento, è quello; altrimenti usa la cartella corrente se è un repository git, ha `.claude/rules/` e non coincide con il template (dillo in una riga e prosegui); altrimenti chiedi il percorso con una sola domanda. Verifica che esista e che non coincida con il template.
3. Se il progetto non ha `.claude/rules/`, passa al caso A.
4. **Confronto**, in sola lettura: `confronta --template "<template>" --target "<progetto>"`. Il JSON riporta `profilo` (`null` se non dichiarato), `uguali`, `diversi`, `nuovi`, `rimossi`, `fuoriPosto` e `obbligatoriMancanti`. Un progetto è «solo Git» se ha soltanto `core`, `lavoro`, `git-flusso` e `workflow`: in quel caso ignora `obbligatoriMancanti`.
5. **Moduli mancanti.** Per quelli in `obbligatoriMancanti` (compreso `security`) proponi di copiarli con un solo ok. Se il progetto ha `backend.md`, proponi nello stesso modo i mancanti tra `backend-architecture`, `backend-app` e `osservabilita`. Ogni modulo si copia con `aggiorna … --file <cartella>/<nome>.md`: la cartella è `.claude/rules`, oppure `.claude/rules-optional` per i moduli che il profilo dichiarato non carica; con lo `standard`, per `git-flusso`, `workflow`, `qualita` e `documentazione` copia anche il testo completo con `--file .claude/rules-optional/dettaglio/<nome>.md`. Gli altri nomi in `nuovi` si segnalano soltanto: non si copiano senza una richiesta esplicita.
5b. **File diversi.** Per ogni voce di `diversi` mostra il riassunto delle differenze con le due versioni e chiedi conferma, una domanda alla volta; con l'ok esegui `aggiorna … --file <file>`, che salva prima il vecchio come `.bak` (o `.bak2`, …). Con `progettoPiuRecente` o `versioneMancante` dillo esplicitamente nella domanda e raccomanda di non sovrascrivere: il file del progetto potrebbe avere modifiche proprie. `NuGet.config` ed `.editorconfig` sono spesso personalizzati: raccomanda di tenere quello del progetto salvo richiesta; non crearli se mancano.
6. **Rimossi e fuori posto.** Per `rimossi` (moduli che il template non ha più) elencali con il motivo (per esempio «non più nel template» o «probabile rinomina in `<nuovo-nome>`"; per `git.md` il contenuto è in `core.md` §5c, per `git-avanzato.md` è in `git-flusso.md`) e chiedi **un solo ok**; con l'ok esegui `rimuovi … --file <file>` per ognuno (salva il `.bak` e cancella). Se un file ha l'aria di una regola propria del progetto (non è mai stato un modulo del kit), non includerlo e chiedi cosa farne, con una domanda a parte. Per `fuoriPosto` proponi gli spostamenti con una domanda sola; con l'ok `sposta … --file <file> --a <atteso>`. Con `profilo` a `null` non dedurre il profilo dai moduli presenti e non spostare nulla.
7. Allinea il `CLAUDE.md` del progetto a quello del template, **solo** per le parti che dipendono dalle regole:
   - la sezione «Regole» (descrizione dei moduli, dei `paths:` e dei moduli opzionali);
   - la riga «Versione delle regole copiate» (`core.md` v[x.y] del [data], con la versione letta dall'intestazione del `core.md` appena allineato e la data di oggi);
   - la riga «Moduli rimossi o non attivati», coerente con i moduli presenti nel progetto dopo i passi precedenti.
   Mostra le differenze riga per riga, chiedi **un solo ok** prima di scrivere e salva il vecchio come `CLAUDE.md.bak`. Non toccare le sezioni specifiche del progetto (scopo, scelte architetturali, comandi, note). Se non è chiaro cosa sia generico e cosa specifico, o se una riga del progetto diverge dal template senza un motivo evidente, **non decidere**: fai una domanda per volta e attendi la risposta prima di proseguire.
8. Chiudi con il riepilogo: file uguali, aggiornati, saltati (con il motivo, per esempio «versione del progetto più recente»), nuovi nel template, rimossi (cancellati con `.bak` o lasciati) e righe del `CLAUDE.md` allineate. Per il `CLAUDE.md`, che modifichi tu, se esiste già un `.bak` di una esecuzione precedente non sovrascriverlo: usa `.bak2`, `.bak3`, ... e dillo.
9. Non creare commit.
