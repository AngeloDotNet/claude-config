# Note di verifica delle fonti

Questo file non è caricato da Claude: raccoglie le date di lettura e di verifica delle fonti citate nelle regole, così che i moduli restino più corti. Le regole stanno nei moduli di `.claude/rules/`; qui c'è solo la storia della verifica. Quando una fonte cambia, si aggiorna la nota e si verifica di nuovo la regola.

## Versione e licenza di pacchetti e strumenti
La regola è in `core.md` §3: si verificano versione e licenza sulla fonte ufficiale prima dell'uso.

- **Strumenti di osservabilità** (`osservabilita.md`): licenze verificate il 2026-10-25 sui repository ufficiali. Prometheus, OpenTelemetry Collector e Jaeger sono Apache-2.0; Grafana è AGPL-3.0-only.
- **Strumenti di sicurezza e licenze** (`security-avanzata.md`, «Supply chain»): licenze verificate il 2026-10-25 per `license-checker-rseidelsohn` e `nuget-license`.
- **OWASP ZAP** (`security-strutturato.md`, «Scansione dinamica»): Apache-2.0, verificato il 2026-11-04.

## Fonti di sicurezza
- **OWASP ASVS 5.0.0** (`security-strutturato.md`, «Mappa ASVS»): elenco dei titoli letto il 2026-11-04 su `github.com/OWASP/ASVS/tree/v5.0.0/5.0/en`. Il livello di ogni requisito (L1, L2, L3) non è stato letto requisito per requisito: il testo dell'ASVS va consultato per il livello scelto.

## Fonti tecniche
- **Strategia di identificatori** (`backend.md`, «Dati»): `CreateVersion7()` su SQL Server, dopo benchmark sullo schema reale. Le fonti web non ufficiali sono discordi; verificato il 2026-11-13.
- **Gli ID e le impostazioni del Roslyn e dei SDK** (`security-avanzata.md`, «Crittografia»): si verificano al primo uso sulla versione del SDK installata. Non sono stati riletti dalla documentazione nella sessione che ha scritto la regola.
