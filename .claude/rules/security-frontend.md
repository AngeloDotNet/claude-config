---
paths:
  - "**/*.{ts,html,css,scss}"
  - "**/angular.json"
  - "**/tsconfig*.json"
---

# Sicurezza frontend

> Versione 1.1 — ultima revisione: 2026-11-10.

> Richiede `core.md` e `security.md`. Contiene le regole di sicurezza che valgono per il frontend Angular (`innerHTML`, storage, CSP, Trusted Types, `postMessage`, build e segreti, service worker). I principi comuni sono in `security.md`.

## Frontend
- Vietati `innerHTML` e `bypassSecurityTrust*` senza sanitizzazione e motivazione esplicita. ▲ Avviso `check-quality` del plugin.
- Nessun dato sensibile in `localStorage`, URL o console.
- Nonce CSP in Angular: `CSP_NONCE` / attributo `ngCspNonce`, un valore diverso a ogni richiesta (un CDN o una cache davanti che memorizza `index.html` darebbe lo stesso nonce a tutti).
- **Questa sezione è l'unica fonte per la sicurezza del frontend:** `frontend.md` §9 e §12 rimandano qui senza ripetere le regole.
- **CSP di base** (OWASP CSP Cheat Sheet, letta il 2026-11-04): policy rigida a nonce o hash, `script-src 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'`, più `style-src` configurato a parte (Angular non lo copre da solo), `frame-ancestors` e `form-action 'self'`; come fallback non rigido `default-src 'self'; frame-ancestors 'self'; form-action 'self'`. Si introduce prima con `Content-Security-Policy-Report-Only` e un endpoint di report, poi si passa alla modalità bloccante quando le violazioni sono spiegate.
- **Trusted Types** (guida Angular, letta il 2026-11-04): `Content-Security-Policy: trusted-types angular; require-trusted-types-for 'script'`. Le policy `angular#unsafe-bypass` e `angular#unsafe-jit` si aggiungono solo se il codice usa davvero `bypassSecurityTrust*` o la compilazione JIT, e quindi vanno motivate. I browser senza Trusted Types restano protetti dal sanificatore di Angular.
- **Script e risorse di terze parti:** il default è nessuno; se servono, versione fissata, origine in allow-list nella CSP e Subresource Integrity (`integrity` + `crossorigin`) quando la risorsa è statica. Nessun script caricato da CDN senza motivazione.
- **`postMessage`:** si indica sempre l'origine di destinazione (mai `*`), il ricevente confronta `event.origin` con una allow-list con uguaglianza esatta (non con controlli su sottostringhe) e tratta `event.data` come input non fidato (mai `eval` né `innerHTML`). Gli `iframe` con contenuto non fidato usano `sandbox`.
- **Storage:** gli identificatori di sessione e i token non stanno in `localStorage` (leggibile da qualunque XSS): cookie `HttpOnly` o BFF (vedi «Autenticazione e Autorizzazione» in `security-backend.md`); `sessionStorage` quando la persistenza non serve.
- **Build e segreti:** nessun segreto, chiave o token nel bundle e in `config.json` (il file è pubblico: solo URL e impostazioni non sensibili); source map di produzione non pubblicate (o servite solo a chi le deve usare, per esempio caricate nello strumento di monitoraggio); nessun commento o URL interno nei file distribuiti.
- **Service worker e PWA:** non memorizzano nella cache risposte autenticate o con dati utente; al logout si svuotano le cache dell'utente; l'aggiornamento del service worker è documentato (vedi `frontend.md` per la PWA).
- **Test:** vedi «Test di sicurezza automatici» (voce «Frontend»).
