---
description: Guida la configurazione dell'autenticazione e dell'autorizzazione di un'API ASP.NET Core: schemi di autenticazione, policy, handler, autorizzazione sugli endpoint, scope e mappatura dei claim. Si lancia solo su richiesta.
argument-hint: [cartella-o-progetto]
disable-model-invocation: true
---

# Accessi alle API

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill applica i vincoli di `security.md` (autenticazione e autorizzazione, protezione dell'API) con le procedure di configurazione. Se il progetto non ha ancora scelto tra ASP.NET Core Identity e un identity provider self-hosted come Keycloak, chiedi quale usare prima di configurare: la scelta sta nel `CLAUDE.md`.

1. **Schema di autenticazione.** Scegli lo schema in base al client: cookie per l'applicazione web con sessione, JWT bearer per le API chiamate da altri client, OIDC per il login delegato a un identity provider. Dichiara lo schema predefinito in modo esplicito.
2. **Ordine della pipeline.** `UseAuthentication` precede `UseAuthorization`, e entrambi stanno prima degli endpoint che li richiedono. Un ordine errato lascia gli endpoint aperti senza errori.
3. **Autorizzazione con policy.** Usa policy con nome, costruite su requisiti, invece di controlli sui ruoli in stringa. Ogni endpoint dichiara la sua autorizzazione, anche quando è pubblica (con un attributo esplicito di accesso anonimo). Una politica di fallback copre gli endpoint che non dichiarano nulla.
4. **Handler personalizzati.** Un handler serve quando la policy non esprime la regola. Più handler possono rispondere allo stesso requisito: un solo successo basta. Un handler dichiara il successo con `Succeed`; non usare `Fail` per scartare, perché blocca anche gli altri handler.
5. **Autorizzazione per risorsa.** Quando la regola dipende dalla risorsa (il proprietario di un ordine, per esempio), il controllo usa il contesto della risorsa caricata, e non un parametro dell'URL.
6. **Scope delle API.** Separa il permesso del client (lo scope del token) dal permesso dell'utente (i claim). Un controllo richiede spesso entrambi: verificane il significato con il progetto.
7. **Mappatura dei claim.** Disattiva la mappatura automatica dei claim per avere nomi stabili e leggibili. Ogni claim usato nelle policy è dichiarato in un solo punto.
8. **Token e sessione.** Il token contiene solo i claim necessari (`security.md`). Il ciclo di vita (durata, rinnovo, revoca) è quello scelto nel `CLAUDE.md`. Il sign-out pulisce sia la sessione sia i token salvati.
9. **Trappole comuni.** Cookie troppo grandi per i token salvati, loop di redirect dopo il login, scope non azzerati prima di aggiungerne di nuovi, ruoli in stringa invece di policy, handler non registrati.
10. **Test.** Ogni regola di accesso ha un test di integrazione che verifica il rifiuto (accesso negato, utente sbagliato, ruolo sbagliato) e il successo. Il test usa il database di prova (`backend-app.md` §4.5).
11. **Esito.** Chiudi con l'elenco degli endpoint controllati, per ciascuno la sua autorizzazione, e i problemi trovati, per gravità. Le modifiche si applicano con una richiesta separata.

Riferimenti: `security.md` («Autenticazione e Autorizzazione», «Protezione dell'API»); `backend-app.md` §4.6; `CLAUDE.md` (identity scelto e ciclo dei token).
