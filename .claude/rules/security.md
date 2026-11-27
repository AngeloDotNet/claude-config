# Sicurezza: segreti e principi minimi (profilo mini)

> Versione 3.1 — ultima revisione: 2026-11-25.
> Richiede `core.md`. Sono le regole minime per ogni progetto. Il resto (OWASP Top 10 e ASVS, progettazione sicura, crittografia, supply chain, log di sicurezza) è in `security-avanzata.md` (standard e strutturato) e in `security-strutturato.md` (solo strutturato); le regole backend e frontend in `security-backend.md` e `security-frontend.md`.

## Dati e Segreti
▲ Verificato dal plugin `kit`: hook `guard-secrets` (valori reali in `appsettings*.json`, password in chiaro in compose e Dockerfile, chiavi PEM, token JWT bloccati).
- **Nessun segreto nel repository:** User Secrets in sviluppo; in produzione variabili d'ambiente valorizzate da `.env` fuori dal repository.
- **Le password non sono mai in chiaro**, né nei log, né nel repository.
- **Segreto compromesso o finito per errore nel repository:** si considera bruciato e va sostituito, non solo rimosso.
- **Log:** nessun dato personale né segreto nei log.
- **Dati di test:** mai dati reali di produzione; usa dati sintetici o anonimizzati.

## Regola operativa
- **Rischio** (es. disabilitare CORS o la validazione): Claude lo segnala prima di procedere.
- **Security review** (`/security-review`) prima della consegna, con esito riportato, se si toccano autenticazione, autorizzazione, upload, URL esterni, query dinamiche o dati personali (non per modifiche cosmetiche o di documentazione). Il problema si corregge in un commit `fix(security)` o, se esula dal compito, si segnala.
- **Test con input malevoli** per ogni modifica a input, autenticazione, upload o dati: rifiuto controllato, mai 500 né dato elaborato.
