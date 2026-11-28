---
paths:
  - "**/*.{ts,html,css,scss}"
  - "**/angular.json"
  - "**/tsconfig*.json"
  - "**/package.json"
  - "**/.npmrc"
  - "**/.nvmrc"
  - "**/eslint.config.*"
---

# Regole frontend: sicurezza e test

> Versione 1.0 — ultima revisione: 2026-11-28.
> Richiede `core.md` e `frontend.md`. Sezioni 9 e 10 di `frontend.md`, estratte per dimensione: stessa numerazione (§9, §10). Si caricano con `frontend.md` sugli stessi file.

## 9. Sicurezza Frontend
- Vietati `innerHTML` e `bypassSecurityTrust*` senza sanitizzazione e motivazione esplicita. ▲ Avviso `check-quality` del plugin.
- Nessun dato sensibile in `localStorage`, `sessionStorage`, URL o console.
- Nonce CSP in Angular: `CSP_NONCE` / attributo `ngCspNonce`, un valore diverso a ogni richiesta (un CDN o una cache davanti che memorizza `index.html` darebbe lo stesso nonce a tutti).
- **Questa sezione è l'unica fonte per la sicurezza del frontend:** `frontend.md` §12 rimanda qui senza ripetere le regole.
- **CSP di base** (OWASP CSP Cheat Sheet, letta il 2026-11-04): policy rigida a nonce o hash, `script-src 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'none'`, più `style-src` configurato a parte (Angular non lo copre da solo), `frame-ancestors` e `form-action 'self'`; come fallback non rigido `default-src 'self'; frame-ancestors 'self'; form-action 'self'`. Si introduce prima con `Content-Security-Policy-Report-Only` e un endpoint di report, poi si passa alla modalità bloccante quando le violazioni sono spiegate.
- **Trusted Types** (guida Angular, riletta il 2026-11-13): `Content-Security-Policy: trusted-types angular; require-trusted-types-for 'script'`. Le policy `angular#unsafe-bypass` e `angular#unsafe-jit` si aggiungono solo se il codice usa davvero `bypassSecurityTrust*` o la compilazione JIT, e quindi vanno motivate (`angular#unsafe-upgrade` solo per un ibrido AngularJS). La guida elenca anche `angular#bundler`, usata dal bundler della CLI per creare i file dei chunk lazy: poiché il lazy loading è la regola (`frontend-angular.md` §2), prima di imporre la policy la si prova in `Content-Security-Policy-Report-Only` e si aggiunge `angular#bundler` solo se i report mostrano la violazione. I browser senza Trusted Types restano protetti dal sanificatore di Angular.
- **Script e risorse di terze parti:** il default è nessuno; se servono, versione fissata, origine in allow-list nella CSP e Subresource Integrity (`integrity` + `crossorigin`) quando la risorsa è statica. Nessun script caricato da CDN senza motivazione.
- **`postMessage`:** si indica sempre l'origine di destinazione (mai `*`), il ricevente confronta `event.origin` con una allow-list con uguaglianza esatta (non con controlli su sottostringhe) e tratta `event.data` come input non fidato (mai `eval` né `innerHTML`). Gli `iframe` con contenuto non fidato usano `sandbox`.
- **Storage:** gli identificatori di sessione e i token non stanno né in `localStorage` né in `sessionStorage` (entrambi leggibili da qualunque XSS; coerente con `frontend.md` §5, «Credenziali»): cookie `HttpOnly` o BFF (vedi «Autenticazione e Autorizzazione» in `security-backend.md`). `sessionStorage` resta ammesso per stato non sensibile che non deve sopravvivere alla scheda.
- **Build e segreti:** nessun segreto, chiave o token nel bundle e in `config.json` (il file è pubblico: solo URL e impostazioni non sensibili); source map di produzione non pubblicate (o servite solo a chi le deve usare, per esempio caricate nello strumento di monitoraggio); nessun commento o URL interno nei file distribuiti.
- **Service worker e PWA:** non memorizzano nella cache risposte autenticate o con dati utente; al logout si svuotano le cache dell'utente; l'aggiornamento del service worker è documentato (vedi `frontend.md` per la PWA).
- **Test:** vedi «Test di sicurezza automatici» (voce «Frontend»).

---

## 10. Test Frontend
- **Strumenti e ambito:** Vitest per servizi e componenti con logica, Playwright per i flussi E2E principali (vedi `qualita.md` §4), con Chromium a ogni PR e, per rispettare i browser supportati (§8), anche Firefox e WebKit (motore di Safari) almeno prima di ogni rilascio e nella CI notturna, se il progetto la ha; se non la ha, prima di ogni rilascio. I componenti puramente di presentazione non richiedono test dedicati se coperti dai flussi E2E.
- **Runner e comandi:** Vitest con ambiente DOM (jsdom) tramite il builder `@angular/build:unit-test`, se la versione di Angular installata lo prevede (verificalo, `core.md` §6.13). Gli script npm `test` e `test:coverage` stanno in `package.json` e nel `CLAUDE.md` (tabella Comandi); la soglia di copertura resta quella di `qualita.md` §4.
- **Unit test (`*.spec.ts`):** ogni servizio, guard, interceptor, pipe, direttiva e componente con logica nuovo o modificato ha il suo unit test, scritto insieme al codice (non rimandato). Il file `.spec.ts` sta accanto al file testato e ne porta il nome (`nome-pagina.component.spec.ts`, `nome.service.spec.ts`); per un componente testa il comportamento osservabile (DOM, `input()`/`output()`, interazioni) e non i dettagli interni. Un test per ramo rilevante: caso normale, errore, stato vuoto, input non validi. La soglia di copertura è quella di `qualita.md` §4. Se per un componente di presentazione si sceglie di non scrivere lo spec, il file non si crea vuoto né con test finti.
- **Cosa si mocka:** solo i confini esterni, cioè le chiamate HTTP (`HttpTestingController` o client API generato sostituito) e servizi di browser (`localStorage`, `matchMedia`, clock). Non si mockano il router, i signal, le pipe e i componenti figli: si usano reali. Niente mock del `TranslationService` se esiste un'implementazione di test con chiavi reali.
- **Dipendenze e HTTP nei test:** le dipendenze si ottengono con `TestBed.configureTestingModule({ providers })` e `TestBed.inject`, mai istanziate con `new` a mano; le guardie funzionali si eseguono con `TestBed.runInInjectionContext`; l'HTTP si testa con `provideHttpClient` + `provideHttpClientTesting` e `HttpTestingController`, con `verify()` in `afterEach`.
- **Tempo e zoneless:** in un progetto zoneless (§2) niente `fakeAsync`/`tick` di zone.js; il tempo si controlla con `vi.useFakeTimers({ toFake: ['Date'] })` e `vi.setSystemTime()`, e per far girare un `effect()` si chiama `TestBed.tick()`. Un progetto esistente con zone.js mantiene il proprio approccio.
- **Isolamento e determinismo:** `localStorage.clear()` e `sessionStorage.clear()` in `beforeEach`, `vi.restoreAllMocks()` e `vi.useRealTimers()` in `afterEach`. Si testa il comportamento pubblico, non i metodi privati; nessuna chiamata di rete reale; nessuna dipendenza dal fuso orario o dall'ora corrente (i test che toccano date si provano con almeno due fusi diversi, per esempio `TZ=UTC` e `TZ=America/Los_Angeles`; vedi §4.3). Commenti in italiano (default, `core.md` §6.9) e nomi dei test descrittivi.
- **Casi ostili:** per ogni codice che tocca input, token o storage, almeno un caso ostile (testo con `<script>`, a capo, `;`, identificatori con `../` o `?#`, JSON corrotto, token mai inviato a URL di terzi). Principio in `security.md`, «Regola operativa»; test lato server in `security-strutturato.md`, «Test di sicurezza automatici».
- **Difetti noti:** un difetto reale non ancora corretto si documenta con `it.fails` e un commento che spiega come correggerlo, e si segnala all'utente; non è un modo per far passare la suite (`qualita.md` §4). Quando il difetto è corretto, il test diventa un normale `it`.
- **Query dei test:** nei test dei componenti e in Playwright si cercano gli elementi per ruolo, etichetta o testo accessibile (`getByRole`, `getByLabel`), non per classi CSS; `data-testid` solo se non c'è alternativa accessibile.
- **Dati E2E:** ogni test crea i propri dati tramite API o seed dedicato dell'ambiente di test e non dipende da dati lasciati da altri test; utenti di test sintetici con credenziali da variabili d'ambiente (mai password reali nel repository). L'ambiente E2E gira sul compose del progetto con un database di test separato e azzerabile; istanza e modalità di quel database si **chiedono ogni volta**, senza presumerle (per l'istanza di prova del backend vedi `backend-app.md` §4.5).
- **Stabilità:** nessuno `waitForTimeout`; si attende uno stato osservabile (elemento, risposta di rete). Trace e screenshot di Playwright salvati solo in caso di fallimento.
- **Accessibilità automatica:** i flussi E2E con axe (`qualita.md` §4) si ripetono con tema light e dark.
- **Temi e lingue:** i flussi principali sono verificati almeno con la lingua di default e un secondo tema; le chiavi di traduzione mancanti fanno fallire il test, non mostrano la chiave grezza.
- **Chiusura di un lavoro frontend:** prima di dichiararlo concluso, `npm test` e la build di produzione (`npm run build`) sono verdi, insieme a lint e formattazione.
- **Verifica di un refactoring senza cambi di comportamento** (spostamento o separazione di file, rinomine): si confronta la build di produzione senza hash nei nomi prima e dopo, con `ng build --configuration production --output-hashing none --output-path <cartella fuori dal repository>` e `diff -r` tra le due uscite. Una build identica byte per byte dimostra che il codice compilato non è cambiato. Se cambiano solo i nomi dei chunk o delle variabili minificate (per esempio dopo uno spostamento di cartelle), lo si dichiara e si prende la build nuova come riferimento.

---
