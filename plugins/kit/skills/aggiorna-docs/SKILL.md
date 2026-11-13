---
description: Aggiorna README.md e CHANGELOG.md del progetto, crea il README se manca, e scrive la voce di rilascio nel CHANGELOG quando l'utente lo chiede. Se il progetto ha un sito di documentazione esterno, aggiorna anche quello senza chiedere conferma, e ricorda per ogni progetto se il sito esiste e dove si trova. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-progetto]
disable-model-invocation: true
---

# Aggiornamento della documentazione

Rispondi in italiano. Una sola domanda per messaggio.

1. Individua la radice del repository del progetto (`git rev-parse --show-toplevel`). Il progetto si identifica con questo percorso, con `/` al posto di `\`.
2. Leggi in `~/.claude/kit-progetti.json` la voce del progetto. Se la voce `sito` manca, chiedi una sola domanda: il progetto ha un sito di documentazione esterno (sì/no)? Se sì, chiedi il percorso della cartella del sito. Salva la risposta nella voce del progetto: crea il file se non esiste, e aggiorna solo quella voce. Sì con percorso: `{ "esiste": true, "percorso": "..." }`. No: `{ "esiste": false, "chiesto": true }`, così il hook `prompt-start` non chiede più la wiki in questo progetto.
3. Aggiorna `CHANGELOG.md` del progetto, se esiste, con una voce per il lavoro di questa sessione nel formato del progetto (per il template: giorno, poi una sottosezione per intervento con **Perché**, **Cosa / Dove**, **Verifica**, **Note**). Se l'utente chiede un rilascio e indica la versione `X.Y.Z`, aggiungi in cima la sezione `### Rilascio X.Y.Z` con i punti salienti del ciclo, raggruppati per le categorie definite in `git.md` (sezione «Rilascio»). Non modificare il file di versione e non creare commit: il commit di bump resta separato e si fa solo su richiesta esplicita.
4. Se `README.md` non esiste, crealo con queste sezioni, in quest'ordine: titolo con una frase di scopo; requisiti; avvio rapido; configurazione (variabili d'ambiente, con rimando a `.env.example` e senza valori reali); comandi; struttura del repository; licenza. Se esiste, aggiornalo solo dove il lavoro cambia ciò che il README dice (comandi, installazione, configurazione, struttura). Non riscrivere il resto, nemmeno se è datato.
5. Se il progetto ha un sito (voce `sito` con `esiste: true`), aggiorna senza chiedere conferma le pagine del sito che descrivono ciò che è cambiato, nella cartella indicata, e solo quelle. Se nessuna pagina descrive il cambiamento, non modificare il sito e dillo nel riepilogo finale.
6. Verifica il formato di quanto hai scritto, prima di chiudere. Rileggi la voce di `CHANGELOG.md` e le sezioni di `README.md` che hai toccato, e confrontale con il formato di `core.md` §5b: un titolo `## AAAA-MM-GG` per ogni giorno, più recente in alto; una sottosezione `### titolo breve` per intervento, senza numero di versione nel titolo; etichette in grassetto **Perché:**, **Cosa / Dove:** (o **Cosa:** e **Dove:**), **Verifica:** e, se serve, **Note:**; nel `README.md` solo le sezioni che il lavoro ha cambiato. Se una voce non rispetta il formato, correggila. Se la correzione non è ovvia, chiedi una sola domanda prima di chiudere.
7. Non creare commit e non toccare altri file. Chiudi con l'elenco dei file modificati e di ciò che resta da verificare (build, test del sito).
