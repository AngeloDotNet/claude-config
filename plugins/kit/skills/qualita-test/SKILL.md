---
description: Revisiona i test di un progetto o di un diff cercando test che danno falsa sicurezza, test fragili e duplicati, e propone come scrivere test xUnit parametrici e leggibili; controlla anche i test frontend (Vitest e Playwright) e le scorciatoie vietate (test saltati, EF InMemory, mock di DbContext). Non modifica file. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-file]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Qualità dei test

**Prima di tutto**, come prima riga della risposta, scrivi «Modello in uso: <nome del modello come dichiarato nel tuo contesto>» (serve a vedere l'effetto del campo `model`).

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill revisiona i test e segnala i problemi, con una gravità per ciascuno (bloccante, importante, suggerimento: `lavoro.md`, «Gravità dei rilievi»). Le regole di base (livelli di test, dati indipendenti, nessun `skip`) stanno in `core.md` §4 e `backend-app.md` §4.5: qui si applica la procedura di revisione.

1. **Ambito.** Individua i file di test nella cartella o nel diff indicato. Se l'ambito non è chiaro, chiedi una sola domanda prima di cominciare.
2. **Falsa sicurezza (gravità bloccante).** Segnala i test che non possono fallire o che verificano meno di quanto dicono:
   - nessuna asserzione, o solo asserzioni che sono sempre vere;
   - asserzioni su valori che il test stesso ha prodotto, senza collegamento con il comportamento;
   - test che ripetono la logica dell'implementazione invece di verificarne il risultato;
   - eccezioni attese con un tipo troppo generico, che accetta errori diversi da quello previsto.
3. **Fragilità (gravità importante).** Segnala i test che dipendono da:
   - l'ordine di esecuzione o dai dati lasciati da altri test;
   - l'ora corrente o il fuso orario della macchina (vedi `backend.md` §2, voce «Tempo»: `TimeProvider` per test deterministici);
   - attese arbitrarie: `Task.Delay`, `Thread.Sleep` (già bloccati dal guard, vedi `core.md` §4);
   - risorse condivise tra test, come file, porte o database.
3b. **Scorciatoie vietate (gravità bloccante).** Cerca nel codice di test ciò che `core.md` §4 e `backend-app.md` §4.5 vietano; il guard le blocca in scrittura, ma qui si cercano anche nel codice già presente:
   - test saltati o isolati: `Skip =` nel `[Fact]` o `[Theory]`, `Assert.Skip`, `[Ignore]`, `.skip`, `xit`, `.only`;
   - EF Core InMemory (`UseInMemoryDatabase`, pacchetto `Microsoft.EntityFrameworkCore.InMemory`) al posto del database di prova;
   - mock di `DbContext` o `DbSet` in un progetto il cui `CLAUDE.md` non ha «Mock EF nei test unitari: sì», o per servizi che toccano il `DbContext`;
   - soglie di copertura abbassate, `catch` vuoti o retry per far passare un test instabile.
3c. **Test frontend (Vitest e Playwright, `frontend.md` §10).** Se l'ambito include `*.spec.ts` o i test Playwright, segnala in più:
   - asserzioni deboli (solo `toBeTruthy` o `toBeDefined`) e `it.fails` usato per far passare la suite invece di documentare un difetto noto;
   - `waitForTimeout` o `setTimeout` al posto dell'attesa di uno stato osservabile (importante);
   - elementi cercati per classe CSS invece che per ruolo o etichetta (`getByRole`, `getByLabel`), router o signal mockati (si mockano solo HTTP e servizi di browser), `fakeAsync`/`tick` in un progetto zoneless;
   - stato condiviso tra test (`localStorage` non ripulito, `vi.restoreAllMocks()` o `vi.useRealTimers()` mancanti) e dati E2E che dipendono da altri test;
   - nessun caso ostile per il codice che tocca input, token o storage (`security.md`, test con input malevoli).
4. **Duplicati e manutenibilità (gravità suggerimento).** Quando più test differiscono solo per i dati, proponi un test parametrico con `[Theory]` e `[InlineData]`, o `[MemberData]` per dati complessi. Un test per concetto: più asserzioni sono accettabili se verificano lo stesso risultato.
5. **Nomi e asserzioni.** Il nome del test dice il comportamento verificato e la condizione, in inglese come ogni identificatore (`core.md` §6.9), per esempio `Discount_applied_when_total_exceeds_threshold`. Le asserzioni sono specifiche: uguaglianza su valori attesi, non solo «non è nullo». Dove la libreria lo permette, usa asserzioni con messaggio leggibile.
6. **Isolamento.** Nei test unitari le dipendenze sono sostituite, senza database. Nei test di integrazione i dati sono creati dal test stesso con builder o fixture (`core.md` §4).
7. **Esito.** Chiudi con un elenco per gravità: il file, la riga, il problema e la correzione proposta. Non modificare i file: le correzioni si applicano con una richiesta separata.

Riferimenti: `core.md` §4; `backend-app.md` §4.5; `backend.md` §2 (voce «Tempo»); `frontend.md` §10; `security.md` («Test di sicurezza automatici»).
