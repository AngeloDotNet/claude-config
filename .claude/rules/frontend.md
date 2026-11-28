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

# Regole Frontend (Angular, TypeScript & UI)

> Versione 1.19 — ultima revisione: 2026-11-28.
> Richiede `core.md` (contratto con il backend, licenze, workflow). Per la sicurezza vedi anche `security.md` e `frontend-sicurezza-test.md` (§9).

## 1. Stack Frontend
- **Framework:** Angular (ultima versione stabile compatibile con PrimeNG; minimo 20, dove zoneless è stabile). Componenti Standalone e Signals in modo nativo.
- **Linguaggio:** TypeScript in Strict Mode (tipizzazione forte obbligatoria).
- **UI & Stile:** PrimeNG (libreria principale, free tier) + Angular Material (fallback solo per componenti non coperti da PrimeNG, previa segnalazione). Se Tailwind è usato, va dichiarato nel `CLAUDE.md` di progetto.

---

## 2. Regole Angular & TypeScript
La sezione 2 (componenti, template, Angular e TypeScript) è in `frontend-angular.md`, con la stessa numerazione.

## 3. Standard di UI/UX Professionale (Design di Sistema)
- **Layout & Spazi:** griglie e spaziature rigorose (multipli di 4px/8px). Evita layout affollati; dai respiro agli elementi.
- **Design token:** colori, spaziature, raggi, ombre e tipografia sono variabili CSS definite una sola volta. Vietati colori hardcoded (`#fff`, `rgb(...)`) nei componenti: romperebbero il multi-tema. ▲ Avviso `check-quality` del plugin per i colori esadecimali.
- **Responsive / mobile-first:** testa a 360px, 768px, 1280px. Le tabelle degradano (colonne nascoste o vista a card) su schermi piccoli.
- **Gerarchia visiva:** gerarchia tipografica netta. L'azione primaria si stacca dalle secondarie.
- **Scala tipografica con nomi semantici:** i token di testo hanno nomi di ruolo (per esempio `title`, `subtitle`, `body`, `caption`), non valori come `font-size-3`. Ogni ruolo ha una sola dimensione, definita nei token e usata da tutti i componenti.
- **Altezza di riga per ruolo:** i titoli hanno un'altezza di riga più stretta del testo corrente, e il testo lungo (corpo) ha un'altezza di riga più ampia, per leggibilità. I valori sono token, come le dimensioni.
- **Misura massima del testo:** il testo continuo ha una larghezza massima leggibile (in caratteri per riga) definita come token; i contenitori di testo lungo la rispettano anche su schermi larghi.
- **Stati dei componenti:** `hover`, `focus`, `active`, `disabled` definiti, con transizioni fluide (solo sulle proprietà che cambiano, per esempio `transition: background-color 200ms ease`, mai `transition: all`; durata massima 200ms).
- **Feedback e validazione:** campi errati con bordo colorato, icona e messaggio contestuale. Submit disabilitato se il form è invalido, oppure spinner durante l'invio (evita doppi invii).
- **Loading:** `p-skeleton` al posto di spinner generici per tabelle e liste.
- **Empty state ed error state:** ogni lista/tabella ha uno stato vuoto (messaggio + CTA) e uno stato di errore con pulsante "Riprova".
- **Azioni distruttive:** sempre con `p-confirmdialog` che spiega cosa accadrà.
- **Modifiche non salvate:** guard sul form che avvisa prima di abbandonare la pagina.
- **Micro-interazioni:** animazioni discrete (dissolvenze, leggeri scorrimenti, max 200-300ms). Rispetta `prefers-reduced-motion`.
- **Pagine di sistema:** 404, 403, 500 e manutenzione, coerenti con il design dell'app.
- **Iconografia:** una sola libreria (PrimeIcons).
- **Accessibilità (A11y):**
  - Riferimento di accessibilità: WCAG 2.2 livello AA. Contrasti (≥ 4.5:1 testo, ≥ 3:1 elementi UI); ogni input ha una `label` associata.
  - Navigazione da tastiera completa (`Tab`, `Enter`, `Escape`), gestione corretta del focus nei dialog, skip link.
  - `aria-live` per toast ed errori; area di tocco minima 44px (scelta del kit, più rigida dei 24px del criterio 2.5.8 di WCAG 2.2).
  - Criteri nuovi di WCAG 2.2 da rispettare: il focus non è mai nascosto da elementi fissi come header o banner (2.4.11); ogni azione di trascinamento ha un'alternativa con un clic o la tastiera (2.5.7); i dati già inseriti nello stesso flusso non si richiedono di nuovo (3.3.7); l'autenticazione non richiede un test cognitivo e permette incolla e gestori di password (3.3.8).
  - Verifica con axe / Lighthouse; axe non trova tutto, quindi per i flussi principali (login, form principali, navigazione) si aggiunge una verifica manuale con tastiera e con un lettore di schermo, annotata nella PR.
  - **PREFER:** per focus trap, `LiveAnnouncer` e navigazione con frecce nei componenti propri, `@angular/cdk/a11y` (MIT; si dichiara come dipendenza, `core.md` §6.8); i componenti PrimeNG li gestiscono già.

---

## 4. Multi-Tema, Fusi Orari e Localizzazione (lato client)

### 4.1 Sistema Multi-Tema (Light, Dark, Custom)
- **Persistenza:** se il progetto ha un profilo utente, il tema è salvato a database nelle preferenze del profilo. Se non c'è un profilo (progetto senza autenticazione, o frontend che usa API altrui), **chiedi dove salvare** tema, fuso orario e consenso (§4.3, §6), senza presumere, e registra la scelta nel `CLAUDE.md` (campo "Preferenze utente").
- **Switcher:** un `ThemeService` applica dinamicamente le classi CSS al tag `<html>` (es. `.theme-light`, `.theme-dark`, `.theme-dim`, `.theme-oled`).
- **Default:** al primo accesso rispetta `prefers-color-scheme`.
- **Integrazione PrimeNG:** usa il theming nativo di PrimeNG (preset Aura, Lara, Nora o Material, con CSS variables) e aggiorna i colori in base alla classe del tema attivo.

### 4.2 Localizzazione
- **Caricamento:** un `TranslationService` basato su **Signals** carica la mappa all'avvio tramite `provideAppInitializer(...)` (non `APP_INITIALIZER`, deprecato) dall'endpoint del dizionario (vedi `backend.md`).
- **Uso nei template:** pipe `translate` o `ts.instant('KEY')`. MAI stringhe hardcoded in HTML o TS.
- **Parametri e plurali:** le traduzioni supportano parametri e pluralizzazione (sintassi ICU MessageFormat, es. `{count, plural, one {# elemento} other {# elementi}}`). La sintassi ICU non è nativa del runtime di Angular: richiede un compilatore di messaggi (per esempio il plugin `@jsverse/transloco-messageformat` per Transloco o `ngx-translate-messageformat-compiler` per ngx-translate, entrambi basati su messageformat.js); licenza MIT di entrambi i plugin e di `@messageformat/core` verificata sul registro npm il 2026-11-13 (versioni di quel giorno: `@jsverse/transloco-messageformat` 8.4.0, richiede Angular 16 o successivo e Transloco 8 o successivo; `ngx-translate-messageformat-compiler` 7.3.0, richiede Angular 13 o successivo e ngx-translate fino alla 18); la versione e la compatibilità con quella installata nel progetto si verificano al primo uso (`core.md` §3, §6.13) e la libreria scelta va dichiarata come dipendenza.
- **Fallback:** se la chiave manca nella lingua richiesta, ripiega sulla lingua di default e registra un warning. Non mostrare mai la chiave grezza all'utente.
- **Errori backend:** il backend restituisce chiavi (vedi `core.md`); il frontend le traduce con i parametri ricevuti.
- **Formati locali:** numeri, valute e date seguono la lingua dell'utente (`Intl`). Se serve RTL, usa proprietà CSS logiche (`margin-inline-start`).
- **Nuove chiavi:** ogni feature che introduce testi fornisce le nuove chiavi (con valori IT/EN) in un blocco separato o in uno script di seed.

### 4.3 Date e Fusi Orari
- Un `TimeZoneService` legge il fuso IANA dell'utente (dal profilo, se esiste; altrimenti dalla sede concordata, vedi §4.1). La conversione avviene solo in visualizzazione, mai sull'ora grezza del server. Le date inviate al backend tornano in UTC.

---

## 5. Autorizzazione nella UI
> Vale solo se il progetto prevede autenticazione/autorizzazione (vedi `security-backend.md` e il `CLAUDE.md`); altrimenti non si applica.

- Mostra, nascondi o disabilita azioni in base ai permessi tramite una direttiva strutturale o un `computed` su un `AuthService` basato su signal (es. `*appHasPermission`). Il controllo vero resta sempre sul server: la UI è solo UX.
- I permessi arrivano dal profilo (claim o endpoint dedicato), mai dedotti dal frontend.
- Una pagina negata mostra la pagina di sistema 403, non un errore generico.
- **Sessione con cookie o BFF** (scelta di `security-backend.md`, nel `CLAUDE.md`):
  - **Credenziali:** le chiamate all'API usano `withCredentials` solo verso l'origine concordata, preferibilmente la stessa dell'SPA; nessun token in `localStorage` o `sessionStorage`.
  - **CSRF:** con i cookie le richieste mutanti portano il token antiforgery (`withXsrfConfiguration`, con nome di cookie e header concordati con il backend); mai richieste mutanti senza token.
  - **Sessione scaduta:** su 401 la route corrente viene salvata, l'utente va al login e, dopo l'accesso, torna alla route salvata; il ritorno accetta solo percorsi locali, mai URL esterni (open redirect, vedi `security-backend.md`).

---

## 6. Privacy, Cookie e Consenso (GDPR)
- Banner di consenso con scelta granulare (necessari / statistici / marketing). Prima del consenso non caricare script, pixel o font di terze parti non necessari.
- Il consenso è salvato (nel profilo se esiste; altrimenti dove concordato, vedi §4.1, ad esempio un cookie tecnico) e revocabile in ogni momento da una pagina dedicata.
- Analytics solo se rispettosi della privacy e self-hosted (es. Matomo), mai strumenti che trasferiscono dati personali a terzi senza base giuridica.
- Pagine Privacy e Cookie Policy raggiungibili da ogni schermata.

---

## 7. Monitoraggio Errori Frontend
- `ErrorHandler` globale (o `provideBrowserGlobalErrorListeners()`) che registra errori JavaScript non gestiti con `traceId`, versione dell'app e route, senza dati personali.
- Invio a uno strumento gratuito self-hosted (es. GlitchTip) o a un endpoint dedicato del backend. L'utente vede un messaggio tradotto, mai lo stack trace.

---

## 8. Tabelle, Export e Stato Avanzato
- **Tabelle grandi:** `p-table` con lazy loading lato server (paginazione, ordinamento e filtri delegati al backend); virtual scroll oltre qualche centinaio di righe. Filtri, ordinamento e pagina corrente si salvano nell'URL (query string) o nello stato, così sopravvivono a refresh e navigazione.
- **Conversione verso il contratto di paginazione:** `p-table` lavora con `first` (indice da 0) e `rows`, mentre il contratto (`core.md` §1) usa `pageNumber` da 1, `pageSize`, `sortBy` e `sortDirection`. La conversione (`pageNumber = first / rows + 1`, `sortField`/`sortOrder` → `sortBy`/`sortDirection`) sta in **un solo punto condiviso** (funzione o servizio in `shared/`), usato da tutte le tabelle; i componenti non la rifanno a mano.
- **Export/import:** il file lo genera il backend (vedi `backend.md`) e il frontend lo scarica; generazione client-side solo per piccoli dataset. Librerie solo gratuite e con licenza permissiva.
- **Stato globale per app grandi:** se più feature condividono stato complesso, usa servizi con signal oppure NgRx SignalStore (MIT). Non introdurre NgRx classico (store/effects/reducers) per stato semplice.
- **SSR / hydration:** non usarli di default (app interne dietro login). Valutali solo per pagine pubbliche con esigenze SEO, e dichiarali nel `CLAUDE.md` di progetto. Se adottati: niente accesso diretto a `window`, `document`, `localStorage` nel costruttore o nel codice di classe (si usa `afterNextRender`/`afterEveryRender` o `isPlatformBrowser`); nessun segreto né dato di sessione nello stato trasferito al client; i test E2E girano anche sul build SSR.
- **PWA / offline:** solo se richiesto dal progetto; in tal caso definisci cosa è disponibile offline e come si risolvono i conflitti alla risincronizzazione.
- **SEO (solo pagine pubbliche):** `Title` e `Meta` per route, `lang` sul tag `<html>`, canonical, HTML semantico.
- **Browser supportati:** ultime 2 versioni stabili di Chrome, Edge, Firefox e Safari, salvo diversa indicazione nel `CLAUDE.md`.

---

## 9. Sicurezza Frontend
La sezione 9 è in `frontend-sicurezza-test.md`, con la stessa numerazione.

## 10. Test Frontend
La sezione 10 è in `frontend-sicurezza-test.md`, con la stessa numerazione.

## 11. Sostituzione di un Frontend Esistente (es. Blazor)
- Angular si introduce **in parallelo**, un'area alla volta, e il vecchio frontend si rimuove solo a copertura completa e con l'ok dell'utente; mai una riscrittura in blocco.
- Le decisioni (dove gira l'SPA, sessione cookie o BFF, ordine delle pagine, traduzioni) si chiedono una per una.
- Procedura completa in `avvio-progetto.md` §3d; ogni area segue le fasi di `feature-workflow.md`.

---

## 12. Micro Frontend (opzionale, solo su conferma)
Non sono il default. Il caricamento a richiesta per feature si ottiene già con il lazy loading delle route (§2) e con `@defer`; i micro frontend servono per un altro scopo: **rilasci e team indipendenti** su un'app molto grande. Aggiungono complessità e non rendono l'app più veloce di per sé (anzi: più richieste di rete, dipendenze condivise da allineare).
- **Quando valutarli:** più team che rilasciano in modo indipendente, parti dell'app con cicli di vita diversi, app grande dove il build unico è diventato un freno. Per una sola squadra o un'app piccola/media Claude lo dice e non li propone.
- **Decisione ogni volta, mai presunta:** Claude propone i micro frontend solo se ricorrono i motivi sopra, con pro e contro, e attende l'ok (`core.md` §6.5 e §6.18). La scelta va nel `CLAUDE.md` (campo "Micro frontend") con un ADR (`core.md` §5b). In un progetto esistente non si migra di iniziativa (§11 e `core.md` §6.12).
- **Tecnologia:** **Native Federation** (`@angular-architects/native-federation`, licenza MIT da verificare al primo uso, `core.md` §3), compatibile con il builder esbuild di Angular; Module Federation basata su webpack solo se già presente nel progetto. Compatibilità con la versione di Angular e di PrimeNG installate, e API del pacchetto, si verificano al primo uso (`core.md` §6.13), non a memoria.
- **Struttura:** una shell (host) che carica i remote tramite lazy loading delle route; ogni remote è un'app Angular a sé con le stesse regole di questo file (standalone, signals, OnPush, file separati per componente, test). Angular, PrimeNG, RxJS e la libreria di traduzione sono dipendenze condivise come singleton, con versioni compatibili e bloccate; il tema (§4.1), il `TranslationService` (§4.2) e l'autenticazione (§5) vivono nella shell e sono condivisi, mai duplicati nei remote.
- **Confini:** valgono le regole di §2: un remote non importa da un altro remote. Il codice comune sta in una libreria condivisa o nella shell. La comunicazione tra remote passa da servizi condivisi basati su signal o da contratti espliciti, mai da dipendenze dirette.
- **Docker e configurazione a runtime:** gli URL dei remote si leggono da configurazione a runtime (come `config.json`, §2), non incorporati nella build. Una sola immagine per tutti gli ambienti resta valida per ogni applicazione (shell e ciascun remote); il numero di immagini e di servizi nel compose si concorda con l'utente (con Docker, `docker.md`).
- **Sicurezza:** CSP e origini dei remote in allow-list esplicita (§9); un remote caricato da origine non fidata è vietato. Gli stessi controlli di tipo `innerHTML`/`bypassSecurityTrust*` valgono nei remote.
- **Test:** unit test in ogni remote (§10); E2E Playwright sulla shell con i remote reali per i flussi principali.
