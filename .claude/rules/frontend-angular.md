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

# Regole Angular e TypeScript

> Versione 1.0 — ultima revisione: 2026-11-28.
> Richiede `core.md` e `frontend.md`. Sezione 2 di `frontend.md`, estratta per dimensione: stessa numerazione (§2). Si carica sui file `*.ts`, `*.html`, `*.css`, `*.scss`, `angular.json`, `tsconfig*.json` (intestazione `paths:` di `frontend.md`).

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
- **Gestione errori HTTP (MUST):** `HttpInterceptorFn` funzionale registrato con `provideHttpClient(withInterceptors([...]))`. I messaggi globali passano dal `MessageService` di PrimeNG (Toast). Gli errori di validazione per campo vanno invece mostrati sul form, non nel toast. 401/403 hanno un trattamento dedicato: redirect al login; refresh del token solo se il progetto prevede il rinnovo (vedi `security-backend.md`).
  - **Trattamento per codice** (contratto in `core.md` §1, mappatura server in `backend-app.md` §4.1): l'interceptor legge il `ProblemDetails` e traduce le chiavi con i parametri ricevuti (§4.2).
    | Codice | Comportamento |
    |---|---|
    | 400 | errori per campo mostrati sul form (`errors`), mai nel toast |
    | 404 | messaggio tradotto o pagina di sistema 404 (§3) |
    | 409 / 412 | messaggio tradotto di conflitto/concorrenza con proposta di ricaricare i dati; mai sovrascrivere in silenzio |
    | 422 | messaggio tradotto della regola di business violata (non legato a un campo) |
    | 401 / 403 | come sopra; 403 → pagina di sistema 403 |
    | 500 e errori di rete | toast generico tradotto con `traceId` copiabile; nessun dettaglio tecnico né stack trace |
- **Propagazione del `traceId` (MUST):** un `HttpInterceptorFn` aggiunge a ogni richiesta verso l'API un identificativo di correlazione, così il backend lo ritrova nei log (`osservabilita.md`). Il meccanismo si deduce dal logging concordato per il progetto (campo "Logging" del `CLAUDE.md`): con OpenTelemetry l'header W3C `traceparent`, altrimenti `X-Trace-Id` (UUID). Lo stesso identificativo compare nel toast di errore 500 (copiabile) e nei log di errore del frontend (§7). Mai dati personali nell'identificativo.
- **Configurazione a runtime (MUST):** l'app gira in container, quindi l'URL dell'API e le impostazioni per ambiente NON sono incorporate nella build. Si leggono da un `config.json` servito con l'app e caricato con `provideAppInitializer`. Una sola immagine per tutti gli ambienti.
- **Compilatore (MUST):** in `tsconfig` abilita `strict`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noFallthroughCasesInSwitch`; in `angularCompilerOptions` abilita `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers`.
- **Struttura cartelle (MUST):** `core/` (singleton, interceptor, guard), `shared/` (componenti riusabili), `features/<nome>/` (lazy loaded). Niente cartelle per tipo tecnico (`components/`, `services/`) a livello radice. **Confini:** una feature non importa da un'altra feature; `core/` e `shared/` non importano da `features/`. Il codice usato da più feature si estrae in `shared/`. Il rispetto dei confini è verificato dal lint (regola ESLint, es. `no-restricted-imports`, configurata nel progetto) e una violazione fa fallire `npm run lint`.
- **Cartella per elemento (MUST):** ogni componente (pagine incluse), servizio o altro file non di componente sta in una cartella con il nome dell'elemento (kebab-case), che contiene **tutti** i suoi file (`.ts`, `.spec.ts`, `.html`, `.css`), anche quando è l'unico elemento della feature. Esempi: `core/eventi-api/eventi-api.service.ts` e `core/eventi-api/eventi-api.service.spec.ts`, non i file sciolti direttamente in `core/`; `features/<area>/<pagina>/<pagina>.component.ts`, anche con una sola pagina nella feature. Le cartelle stanno dentro la feature (o in `core/`, `shared/`).
  - **Progetti esistenti:** la regola vale anche per il codice già presente, ma lo spostamento dei file va proposto come passo di refactoring nel piano (issue padre), con conferma, e fatto con gli import aggiornati in un commit `refactor` a sé (`git-flusso.md`).
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
