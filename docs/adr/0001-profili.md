# 0001. Profili di adozione: mini, standard, strutturato

**Stato:** accettata (2026-11-23), decisioni di #83. Tutte le decisioni aperte del piano sono chiuse.

## Contesto
Le regole sono pensate per un progetto grande e strutturato: ASVS, threat model, DAST, runbook, osservabilità, RPO/RTO, ADR. Applicate uguali a uno script interno, costano più di quanto proteggono e caricano circa 105 KB di regole in ogni sessione. Serve un modo per dichiarare quanto è grande il progetto e applicare solo gli obblighi che servono.

## Decisione
1. Il progetto dichiara un **profilo** nel `CLAUDE.md`, come riga `Profilo: mini | standard | strutturato`.
2. Ogni obbligo ha un **profilo minimo**: si applica da quel profilo in su. Ogni regola nuova dichiara il proprio.
3. Il **profilo fissa il minimo, la funzionalità fa scattare l'obbligo**: un upload, un'autenticazione o un dato personale attivano le regole corrispondenti in qualunque profilo, anche in `mini`.
4. Restano sempre **da chiedere** all'utente, in ogni profilo, le decisioni irreversibili: tipo di progetto, architettura backend, motore di database, ORM, autenticazione, dati personali.
5. **Compatibilità:** i progetti già avviati restano sul profilo `strutturato` finché non migrano esplicitamente.
6. **Basso rischio:** Claude decide da solo le scelte reversibili senza costi che hanno già un default in regole o `CLAUDE.md`, le annota nel `CLAUDE.md` del progetto e le elenca nel riepilogo finale. Restano domande: dati, sicurezza, dipendenze, licenze, migrazioni, struttura, API pubbliche, costi.

## Mappa obbligo → profilo minimo

| Obbligo | Fonte | Profilo minimo |
|---|---|---|
| Lingua: codice e commit in inglese, spiegazioni in italiano | `core.md` §6.9 | mini |
| Conventional Commits, branch di lavoro, nessun `push --force`, nessun `--no-verify` | `git.md` | mini |
| Nessun segreto nel repository, valori reali da variabili d'ambiente | `security.md`, «Dati e Segreti» | mini |
| Build e test verdi prima di dichiarare chiuso un passo | `core.md` §6.7, §6.21 | mini |
| Dipendenze gratuite con licenza permissiva; lock file committato | `core.md` §3 | mini |
| Log tramite `ILogger`, nessun dato personale nei log | `osservabilita.md` | mini |
| `CHANGELOG.md` aggiornato a ogni rilascio; `README.md` minimo | `core.md` §5b | mini |
| Piano come issue padre con sub-issue per il lavoro non piccolo | `core.md` §6.15 | standard (sotto la soglia di §6.15c: nessun piano) |
| Problemi trovati lavorando come issue, una per problema | `core.md` §6.22 | standard |
| Test per ogni funzionalità nuova; test con input malevoli su input, auth e dati | `qualita.md` (§4), `security-avanzata.md` | standard |
| Commenti XML in inglese sui membri pubblici | `core.md` §5b | standard |
| Audit dei pacchetti (`npm audit`, `dotnet list package --vulnerable`) | `core.md` §3 | standard |
| Analyzer di sicurezza Roslyn, algoritmi crittografici moderni | `security-avanzata.md`, «Crittografia» | standard |
| Migrazione EF inclusa quando il modello cambia | `core.md` §0b | standard |
| Ambienti dev e prod separati, sezione Docker su richiesta | `core.md` §5a | standard |
| ADR per le scelte che deviano dalle regole | `core.md` §5b | standard |
| Fail closed con test; `ValidateOnStart` su configurazioni di sicurezza | `security-avanzata.md`, «Progettazione sicura» | standard |
| Copertura ≥ 80% sul codice nuovo | `core.md` §4 | strutturato |
| Threat model (ADR) prima del codice per funzionalità sensibili | `security-avanzata.md`, «Progettazione sicura» | strutturato |
| Endpoint protetti di default, test di ruoli e proprietà (anti-IDOR) | `security-avanzata.md`, «Test di sicurezza automatici» | strutturato |
| Log di sicurezza con eventi nominati, alert, retention | `security-avanzata.md`, «Log di sicurezza e allerta» | strutturato |
| Livello ASVS, DAST con ZAP, `SECURITY.md`, runbook | `security-avanzata.md` | strutturato |
| Utenti del database separati e connessione cifrata | `backend-app.md` §4.4 | strutturato |
| Integration test su database reale di prova | `backend-app.md` §4.5 | strutturato |
| Repository, Specification, Clean Architecture | `backend-architecture.md` §2b–§2c | strutturato (default: no) |
| Osservabilità OpenTelemetry, Prometheus, Grafana | `osservabilita.md` | strutturato |
| Rate limit, timeout, `pageSize` massimo | `security-backend.md`, «Abuso di risorse» | strutturato |
| Dipendenze: nome, versione e motivo dichiarati prima di aggiungere un pacchetto | `core.md` §6.8 | mini |
| Funzionalità con autenticazione, upload o dato personale: security review prima della consegna e test con input malevoli (regola 3 di questo ADR: si attiva con la funzionalità) | `security-avanzata.md`, «Regola operativa» e «Test di sicurezza automatici» | mini (si attiva con la funzionalità) |
| Chiavi di traduzione IT/EN fornite con ogni superficie UI (Definition of Done) | `workflow.md` §6, punto 6 | standard |
| Test di architettura, solo con Clean Architecture | `backend-architecture.md` §2b | strutturato |

## Conseguenze
- Un progetto `mini` legge solo le righe con profilo `mini`; `standard` e `strutturato` aggiungono le proprie. La tabella è l'elenco da cui derivano i moduli del passo 3.
- Le regole nei file di `.claude/rules/` devono dichiarare il profilo minimo in modo leggibile. Il passo 3 lo applicherà.
- I progetti esistenti restano su `strutturato` finché non migrano: nessun obbligo nuovo appare senza un cambio di profilo.
- La tabella va rivista quando cambia una regola; non è una seconda copia delle regole, rimanda alle fonti.
