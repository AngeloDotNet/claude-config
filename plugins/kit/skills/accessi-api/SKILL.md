---
description: Revisiona e guida la configurazione dell'autenticazione e dell'autorizzazione di un'API ASP.NET Core (propone, non modifica file): schemi di autenticazione, policy, handler, autorizzazione sugli endpoint, scope e mappatura dei claim. Si lancia solo su richiesta.
model: sonnet
argument-hint: [cartella-o-progetto]
---

# Accessi alle API

Rispondi in italiano. Una sola domanda per messaggio.

Questa skill applica i vincoli di `security-backend.md` (autenticazione e autorizzazione, protezione dell'API) con le procedure di configurazione. Se il progetto non ha ancora scelto tra ASP.NET Core Identity e un identity provider self-hosted come Keycloak, chiedi quale usare prima di configurare: la scelta sta nel `CLAUDE.md`. Verifica prima che nel `CLAUDE.md` siano registrate le decisioni obbligatorie di `security-backend.md` (il progetto richiede autenticazione, ciclo di vita dei JWT se previsti, granularità: solo autenticazione, ruoli, policy o permessi, extra come MFA o registrazione): quelle mancanti sono un rilievo e si chiedono una per volta, non si presumono.

1. **Schema di autenticazione.** Scegli lo schema in base al client: cookie per l'applicazione web con sessione, JWT bearer per le API chiamate da altri client, OIDC per il login delegato a un identity provider. Dichiara lo schema predefinito in modo esplicito.
2. **Ordine della pipeline.** `UseAuthentication` precede `UseAuthorization`, e entrambi stanno prima degli endpoint che li richiedono. Un ordine errato lascia gli endpoint aperti senza errori.
3. **Autorizzazione con policy.** Usa policy con nome, costruite su requisiti, invece di controlli sui ruoli in stringa. Ogni endpoint dichiara la sua autorizzazione, anche quando è pubblica (con un attributo esplicito di accesso anonimo). Una politica di fallback copre gli endpoint che non dichiarano nulla.
4. **Handler personalizzati.** Un handler serve quando la policy non esprime la regola. Più handler possono rispondere allo stesso requisito: un solo successo basta. Un handler dichiara il successo con `Succeed`; non usare `Fail` per scartare, perché blocca anche gli altri handler.
5. **Autorizzazione per risorsa.** Quando la regola dipende dalla risorsa (il proprietario di un ordine, per esempio), il controllo usa il contesto della risorsa caricata, e non un parametro dell'URL.
6. **Scope delle API.** Separa il permesso del client (lo scope del token) dal permesso dell'utente (i claim). Un controllo richiede spesso entrambi: verificane il significato con il progetto.
7. **Mappatura dei claim.** Disattiva la mappatura automatica dei claim per avere nomi stabili e leggibili. Ogni claim usato nelle policy è dichiarato in un solo punto.
8. **Token e sessione.** Il token contiene solo i claim necessari (`security-backend.md`). Il ciclo di vita (durata, rinnovo, revoca) è quello scelto nel `CLAUDE.md`. Il sign-out pulisce sia la sessione sia i token salvati.
9. **Trappole comuni.** Cookie troppo grandi per i token salvati, loop di redirect dopo il login, scope non azzerati prima di aggiungerne di nuovi, ruoli in stringa invece di policy, handler non registrati.
10. **Cookie e CSRF.** Con i cookie di sessione: `HttpOnly`, `Secure`, `SameSite=Lax` di default (`None` solo motivato), scadenza assoluta e di inattività da configurazione, antiforgery sulle richieste mutanti (`security-backend.md`, «Protezione dell'API»).
11. **CORS e redirect.** CORS con whitelist esplicita di origini; mai `AllowAnyOrigin` insieme alle credenziali; `Vary: Origin` se l'origine varia. I redirect (`returnUrl`, `redirect_uri`) accettano solo percorsi locali o URL in allow-list.
12. **Accesso, lockout e abuso.** Login non enumerante (messaggio generico, anche su reset password e registrazione). Lockout temporaneo con ritardi crescenti, mai permanente, affiancato dal limite per IP. Rate limit più stretto su login, reset password e registrazione, con `429` e `Retry-After`. Dopo cambio o reset della password, e dopo un cambio di ruolo, sessioni e refresh token esistenti sono invalidati.
13. **Rinnovo e revoca (solo se scelti).** Il refresh token è monouso con rotazione; il riuso di uno già usato revoca l'intera famiglia e registra l'evento. MFA per i ruoli amministrativi e ri-autenticazione per le azioni sensibili (cambio di password o email, disattivazione dell'MFA) se il progetto le ha scelte.
14. **Test.** Ogni regola di accesso ha un test di integrazione che verifica il rifiuto (accesso negato, utente sbagliato, ruolo sbagliato) e il successo. Il test usa il database di prova (`backend-app.md` §4.5).
15. **Esito.** Chiudi con l'elenco degli endpoint controllati, per ciascuno la sua autorizzazione, e i problemi trovati, per gravità (bloccante, importante, suggerimento: `lavoro.md`, «Gravità dei rilievi»). Le modifiche si applicano con una richiesta separata.

Riferimenti: `security-backend.md` («Autenticazione e Autorizzazione», con la voce «Completamenti dell'autenticazione»; «Protezione dell'API»; «Abuso di risorse»); `backend-app.md` §4.6; `CLAUDE.md` (identity scelto e ciclo dei token).
