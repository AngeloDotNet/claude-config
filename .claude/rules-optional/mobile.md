# Sviluppo mobile: regole di base (opzionale)

> Versione 1.0 — ultima revisione: 2026-11-27.
> Modulo opzionale, da `.claude/rules-optional/`: si attiva solo se il progetto ha un client mobile (`CLAUDE.md`, «Sviluppo mobile»), spostandolo in `.claude/rules/` e annotandolo nel `CLAUDE.md`. Richiede `core.md` e `security.md`; per la sicurezza backend, `security-backend.md`.

## Regole di base
Queste sono le regole di base per un'app mobile che parla con il backend; il riferimento completo è OWASP MASVS (gruppi di controlli: storage, crittografia, autenticazione, rete, piattaforma, codice, resilienza, privacy; elenco e versione da verificare alla fonte al primo uso, non a memoria).
- **Storage:** token e segreti solo nel contenitore sicuro della piattaforma (Keychain su iOS, Keystore su Android, tramite il plugin del framework scelto), mai in preferenze, file o database in chiaro; nessun segreto del backend nell'app (il pacchetto è decompilabile).
- **Rete:** solo HTTPS con verifica del certificato; il pinning del certificato o della chiave pubblica è una scelta da concordare per progetto (aumenta la sicurezza ma richiede un piano di rotazione, altrimenti l'app smette di funzionare).
- **Autenticazione:** Authorization Code con PKCE tramite browser di sistema (mai credenziali in una WebView incorporata); token a vita breve e rinnovabili come da «Autenticazione e Autorizzazione» in `security-backend.md`; sblocco biometrico solo come comodità locale, mai come unico fattore lato server.
- **Dati e log:** nessun dato personale o token nei log, negli screenshot di sistema o negli appunti; backup del dispositivo e anteprime dell'app valutati per i dati sensibili.
- **Link e piattaforma:** deep link validati come ogni input esterno (`Open redirect` compreso); permessi richiesti al minimo.
- **Build:** debug disattivato e codice offuscato dove la piattaforma lo prevede, build di release firmate. Il rilevamento di root o jailbreak non è un controllo di sicurezza affidabile: non si introduce di iniziativa.
- **Test:** si estendono i test di input ostili alla superficie mobile; la scelta della tecnologia mobile e le sue regole dedicate si chiedono al progetto (`CLAUDE.md`, «Sviluppo mobile»).


