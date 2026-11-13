---
paths:
  - "**/*.{ts,html,css,scss}"
  - "**/angular.json"
  - "**/tsconfig*.json"
---

# Regole Frontend (Angular, TypeScript & UI)

> Versione 1.14 — ultima revisione: 2026-11-13.
> Richiede `core.md` (contratto con il backend, licenze, workflow). Per la sicurezza vedi anche `security.md` e `security-frontend.md`.

## 1. Stack Frontend
- **Framework:** Angular (ultima versione stabile compatibile con PrimeNG; minimo 20, dove zoneless è stabile). Componenti Standalone e Signals in modo nativo.
- **Linguaggio:** TypeScript in Strict Mode (tipizzazione forte obbligatoria).
- **UI & Stile:** PrimeNG (libreria principale, free tier) + Angular Material (fallback solo per componenti non coperti da PrimeNG, previa segnalazione). Se Tailwind è usato, va dichiarato nel `CLAUDE.md` di progetto.

---

## 2. Regole Angular & TypeScript
- **TypeScript rigoroso (MUST):** codice SEMPRE fortemente tipizzato. Vietato `any` (usa `unknown` + type guard se necessario). Interfacce o tipi precisi per ogni modello, DTO e risposta API. ▲ Avviso `check-quality` del plugin per `any`.
- **UI Component Preference (MUST):**
  - Verifica sempre se esiste un componente **PrimeNG** adatto (es. `p-table`, `p-select`, `p-dialog`, `p-button`).
  - Usa i nomi correnti, non deprecati (`p-select` e non `p-dropdown`, `p-datepicker` e non `p-calendar`, `p-toggleswitch` e non `p-inputSwitch`). In caso di dubbio, verifica la documentazione della versione installata.
  - Angular Material solo per utility o se espressamente richiesto. Non mescolare due sistemi di tema: l'isolamento degli stili va gestito esplicitamente.
- **Componenti (MUST):** standalone, nessun `NgModule`; `OnPush`, `input()`, `output()`, `model()` e `viewChild()` sono in «Template, componenti, Angular e TypeScript» più sotto.
- **Zoneless (MUST):** i nuovi progetti sono zoneless e senza `zone.js` (da Angular 21 è il default e non serve alcun provider; con Angular 20 si aggiunge `provideZonelessChangeDetection()` al bootstrap, guida zoneless di angular.dev letta il 2026-11-13).
  - **Eccezione:** solo se una dipendenza lo impedisce, da segnalare e motivare. Nei progetti esistenti NON migrare di tua iniziativa: chiedi come procedere.
- **Stato (MUST):** `signal()`, `computed()`, `linkedSignal()` per stato locale e globale. `effect()` solo per effetti collaterali (log, `localStorage`, DOM), mai per propagare stato da un signal a un altro. RxJS solo per HTTP e flussi asincroni complessi. Usa `takeUntilDestroyed` per le sottoscrizioni manuali. Vietati i `subscribe` annidati: usa gli operatori (`switchMap`, `concatMap`...).
- **`httpResource` / `resource` (MUST):** permessi solo per letture semplici legate a signal e solo se la versione installata li dà come stabili. Per tutto il resto (mutazioni, interceptor complessi) usa `HttpClient` con il client generato.
- **Template e Dependency Injection:** vedi «Template, componenti, Angular e TypeScript» più sotto (control flow, `@defer`, `inject()`).
- **Form (MUST):** Typed Reactive Forms (non template-driven) per i form non banali. Gli errori di validazione server-side (per campo) vanno mappati sui rispettivi controlli. **Signal Forms:** non si usano finché la versione installata non li dà come stabili (verifica su angular.dev); poi si propongono per i form nuovi, senza migrare quelli esistenti (`core.md` §6.18).
- **Routing (MUST):** lazy loading delle route per feature (`loadComponent` / `loadChildren`), sempre, anche senza micro frontend: è già ciò che rende veloce il caricamento iniziale. I guard servono alla UX, mai come unico controllo di sicurezza. I micro frontend sono un'opzione ulteriore, non il default (§12).
- **Guard e resolver (PREFER):** guard e resolver funzionali (`CanActivateFn`, `ResolveFn`); `canMatch` per non caricare il chunk di una route non consentita; `withComponentInputBinding()` per ricevere parametri di route e query string come `input()` invece di leggere `ActivatedRoute`.
- **Client API (PREFER):** preferisci generare client e modelli TypeScript dallo schema OpenAPI (NSwag / OpenAPI Generator) invece di riscriverli a mano. I file generati stanno in una cartella dedicata e riconoscibile (es. `api/generated/`) e **non si modificano mai a mano**: ogni cambiamento passa dallo schema o dalla configurazione del generatore. Il comando di generazione è uno script npm e sta nel `CLAUDE.md` (tabella Comandi); il client si rigenera a ogni modifica dello schema.
- **Gestione errori HTTP (MUST):** `HttpInterceptorFn` funzionale registrato con `provideHttpClient(withInterceptors([...]))`. I messaggi globali passano dal `MessageService` di PrimeNG (Toast). Gli errori di validazione per campo vanno invece mostrati sul form, non nel toast. 401/403 hanno un trattamento dedicato: redirect al login; refresh del token solo se il progetto prevede il rinnovo (vedi `security.md`).
  - **Trattamento per codice** (contratto in `core.md` §1, mappatura server in `backend-app.md` §4.1): l'interceptor legge il `ProblemDetails` e traduce le chiavi con i parametri ricevuti (§4.2).
    | Codice | Comportamento |
    |---|---|
    | 400 | errori per campo mostrati sul form (`errors`), mai nel toast |
    | 404 | messaggio tradotto o pagina di sistema 404 (§3) |
    | 409 / 412 | messaggio tradotto di conflitto/concorrenza con proposta di ricaricare i dati; mai sovrascrivere in silenzio |
    | 422 | messaggio tradotto della regola di business violata (non legato a un campo) |
    | 401 / 403 | come sopra; 403 → pagina di sistema 403 |
    | 500 e errori di rete | toast generico tradotto con `traceId` copiabile; nessun dettaglio tecnico né stack trace |
- **Propagazione del `traceId` (MUST):** un `HttpInterceptorFn` aggiunge a ogni richiesta verso l'API un identificativo di correlazione, così il backend lo ritrova nei log (`core.md` §5). Il meccanismo si deduce dal logging concordato per il progetto (campo "Logging" del `CLAUDE.md`): con OpenTelemetry l'header W3C `traceparent`, altrimenti `X-Trace-Id` (UUID). Lo stesso identificativo compare nel toast di errore 500 (copiabile) e nei log di errore del frontend (§7). Mai dati personali nell'identificativo.
- **Configurazione a runtime (MUST):** l'app gira in container, quindi l'URL dell'API e le impostazioni per ambiente NON sono incorporate nella build. Si leggono da un `config.json` servito con l'app e caricato con `provideAppInitializer`. Una sola immagine per tutti gli ambienti.
- **Compilatore (MUST):** in `tsconfig` abilita `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noFallthroughCasesInSwitch`; in `angularCompilerOptions` abilita `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`.
- **Struttura cartelle (MUST):** `core/` (singleton, interceptor, guard), `shared/` (componenti riusabili), `features/<nome>/` (lazy loaded). Niente cartelle per tipo tecnico (`components/`, `services/`) a livello radice. **Confini:** una feature non importa da un'altra feature; `core/` e `shared/` non importano da `features/`. Il codice usato da più feature si estrae in `shared/`. Il rispetto dei confini è verificato dal lint (regola ESLint, es. `no-restricted-imports`, configurata nel progetto) e una violazione fa fallire `npm run lint`.
- **Cartella per elemento (MUST):** ogni componente (pagine incluse), servizio o altro file non di componente sta in una cartella con il nome dell'elemento (kebab-case), che contiene **tutti** i suoi file (`.ts`, `.spec.ts`, `.html`, `.css`), anche quando è l'unico elemento della feature. Esempi: `core/eventi-api/eventi-api.service.ts` e `core/eventi-api/eventi-api.service.spec.ts`, non i file sciolti direttamente in `core/`; `features/<area>/<pagina>/<pagina>.component.ts`, anche con una sola pagina nella feature. Le cartelle stanno dentro la feature (o in `core/`, `shared/`).
  - **Progetti esistenti:** la regola vale anche per il codice già presente, ma lo spostamento dei file va proposto come passo di refactoring nel piano (`PIANO.md`), con conferma, e fatto con gli import aggiornati in un commit `refactor` a sé (`git.md`).
- **Naming (MUST):** TypeScript camelCase per variabili/metodi e PascalCase per classi/interfacce. File in kebab-case. Per i servizi e gli altri file non di componente segui il default della CLI Angular installata.
- **File di un componente (pagine e componenti riusabili) (MUST):** ogni componente ha il suffisso `.component` (pagine incluse) e **file separati** per logica, template e stili, con lo stesso nome base, nella stessa cartella: `nome-pagina.component.ts`, `nome-pagina.component.html`, `nome-pagina.component.css` (o `.scss` se il progetto lo usa) e, quando si scrivono gli unit test (§10), `nome-pagina.component.spec.ts`. Il `.ts` contiene solo la logica: vietati `template:` e `styles:` inline (anche per componenti piccoli), il decoratore usa `templateUrl: './nome-pagina.component.html'` e `styleUrl: './nome-pagina.component.css'` (singolare, stringa). Il file di stili si crea **solo se il componente ha stili propri**: niente file vuoti e niente `styleUrl` senza stili. Se la CLI installata genera nomi diversi, si rinominano i file generati. Una deroga, se serve, sta nel `CLAUDE.md`.
  - **Template inline da spostare** (codice esistente o refactoring): il contenuto del template non cambia nello spostamento in `.html`; con `<pre>` e `<textarea>` il cui contenuto sta tra i tag, dove l'indentazione conta, si controlla che il testo reso resti identico. Queste regole valgono sul codice nuovo come su migrazioni e refactoring.
- **Lint e formattazione (MUST):** `angular-eslint` + Prettier. Il codice non deve introdurre warning.
- **Node e npm fissati (MUST):** versione di Node dichiarata in `.nvmrc` (LTS attiva) e in `engines` di `package.json`, con `engine-strict=true` in `.npmrc`; stessa versione nel Dockerfile e nella CI. `npm ci` e lock file committato; mai `npm install` che modifica il lock senza che sia lo scopo del compito.
- **Aggiornamenti di Angular (MUST):** solo con `ng update` (mai modificare a mano le versioni dei pacchetti `@angular/*`, che devono restare allineate). L'aggiornamento di versione maggiore è un compito a sé, in un branch dedicato: Claude lo propone e chiede conferma, perché può toccare PrimeNG, TypeScript e le API deprecate (vedi anche "Zoneless"). Le versioni minori e patch seguono Dependabot/Renovate.
- **Performance (MUST):** budget dei bundle in `angular.json`, con valori di partenza i default di Angular CLI (`initial`: avviso a 500 kB, errore a 1 MB; stili per componente: avviso a 4 kB, errore a 8 kB), da adattare per progetto e annotare nel `CLAUDE.md` («Soglie di performance diverse dal default»); un budget superato è un errore di build, non si alza per far passare la build senza motivo dichiarato. Per le pagine pubbliche i Core Web Vitals di riferimento sono le soglie «buone» di web.dev al 75° percentile (LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1), misurati con Lighthouse o sul campo. Lazy loading delle route, `@defer` per i componenti pesanti, `NgOptimizedImage` per le immagini, font self-hosted. Per ridurre il tempo di caricamento si parte da questi strumenti (non dai micro frontend, §12).

### Template, componenti, Angular e TypeScript
- **Guida ufficiale di Angular (PREFER):** per tutto ciò che queste regole non disciplinano, lo sviluppo Angular segue le best practice ufficiali (guida di stile e documentazione su angular.dev). Si verificano nella documentazione della versione installata nel progetto, non a memoria (`core.md` §6.13). In caso di conflitto prevalgono le regole del kit e il `CLAUDE.md`; una best practice che introduce una scelta nuova per il progetto (pattern, libreria, struttura non presente) si propone con il motivo e si attende il via, come da `core.md` §6.18.
- **Control flow moderno (MUST):** nei template solo la sintassi nativa (`@if`, `@for` con `track`, `@switch`); vietati `*ngIf` / `*ngFor` / `*ngSwitch`. Usa `@defer` per i componenti pesanti.
- **`@let` (PREFER):** per un valore derivato usato più volte nel template (`@let user = user$ | async;`); la logica non banale resta in `computed()` nel componente.
- **Async Pipe (MUST):** per mostrare nel template un Observable si usa l'`async` pipe, senza `subscribe` manuali nel componente (nessuna sottoscrizione da chiudere a mano).
- **`inject()` (MUST):** la Dependency Injection avviene con `inject(MyService)`, non con l'iniezione tramite costruttore. Ogni servizio ha una sola responsabilità: un servizio che fa più cose si divide.
- **Signal (MUST):** lo stato locale dei componenti è in `signal()`; ciò che deriva da altri signal si esprime con `computed()`, mai con un secondo `signal()` aggiornato a mano né con un `effect()` (dettagli in «Stato»). Vietato `mutate()` (rimosso dall'API pubblica dei signal in Angular 17): si aggiorna con `set()` o `update()` restituendo un nuovo valore.
- **Componenti piccoli e focalizzati (MUST):** ogni componente ha una sola responsabilità; un componente che cresce o gestisce più cose si divide in componenti più piccoli.
- **Input e output funzionali (MUST):** `input()`, `output()`, `model()`, `viewChild()` al posto dei decoratori `@Input` / `@Output` / `@ViewChild`.
- **`OnPush` (MUST):** `ChangeDetectionStrategy.OnPush` su ogni componente.
- **Host binding nei metadati (MUST):** binding e listener dell'host si dichiarano nella proprietà `host` del decoratore `@Component` / `@Directive`; vietati `@HostBinding` e `@HostListener`.
- **`ngClass` e `ngStyle` (PREFER, non vietati):** classi e stili si associano di norma con i binding nativi `[class.nome]` / `[class]` e `[style.proprietà]` / `[style]`, che non richiedono import (anche la documentazione di angular.dev li indica per i casi semplici, e `NgClass` non è deprecato); le direttive restano ammesse dove i binding nativi non bastano, con il motivo. Valgono comunque i vincoli sui colori e sugli stili di §3 e §4.1.
- **`NgOptimizedImage` (MUST):** le immagini si ottimizzano con `NgOptimizedImage` (`ngSrc`, con `width` e `height` o `fill`, e `priority` per l'immagine principale).
  - **Eccezione:** `src` semplice solo dove la direttiva non è applicabile (es. immagini inline o `data:`), con motivo.
- **Inferenza dove il tipo è evidente (MUST):** non si annotano i tipi che il compilatore deduce da solo (`const count = 0`, non `const count: number = 0`). Il rigore dei tipi (`strict`, niente `any`) è in «TypeScript rigoroso» e «Compilatore».
  - **Eccezione:** le annotazioni esplicite restano per i parametri, i valori di ritorno dei metodi pubblici, i modelli, i DTO e dove l'inferenza darebbe un tipo troppo largo.

---

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
Le regole di sicurezza del frontend sono in `security-frontend.md`, che è l'unica fonte: qui non si ripetono. Se il progetto non include `security.md`, Claude lo segnala e chiede se importare almeno quella sezione.

---

## 10. Test Frontend
- **Strumenti e ambito:** Vitest per servizi e componenti con logica, Playwright per i flussi E2E principali (vedi `core.md` §4), con Chromium a ogni PR e, per rispettare i browser supportati (§8), anche Firefox e WebKit (motore di Safari) almeno prima di ogni rilascio e nella CI notturna, se il progetto la ha; se non la ha, prima di ogni rilascio. I componenti puramente di presentazione non richiedono test dedicati se coperti dai flussi E2E.
- **Runner e comandi:** Vitest con ambiente DOM (jsdom) tramite il builder `@angular/build:unit-test`, se la versione di Angular installata lo prevede (verificalo, `core.md` §6.13). Gli script npm `test` e `test:coverage` stanno in `package.json` e nel `CLAUDE.md` (tabella Comandi); la soglia di copertura resta quella di `core.md` §4.
- **Unit test (`*.spec.ts`):** ogni servizio, guard, interceptor, pipe, direttiva e componente con logica nuovo o modificato ha il suo unit test, scritto insieme al codice (non rimandato). Il file `.spec.ts` sta accanto al file testato e ne porta il nome (`nome-pagina.component.spec.ts`, `nome.service.spec.ts`); per un componente testa il comportamento osservabile (DOM, `input()`/`output()`, interazioni) e non i dettagli interni. Un test per ramo rilevante: caso normale, errore, stato vuoto, input non validi. La soglia di copertura è quella di `core.md` §4. Se per un componente di presentazione si sceglie di non scrivere lo spec, il file non si crea vuoto né con test finti.
- **Cosa si mocka:** solo i confini esterni, cioè le chiamate HTTP (`HttpTestingController` o client API generato sostituito) e servizi di browser (`localStorage`, `matchMedia`, clock). Non si mockano il router, i signal, le pipe e i componenti figli: si usano reali. Niente mock del `TranslationService` se esiste un'implementazione di test con chiavi reali.
- **Dipendenze e HTTP nei test:** le dipendenze si ottengono con `TestBed.configureTestingModule({ providers })` e `TestBed.inject`, mai istanziate con `new` a mano; le guardie funzionali si eseguono con `TestBed.runInInjectionContext`; l'HTTP si testa con `provideHttpClient` + `provideHttpClientTesting` e `HttpTestingController`, con `verify()` in `afterEach`.
- **Tempo e zoneless:** in un progetto zoneless (§2) niente `fakeAsync`/`tick` di zone.js; il tempo si controlla con `vi.useFakeTimers({ toFake: ['Date'] })` e `vi.setSystemTime()`, e per far girare un `effect()` si chiama `TestBed.tick()`. Un progetto esistente con zone.js mantiene il proprio approccio.
- **Isolamento e determinismo:** `localStorage.clear()` e `sessionStorage.clear()` in `beforeEach`, `vi.restoreAllMocks()` e `vi.useRealTimers()` in `afterEach`. Si testa il comportamento pubblico, non i metodi privati; nessuna chiamata di rete reale; nessuna dipendenza dal fuso orario o dall'ora corrente (i test che toccano date si provano con almeno due fusi diversi, per esempio `TZ=UTC` e `TZ=America/Los_Angeles`; vedi §4.3). Commenti in inglese e nomi dei test descrittivi.
- **Casi ostili:** per ogni codice che tocca input, token o storage, almeno un caso ostile (testo con `<script>`, a capo, `;`, identificatori con `../` o `?#`, JSON corrotto, token mai inviato a URL di terzi). Principio e test lato server in `security.md`.
- **Difetti noti:** un difetto reale non ancora corretto si documenta con `it.fails` e un commento che spiega come correggerlo, e si segnala all'utente; non è un modo per far passare la suite (`core.md` §4). Quando il difetto è corretto, il test diventa un normale `it`.
- **Query dei test:** nei test dei componenti e in Playwright si cercano gli elementi per ruolo, etichetta o testo accessibile (`getByRole`, `getByLabel`), non per classi CSS; `data-testid` solo se non c'è alternativa accessibile.
- **Dati E2E:** ogni test crea i propri dati tramite API o seed dedicato dell'ambiente di test e non dipende da dati lasciati da altri test; utenti di test sintetici con credenziali da variabili d'ambiente (mai password reali nel repository). L'ambiente E2E gira sul compose del progetto con un database di test separato e azzerabile; istanza e modalità di quel database si **chiedono ogni volta**, senza presumerle (per l'istanza di prova del backend vedi `backend-app.md` §4.5).
- **Stabilità:** nessuno `waitForTimeout`; si attende uno stato osservabile (elemento, risposta di rete). Trace e screenshot di Playwright salvati solo in caso di fallimento.
- **Accessibilità automatica:** i flussi E2E con axe (`core.md` §4) si ripetono con tema light e dark.
- **Temi e lingue:** i flussi principali sono verificati almeno con la lingua di default e un secondo tema; le chiavi di traduzione mancanti fanno fallire il test, non mostrano la chiave grezza.
- **Chiusura di un lavoro frontend:** prima di dichiararlo concluso, `npm test` e la build di produzione (`npm run build`) sono verdi, insieme a lint e formattazione.
- **Verifica di un refactoring senza cambi di comportamento** (spostamento o separazione di file, rinomine): si confronta la build di produzione senza hash nei nomi prima e dopo, con `ng build --configuration production --output-hashing none --output-path <cartella fuori dal repository>` e `diff -r` tra le due uscite. Una build identica byte per byte dimostra che il codice compilato non è cambiato. Se cambiano solo i nomi dei chunk o delle variabili minificate (per esempio dopo uno spostamento di cartelle), lo si dichiara e si prende la build nuova come riferimento.

---

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
- **Sicurezza:** CSP e origini dei remote in allow-list esplicita (`security-frontend.md`); un remote caricato da origine non fidata è vietato. Gli stessi controlli di tipo `innerHTML`/`bypassSecurityTrust*` valgono nei remote.
- **Test:** unit test in ogni remote (§10); E2E Playwright sulla shell con i remote reali per i flussi principali.
