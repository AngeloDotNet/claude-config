---
description: Revisione in sola lettura di un tema del progetto (accessi API, EF Core, GDPR, accessibilità, colori, localizzazione, test, regole del progetto, sicurezza). Propone, non modifica file. Si lancia solo su richiesta, con il tema come argomento.
model: sonnet
argument-hint: <tema> [cartella-o-percorso]
disable-model-invocation: true
disallowed-tools: Edit Write NotebookEdit
---

# Revisione per tema

Rispondi in italiano. Una sola domanda per messaggio. Sola lettura: non modificare nessun file.

Temi disponibili (ognuno ha la sua procedura nella cartella `temi/` di questa skill):
- `accessi-api`: autenticazione e autorizzazione di un'API ASP.NET Core;
- `dati-efcore`: Entity Framework Core (letture senza tracking, migrazioni, `DbContext`, query);
- `gdpr-dati`: backend rispetto ai principi GDPR (non è consulenza legale);
- `accessibilita-ui`: accessibilità dell'interfaccia rispetto a WCAG 2.2;
- `colori-tema`: palette per i temi chiaro e scuro, con il contrasto misurato;
- `localizzazione`: layout per testi tradotti più lunghi, RTL, ordine di lettura e zoom;
- `qualita-test`: test che danno falsa sicurezza, fragili o duplicati, e test xUnit o Vitest proposti;
- `review-regole`: codice contro le regole presenti in `.claude/rules/` del progetto;
- `sicurezza`: voci di sicurezza della consegna (threat model, input ostili, fail closed, log e alert), con `/security-review`.

1. Se manca il tema, elenca i temi con una riga ciascuno e chiedi con una sola domanda quale usare.
2. Leggi `temi/<tema>.md` in questa cartella e segui la procedura che contiene. Se il tema non esiste, dillo e fermati.
3. Ambito: se è passato un percorso, esamina quello; altrimenti il lavoro corrente (`git status`, `git diff`). Se l'ambito non è chiaro, chiedi una sola domanda.
4. Per la build, i test e il lint di una soluzione o di un frontend non si usa questa skill: usa `/kit:verifica`.
