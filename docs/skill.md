# Comandi del plugin `kit`

Riepilogo delle diciannove skill del plugin, che si lanciano digitando `/kit:` seguito dal nome. Non partono mai da soli. Nessun comando ha opzioni con nome (`--flag`): quando c'è, l'argomento è uno solo e facoltativo, e se manca la skill lo chiede o usa il lavoro corrente.

| Comando | Cosa fa | Argomento (facoltativo) |
|---|---|---|
| `/kit:buongiorno` | Riprende il lavoro dal piano e dalla checklist (`PIANO.md`, `CHECKLIST.md`), riassume dove si è arrivati e propone il primo passo. | Nessuno |
| `/kit:buonasera` | Salva lo stato dei lavori in `PIANO.md` e i nuovi problemi in `CHECKLIST.md`. | Nessuno |
| `/kit:avvia-progetto` | Avvia un progetto nuovo: domande di avvio una per messaggio e compilazione del `CLAUDE.md`. | `[nome-progetto]`: nome del progetto |
| `/kit:copia-regole` | Copia le regole del template in un progetto che non le ha, con i moduli scelti in conversazione. | `[cartella-progetto]`: cartella di destinazione; se manca la chiede |
| `/kit:aggiorna-regole` | Confronta le regole di un progetto con il template; ogni file diverso si sovrascrive solo con conferma. | `[cartella-progetto]`: progetto da aggiornare; se manca la chiede |
| `/kit:consegna` | Controlla il lavoro corrente contro la checklist di consegna (`core.md` §0b) e segnala le voci mancanti. | Nessuno |
| `/kit:review-regole` | Revisione del codice contro le regole del progetto, in sola lettura. | `[percorso-o-branch]`: percorso o branch da rivedere; se manca usa il lavoro corrente |
| `/kit:commit-passo` | Crea i commit locali uno alla volta, mai su `main` o `develop`; piano in `piano-commit.md`; non richiede la GitHub CLI. | `[N]`: numero di commit da eseguire di fila senza ok a ciascuno, entro il tetto per lotto del `CLAUDE.md` |
| `/kit:pr-develop` | Apre con `gh` la PR dal branch di lavoro (`feature/*`, `bugfix/*`) verso `develop`; richiede la GitHub CLI installata e autenticata. | Nessuno |
| `/kit:pr-main` | Apre con `gh` la PR da `develop` (o `release/*`, `hotfix/*`) verso il branch principale; richiede la GitHub CLI installata e autenticata. | `[branch-sorgente]`: branch di partenza; se manca, il branch corrente se è `release/*` o `hotfix/*`, altrimenti `develop` |
| `/kit:aggiorna-docs` | Aggiorna `README.md`, `CHANGELOG.md` e, se esiste, il sito di documentazione. | `[cartella-progetto]`: progetto da aggiornare |
| `/kit:verifica` | Esegue i controlli di una soluzione .NET (ripristino, build, test, pacchetti vulnerabili, modello EF, spazi bianchi) senza modificare file. | `[cartella-soluzione]`: cartella con il `.sln`; se manca cerca nella radice del repository |
| `/kit:qualita-test` | Revisiona i test (falsa sicurezza, fragilità, duplicati) e propone test xUnit parametrici. | `[cartella-o-file]`: ambito dei test |
| `/kit:dati-efcore` | Guida il lavoro con EF Core: letture senza tracking, migrazioni, `DbContext`, query. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:accessi-api` | Guida autenticazione e autorizzazione di un'API ASP.NET Core. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:gdpr-dati` | Revisiona il backend rispetto ai principi GDPR; non è consulenza legale. | `[cartella-o-progetto]`: progetto da esaminare |
| `/kit:accessibilita-ui` | Revisiona e corregge l'accessibilità dell'interfaccia rispetto a WCAG 2.2. | `[cartella-o-componente]`: parte dell'interfaccia da esaminare |
| `/kit:colori-tema` | Costruisce o verifica la palette per i temi chiaro e scuro, con il contrasto misurato. | `[cartella-progetto]`: progetto da esaminare |
| `/kit:localizzazione` | Verifica il layout per testi tradotti più lunghi, RTL, ordine di lettura e zoom. | `[cartella-progetto]`: progetto da esaminare |

Dettagli di ogni comando: [README](../README.md) e pagina [Plugin](http://wiki.aepserver.it/claude-config/plugin) della wiki.
