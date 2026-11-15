---
description: Aggiorna le regole di un progetto che le ha già, confrontandole con il template: sovrascrive i file diversi, elimina quelli rimossi dal template e allinea le righe del CLAUDE.md legate alle regole, sempre con la conferma dell'utente e il vecchio come .bak. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-progetto]
disable-model-invocation: true
---

# Aggiornamento delle regole di un progetto

Rispondi in italiano. Una sola domanda per messaggio. Il template è la cartella indicata dalla variabile d'ambiente `KIT_CONFIG_TEMPLATE_DIR`.

1. Se la variabile non è impostata o la cartella non contiene `.claude/rules/core.md`, dillo e fermati.
2. Progetto: se è stato passato un argomento, è quello; altrimenti usa la cartella corrente se è un repository git, ha `.claude/rules/` e non coincide con il template (dillo in una riga e prosegui); altrimenti chiedi il percorso con una sola domanda. Verifica che esista e che non coincida con il template.
3. Se il progetto non ha `.claude/rules/`, fermati e suggerisci `/kit:copia-regole`.
4. Se il progetto ha `backend.md` ma non `backend-architecture.md` o `backend-app.md`, proponi di aggiungerli (sono tre moduli sempre insieme), con conferma.
5. Confronta ogni modulo del template (`.claude/rules/` e `.claude/rules-optional/`) con il file del progetto, cercato in `rules/` e poi in `rules-optional/`:
   - se è uguale, non fare nulla;
   - se è diverso, leggi la riga `> Versione x.y — ultima revisione: AAAA-MM-GG` in testa a entrambi i file e mostra il riassunto delle differenze con le due versioni; chiedi conferma prima di sovrascrivere, con una sola domanda; il vecchio file va salvato accanto come `<nome>.bak`. Se la versione (o, a parità, la data) del file del progetto è **più recente** di quella del template, o la riga manca in uno dei due, dillo esplicitamente nella domanda e raccomanda di non sovrascrivere: il file del progetto potrebbe avere modifiche proprie;
   - se il modulo esiste nel template ma non nel progetto, segnalalo come nuovo: non copiarlo senza una richiesta esplicita.
5b. **File di riferimento e di root.** Con la stessa procedura del punto 5 (differenze, versione se presente, una domanda, `.bak`) confronta quelli che il progetto ha già: `_template/avvio-progetto.md`, `_template/settings.example.json`, `_template/eslint.config.example.js`, `_template/ci/*` (copiati da `copia-regole`) e, solo se il progetto li ha, `NuGet.config` ed `.editorconfig`: questi due sono spesso personalizzati, quindi se differiscono mostra le differenze e raccomanda di tenere quello del progetto salvo richiesta. Non crearli se mancano.
6. File rimossi dal template: cerca in `.claude/rules/` e `.claude/rules-optional/` del progetto i moduli `.md` che non esistono più nel template (rimossi o rinominati). Se ce ne sono, elencali tutti con il motivo (per esempio «non più nel template» o «probabile rinomina in `<nuovo-nome>`») e chiedi **un solo ok** per cancellarli tutti; con l'ok ogni file viene prima salvato come `<nome>.bak` e poi cancellato. Senza ok non cancellare nulla. Non toccare file del progetto che non sono moduli del kit: se un `.md` ha l'aria di una regola propria del progetto (non compare in nessuna versione del template), non includerlo nell'elenco e chiedi cosa farne, con una domanda a parte.
7. Allinea il `CLAUDE.md` del progetto a quello del template, **solo** per le parti che dipendono dalle regole:
   - la sezione «Regole» (descrizione dei moduli, dei `paths:` e dei moduli opzionali);
   - la riga «Versione delle regole copiate» (`core.md` v[x.y] del [data], con la versione letta dall'intestazione del `core.md` appena allineato e la data di oggi);
   - la riga «Moduli rimossi o non attivati», coerente con i moduli presenti nel progetto dopo i passi precedenti.
   Mostra le differenze riga per riga, chiedi **un solo ok** prima di scrivere e salva il vecchio come `CLAUDE.md.bak`. Non toccare le sezioni specifiche del progetto (scopo, scelte architetturali, comandi, note). Se non è chiaro cosa sia generico e cosa specifico, o se una riga del progetto diverge dal template senza un motivo evidente, **non decidere**: fai una domanda per volta e attendi la risposta prima di proseguire.
8. Chiudi con il riepilogo: file uguali, aggiornati, saltati (con il motivo, per esempio «versione del progetto più recente»), nuovi nel template, rimossi (cancellati con `.bak` o lasciati) e righe del `CLAUDE.md` allineate. Se esiste già un `<nome>.bak` di una esecuzione precedente, non sovrascriverlo: usa `<nome>.bak2`, `.bak3`, ... e dillo.
9. Non creare commit.
