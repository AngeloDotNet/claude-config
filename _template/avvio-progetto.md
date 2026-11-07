# Avvio di un progetto con queste regole

> Procedura per Claude. Sta in `_template/` del **template** e **si elimina nel nuovo progetto** insieme al resto di `_template/`. Il template è la sorgente pulita: per un progetto nuovo è la copia di lavoro stessa, per un progetto esistente Claude lo **legge soltanto** (indicato dall'utente) e non lo modifica mai.
>
> **Struttura del template:** `.claude/rules/` (moduli caricati da Claude Code in automatico: `core`, `git`, `security` all'avvio; `frontend`, `docker` e i tre moduli backend (`backend`, `backend-architecture`, `backend-app`) con `paths:`, solo quando si tocca un file corrispondente), `.claude/rules-optional/` (moduli non caricati: `feature-workflow`, `backend-email`, `backend-infra`), `CLAUDE.md` (modello da compilare), `.editorconfig` e `NuGet.config` (solo backend .NET, si tengono su conferma, domanda 9 del §1), `.gitattributes`, `.gitignore`, e `_template/` (questo file; gli hook personali e i comandi `/kit:...` sono nel plugin `plugins/kit/`, fuori dal progetto; `/kit:avvia-progetto` (dalla versione 1.9.0) fa le domande di questa procedura una per messaggio, `/kit:copia-regole` copia le regole e `/kit:aggiorna-regole` le aggiorna). Nessuna sottocartella dentro `.claude/rules/`: i rimandi tra moduli (`backend.md` §5b, ecc.) restano validi.

## Quando si usa
- "Avvia un nuovo progetto" (la cartella contiene la copia del template).
- "Applica le regole in `<percorso>` a questo progetto esistente".
- "Aggiungi il modulo `<nome>` a questo progetto" o "riallinea le regole di questo progetto".
- "Integra solo le regole Git in questo progetto esistente" (modalità **solo Git**, vedi §1 e §2).

- "Applica le regole di questo progetto" (senza percorso): il progetto contiene già `.claude/rules/` e `_template/avvio-progetto.md` copiati con `/kit:copia-regole`; Claude segue questa procedura dal progetto e usa i moduli già presenti, senza bisogno del template.

Nelle frasi per i progetti esistenti `<percorso>` è la **radice del template**. Se l'utente non la indica e serve (moduli non ancora copiati, riallineamento, confronto con il template), Claude la chiede; con le regole e questa procedura già nel progetto non serve per applicarle. Il percorso serve solo per la copia: **non lo scrive in nessun file del progetto**. A fine procedura Claude elimina `_template/` dal progetto esistente (la copia di questo file fatta dallo script).

## 0. Quale percorso seguire
Il primo gesto è stabilire se il progetto è **nuovo** o **esistente** (domanda 4 del §1; se la cartella contiene già codice e l'utente dice "nuovo", Claude lo fa notare e richiede la scelta). I due percorsi differiscono per ciò che Claude fa *prima* di scrivere e per come tratta le scelte.

### A. Progetto nuovo (cartella con la copia del template)
Le regole sono il punto di partenza: si applicano per intero, senza deroghe preesistenti.
1. Domande del §1 (una per volta, ciascuna con risposta a scelta, attendendo la risposta prima della successiva).
2. `PIANO.md` di avvio (§2b), ok dell'utente a ogni punto.
3. Pulizia della copia del template (§2): spostamento dei moduli non scelti da `.claude/rules/` a `.claude/rules-optional/`, attivazione di quelli opzionali confermati, compilazione del `CLAUDE.md` (§3), rimozione di tutto il materiale del template (§3, punto 5: `_template/`, `.claude-plugin/`, `plugins/`): le scelte "chiesto, non presunto" si chiedono quando diventano rilevanti.
4. Verifica con `/context` e, se il repository esiste, commit `chore(rules)` su branch confermato. Se git non è inizializzato Claude lo segnala, non esegue `git init`.
5. Da qui si sviluppa seguendo le regole; nessuna ispezione del codice (non c'è).

### B. Progetto esistente (codice già presente)
Le regole si **integrano** senza stravolgere ciò che c'è: Claude rileva, mostra, chiede; non presume e non adegua il codice da solo.
1. Domande del §1, una per volta (tipo, sicurezza, Docker, stato = esistente; tecnologia frontend, mobile e ORM si **rilevano** dal codice e si fanno confermare, non si chiedono da zero).
2. **Ispezioni in sola lettura:** git e cronologia (§3b), poi scelte già presenti nel codice (§3c). Nessuna modifica in questa fase.
3. **Riepilogo delle differenze** rispetto alle regole e, **una domanda per volta**, la decisione per ciascuna: *deroga* nel `CLAUDE.md` di quel progetto (la scelta esistente resta) oppure *adeguamento* con refactoring a parte, pianificato in `PIANO.md`.
4. `PIANO.md` di integrazione (§2b), poi copia dei moduli in `.claude/rules/`, `CLAUDE.md` (campi noti compilati, gli altri `[..]`; se esiste già, anche perché copiato come modello o preesistente del progetto, lo **allinea e completa** senza sostituirlo né perdere il contenuto del progetto) e commit `chore(rules)` su branch confermato.
5. Vincoli: la cronologia git esistente non si riscrive mai; non si migra a zoneless né si ristruttura senza chiedere; le regole valgono per il codice **nuovo** dal punto concordato in poi.
6. **Solo Git:** variante minima del percorso B, con soli `core.md` e `git.md` (§2).
7. **Frontend Blazor da sostituire con Angular:** caso particolare del percorso B, con procedura propria al §3d.

### C. Progetto che ha già le regole
Se `.claude/rules/` e il `CLAUDE.md` esistono già, non si riparte: si usa il riallineamento o l'aggiunta di un modulo (§4).

## 1. Domande obbligatorie (in modo esplicito, mai per assunzione)
Prima di copiare qualunque file Claude pone queste domande all'utente **una per volta**, con risposte a scelta, e attende la risposta prima di porre la successiva (una domanda può dipendere dalla precedente: per esempio il tipo di progetto decide quali altre servono):
1. **Tipo di progetto:** solo API · solo frontend · fullstack · **solo Git** (solo per progetti esistenti già in sviluppo, di cui si vogliono governare solo branch e commit).
2. **Sicurezza** (`security.md`): sì · no. Significa solo includere o meno il modulo delle regole di sicurezza (CORS, header, segreti, upload, ecc.). Se il progetto richieda anche autenticazione/autorizzazione è una domanda distinta, posta da `security.md` quando diventa rilevante, non all'avvio.
3. **Docker** (`docker.md`): sì · no.
4. **Stato:** nuovo progetto · progetto esistente.
5. **Tecnologia frontend** (solo se il tipo include un frontend): Angular (default, regole in `frontend.md`) · Blazor.
6. **Sviluppo mobile** (solo se il tipo include un frontend): no · sì, con una di queste tecnologie: **PWA** (l'app web installabile, nessun codice nativo) · **Ionic + Capacitor** (riusa Angular, solo con frontend Angular) · **.NET MAUI** (nativo C#; con Blazor è possibile Blazor Hybrid) · **Flutter** · **React Native**. L'elenco è una proposta, non un vincolo: l'utente può indicarne un'altra.
7. **ORM** (solo se il tipo include un backend): EF Core (default) · Dapper. Vedi `backend.md` §1: Dapper non si presume, si valuta ogni volta.
8. **Flusso per entità** (`feature-workflow.md`; **solo per progetti fullstack**, nuovi o esistenti, e per la migrazione fullstack Blazor → Angular del §3d): usare il modulo sì · no. Per un progetto solo API o solo frontend la domanda non si pone e il modulo non si prende in considerazione.
9. **File di configurazione .NET** (solo se il tipo include un backend .NET: solo API o fullstack; per un progetto esistente vale con il §3c): tenere nella root del progetto/soluzione `NuGet.config` e `.editorconfig` (nel progetto nuovo sono già nella copia del template e si eliminano se non servono; nel progetto esistente si copiano dalla radice del template). Risposta a scelta: entrambi · solo `NuGet.config` · solo `.editorconfig` · nessuno. Ogni file va chiesto, non presunto. Solo frontend e solo Git: la domanda non si pone.

La modalità **solo Git** ha senso solo con stato "progetto esistente": se l'utente la sceglie per un progetto nuovo, Claude lo segnala e richiede il tipo (solo API, solo frontend, fullstack).
**Blazor o mobile non-PWA:** le regole oggi coprono solo Angular (`frontend.md`) e nessuna tecnologia mobile. Se l'utente sceglie Blazor **come tecnologia del progetto** (resta Blazor), Claude **non tiene `frontend.md`** (le sue regole Angular/PrimeNG non si applicano), lo segnala e propone di creare un modulo ad hoc quando il lavoro frontend inizia; non inventa regole nel frattempo. Lo stesso vale per una tecnologia mobile diversa da PWA (con Ionic + Capacitor restano valide le regole Angular, ma l'impacchettamento nativo non è coperto). La scelta va comunque nel `CLAUDE.md`. Se invece il progetto ha già un frontend Blazor e l'utente vuole **sostituirlo con Angular**, vale il §3d (la tecnologia di destinazione è Angular, quindi `frontend.md` si tiene o si copia).
Non sono una domanda e non si possono escludere: `core.md` e `git.md` (le regole Git sono sempre previste).
Se l'utente risponde in modo vago, Claude richiede la scelta: non decide al suo posto.

## 2. Quali moduli tenere in `.claude/rules/`
Nel progetto nuovo i moduli sono già nella copia del template: quelli non scelti si **spostano** da `.claude/rules/` a `.claude/rules-optional/` (non si caricano più, ma restano disponibili per aggiungerli in seguito), quelli opzionali scelti si **spostano** da `.claude/rules-optional/`. Nel progetto esistente i moduli scelti si **copiano** dal template in `.claude/rules/`: la copia la fa `/kit:copia-regole` (o `/kit:aggiorna-regole` per i progetti che hanno già le regole); se i moduli risultano già presenti e identici al template, Claude non li ricopia e prosegue con il resto della procedura.

| Modulo | Quando |
|---|---|
| `core.md` | sempre |
| `git.md` | sempre |
| `backend.md`, `backend-architecture.md`, `backend-app.md` | solo API o fullstack (i tre moduli backend vanno sempre insieme) |
| `frontend.md` | solo frontend o fullstack, con frontend Angular (non con Blazor) |
| `feature-workflow.md` | **solo fullstack** e solo se l'utente ha risposto sì alla domanda 8 (anche per la migrazione Blazor → Angular, §3d); mai in solo API, solo frontend o solo Git. Sta in `rules-optional/` |
| `backend-email.md` | **non all'avvio**: si attiva quando il progetto deve inviare email (§4, "Aggiunta di un modulo"). Sta in `rules-optional/` |
| `backend-infra.md` | **non all'avvio**: si attiva quando serve messaggistica (RabbitMQ), una cache applicativa (FusionCache L1 o memory cache nativa, eventuale L2 Redis) o eventi (§4, "Aggiunta di un modulo"). Sta in `rules-optional/` |
| `security.md` | se l'utente ha scelto la sicurezza |
| `docker.md` | se l'utente ha scelto Docker |

**Modalità solo Git:** restano soltanto `core.md` (che `git.md` richiede) e `git.md`; né i moduli backend (`backend.md`, `backend-architecture.md`, `backend-app.md`), né `frontend.md`, né `feature-workflow.md`, né `security.md`, né `docker.md`. Le sezioni di `core.md` che riguardano moduli non inclusi non si applicano. Il `CLAUDE.md` contiene solo le sezioni "Regole", "Progetto", "Git" ed "Eccezioni alle regole globali"; le altre (scelte architetturali, nomi e struttura, comandi, operatività) si aggiungono se in seguito si aggiungono i moduli. Ogni altro modulo si può aggiungere dopo (§4, "Aggiunta di un modulo"). Se la domanda 2 (sicurezza) o 3 (Docker) ha risposta sì, quei moduli restano comunque.

I moduli non scelti sono fuori ambito: i rimandi che li citano (es. "vedi anche `security.md`") non si applicano. Se in seguito l'utente li vuole, si aggiungono con la stessa procedura. I tre moduli backend (`backend.md`, `backend-architecture.md`, `backend-app.md`) si spostano, si copiano o si aggiungono sempre insieme.

## 2b. Piano di avvio (prima di scrivere nel progetto)
Dopo le domande del §1 (e, per un progetto esistente, dopo le ispezioni in sola lettura dei §3b e §3c) e **prima di eliminare, spostare o copiare qualunque modulo o creare qualunque file**, Claude redige il piano dell'avvio e lo salva come file `.md` dedicato, `PIANO.md`, nella **root del progetto/soluzione**. Il `core.md` non è ancora stato applicato al progetto, quindi la regola vale qui per esplicito richiamo del suo §6 punto 15. Il piano elenca: risposte alle domande, moduli da tenere, eliminare o attivare, `CLAUDE.md` da compilare, eventuali deroghe e decisioni aperte, passi ordinati con casella di stato. Si procede poi **un punto alla volta**, con l'ok esplicito dell'utente a fine di ogni punto (come da `core.md` §6.15). Se esiste già un `PIANO.md` con passi aperti, Claude chiede se riprenderlo o sostituirlo. `PIANO.md` non entra in nessun commit, salvo richiesta dell'utente; non si copia nei moduli.

## 3. Cosa fa Claude, in ordine
1. Verifica che il template (la copia nella cartella, oppure la radice indicata per un progetto esistente) contenga `.claude/rules/` (con `core.md` almeno), `.claude/rules-optional/`, `CLAUDE.md` e `_template/avvio-progetto.md`, e legge la versione nell'intestazione di `core.md`. **Se manca qualcosa si ferma**: elenca ciò che manca, non procede e chiede all'utente di completare il template o di indicare il percorso giusto. Se la procedura gira dal progetto (regole e `_template/` copiati con `/kit:copia-regole`) e non è stato indicato un percorso del template, il controllo riguarda i moduli e il `CLAUDE.md` già presenti nel progetto.
2. Controlla se la cartella del progetto è un repository git. Se non lo è, **non esegue mai `git init`**: segnala all'utente che git non è stato inizializzato in quel progetto/soluzione (l'inizializzazione è sua, vedi `git.md`), prosegue con la sistemazione dei moduli e del `CLAUDE.md` e non committa finché il repository non esiste.
3. **Moduli.** Progetto nuovo: sposta da `.claude/rules/` a `.claude/rules-optional/` i moduli non scelti e sposta in `.claude/rules/` quelli opzionali confermati. Progetto esistente: copia **tali e quali** in `.claude/rules/` del progetto i moduli scelti dalla radice del template, senza sottocartelle; non copia `_template/`, `.claude/rules-optional/` (salvo moduli confermati) né gli archivi. In ogni caso non modifica il contenuto dei moduli. Non aggiunge in `.claude/rules/` file `.md` che non siano regole (vengono caricati tutti).
4. Compila `CLAUDE.md` nella radice (progetto nuovo: quello del template; progetto esistente: se manca lo crea partendo dal `CLAUDE.md` del template, se esiste già lo allinea e completa senza sostituirlo). Per un progetto esistente esegue **prima** il §3b (se già versionato) e il §3c (scelte già presenti nel codice):
   - nessun `@import`: i moduli si caricano da `.claude/rules/`; la sezione "Regole" resta, eliminando dall'elenco i moduli non presenti;
   - compila ciò che sa già (tipo, stato, quali moduli) e chiede il minimo indispensabile per il resto (scopo, architettura backend se è un progetto nuovo con backend); i campi non noti restano `[..]`, non si inventano. Per i progetti con backend chiede anche il motore database (SQL Server o PostgreSQL). Per un progetto esistente, le scelte già presenti nel codice si trattano come da §3c. Gli altri campi marcati "chiesto, non presunto" o "concordato" (database nei test, JWT, email, job in background, logging, osservabilità, ecc.) si chiedono quando la funzionalità diventa rilevante, mai per assunzione né copiando un progetto precedente;
   - riporta la riga "Regole" con **versione e data di `core.md`** e l'elenco dei moduli **rimossi o non attivati**.
4b. **File di configurazione .NET (domanda 9):** nel progetto nuovo `NuGet.config` e `.editorconfig` sono già nella copia del template: Claude elimina quelli che l'utente non vuole e, per `NuGet.config`, segnala il contenuto che ha rilevanza di sicurezza (sorgenti NuGet interne, flag `allowInsecureConnections` per sorgenti HTTP, mappatura dei pacchetti), così l'utente decide con cognizione; per `.editorconfig` verifica la coerenza con `.gitattributes` (fine riga, vedi `git.md`) e con l'impostazione `root = true`. Nel progetto esistente copia `NuGet.config` e/o `.editorconfig` dalla radice del template nella root del progetto, **tali e quali**; se il file esiste già non lo sovrascrive: mostra le differenze e chiede (adeguare, tenere il proprio con una deroga nel `CLAUDE.md`, o unire). Se il file sorgente non esiste, lo segnala e prosegue. Le scelte si registrano nel `CLAUDE.md` (sezione "Nomi e struttura") e i file copiati si aggiungono al commit `chore(rules)`.
4c. **`.gitignore` (progetto nuovo):** il `.gitignore` del template copre Visual Studio, .NET, Angular e i file locali di Claude Code. In base al tipo di progetto (domanda 1) Claude **propone** di togliere le sezioni che non servono (per esempio .NET e Visual Studio in un progetto solo frontend, Angular/Node in un progetto solo API) e **chiede conferma, una domanda sola**; le voci per i file locali di Claude Code e per segreti e `.env` restano sempre. Senza conferma il file resta com'è. Nel progetto esistente non lo sostituisce: se manca o va integrato, mostra le differenze e chiede (vedi §3b). La scelta si annota nel `CLAUDE.md` (sezione "Note per Claude") e il file entra nel commit `chore(rules)`.
5. Progetto nuovo: elimina tutto ciò che appartiene al template e non al progetto: `_template/` (questo file compreso), `.claude-plugin/` e `plugins/` (marketplace e plugin `kit`, che si installano una volta per macchina, non per progetto). **Restano** `.claude/rules/` e `.claude/rules-optional/`, anche a progetto avviato, così Claude può aggiornare, aggiungere o rimuovere regole durante la vita del progetto, non solo all'avvio. `README.md` e `CHANGELOG.md` del template non restano: si sostituiscono con quelli del progetto (`core.md` §5b). Verifica che `.claude/rules/` contenga solo regole e invita l'utente a controllare con `/context`.
6. Se il repository esiste, propone, dopo aver confermato il branch con l'utente (`git.md`), un commit `chore(rules): add Claude rules` con i file creati (aggiunti per nome). Commit locale: **push, PR, tag e rilasci restano all'utente**.

## 3b. Progetto esistente già versionato (anche in modalità solo Git)
Se il progetto esiste già e ha un repository git con cronologia non gestita da Claude, prima di creare il `CLAUDE.md` (passo 4 del §3):
1. **Ispezione in sola lettura** (nessuna modifica, nessuna riscrittura; `git init` mai, in nessun caso): branch locali e remoti, branch principale, presenza di `develop`, tag, ultimi commit (`git log`) per lo stile dei messaggi, hook esistenti, `.gitattributes`, `.gitignore`, file di versione e changelog.
2. **Riepilogo all'utente** delle differenze rispetto a `git.md` (nome del branch principale, messaggi non Conventional Commits, lingua dei messaggi, fine riga, hook, ecc.). L'assenza di `develop` non è una variante ammessa: `develop` è obbligatorio (`git.md`), quindi Claude chiede, con una sola domanda, se può crearlo da `main` (branch locale, dopo la conferma); un branch principale con altro nome (es. `master`) lo segnala e chiede se adottare `main` e `develop`, senza rinominare nulla.
3. **Una domanda per volta, caso per caso:** per ogni differenza Claude chiede se adeguare il progetto alle regole oppure registrare una deroga nella sezione "Eccezioni alle regole globali" del `CLAUDE.md` di quel progetto, con il motivo (la deroga non vale per altri progetti). Non decide da solo e non presume.
4. **Mai riscrivere la cronologia esistente** (nessun `rebase`, `reset`, `amend`, rinomina di branch) per adeguarla alle regole: le regole valgono per i **nuovi** commit e branch, dal punto concordato in poi.
5. Compila la sezione "Git" del `CLAUDE.md` con le risposte (branch principale, strategia di merge, ecc.; il modello branch è fisso: git flow completo con `develop`).
6. Prima del primo commit (compreso `chore(rules)`) conferma il branch con l'utente, come da `git.md`: non si committa su `main`/`develop` senza deroga esplicita.

## 3c. Progetto esistente: scelte già presenti nel codice
Per un progetto esistente Claude non pone da zero le domande "chiesto, non presunto" del template e non presume nulla: **rileva, mostra e chiede**.
1. **Rilevamento in sola lettura** di ciò che il progetto già usa, leggendo codice e file di progetto (`*.csproj`, `Directory.Packages.props`, `appsettings*.json`, compose, `package.json`): motore database e provider EF Core, libreria di gestione errori, logging, invio email, job in background, autenticazione, cache, messaggistica, test, ecc., e anche **tecnologia frontend** (Angular, Blazor), **sviluppo mobile** (progetti MAUI, Capacitor, Flutter, React Native, manifest PWA) e **ORM** (EF Core, Dapper).
2. **Riepilogo all'utente** di quanto rilevato, confrontato con le regole.
3. **Una domanda per volta, per ogni scelta** (e per git e i file di progetto, vedi §3b): Claude chiede come comportarsi. Le opzioni sono due:
   - **Registrare una deroga**: la scelta esistente resta, e va nella sezione "Eccezioni alle regole globali" del `CLAUDE.md` **di quel progetto**, con il motivo. La deroga vale solo per quel progetto: non modifica mai i moduli in `.claude/rules/` né le regole globali e non si estende ad altri progetti.
   - **Adeguare il progetto alle regole** con un refactoring: non è escluso. Claude non lo avvia da solo; segue la regola dei refactoring ampi (descrive il piano in `PIANO.md`, chiede conferma, procede un punto alla volta).
4. Le scelte già conformi alle regole vanno nei campi del `CLAUDE.md` dopo la conferma dell'utente. Quelle non rilevabili restano `[..]` e si chiedono quando diventano rilevanti.

## 3d. Sostituzione del frontend esistente (Blazor → Angular)
Caso di un progetto esistente con frontend Blazor che l'utente vuole sostituire con Angular. È un **refactoring ampio** (`core.md` §6.12): non parte mai da solo, ha un `PIANO.md` dedicato e si esegue un punto alla volta con ok esplicito. Le regole di `frontend.md` si applicano al nuovo codice Angular; il codice Blazor non si adegua, si rimuove alla fine.
1. **Rilevamento in sola lettura:** progetti e pagine Blazor, modello di hosting (Server, WebAssembly, Auto), librerie UI (es. MudBlazor), risorse di localizzazione, autenticazione e sessione (cookie, Identity UI), servizi chiamati direttamente dalle pagine anziché via API, file statici. Riepilogo all'utente.
2. **Domande precise, una per volta** (`core.md` §6.5), senza presumere. Almeno:
   - dove gira il nuovo frontend: servito dall'host esistente (`Web`) oppure separato (altro progetto/container);
   - autenticazione e sessione della SPA: cookie HttpOnly oppure BFF (campo del `CLAUDE.md`), e come gestire la login esistente durante la transizione;
   - se le pagine Blazor leggono i dati **direttamente dai servizi** (non tramite API): quali endpoint mancano e vanno creati prima;
   - ordine di migrazione delle pagine (per area o per priorità) e quali, se ce ne sono, non si migrano;
   - dove stanno oggi testi e traduzioni e come portarli nel dizionario del progetto (`frontend.md` §4.2);
   - se il livello di host (`Web`) diventa **host solo API** subito o solo a fine migrazione;
   - se usare `feature-workflow.md` come flusso per ogni area migrata (domanda 8 del §1; se no, si segue il piano normale).
3. **Strategia:** Angular **in parallelo** a Blazor, poi rimozione di Blazor. Mai una riscrittura in blocco con un unico commit. Fasi tipiche, ciascuna un punto del `PIANO.md`:
   1. predisporre l'API: endpoint necessari, schema OpenAPI e client generato (flusso di `feature-workflow.md`, fasi 1 e 2, se l'utente ha scelto di usarlo; altrimenti piano normale);
   2. creare il progetto Angular secondo `frontend.md`, con tema, localizzazione, autenticazione e layout base;
   3. migrare le pagine **un'area alla volta** (flusso di `feature-workflow.md`, fase 3, se adottato), con le due interfacce che convivono e un elenco di avanzamento nel `PIANO.md` (pagina Blazor → equivalente Angular → stato);
   4. a copertura completa, e solo con l'ok dell'utente: rimuovere pagine, progetti e pacchetti Blazor (compresa la libreria UI), ripulire configurazione e file statici, far diventare `Web` un host solo API;
   5. aggiornare `CLAUDE.md` (campi "Tecnologia frontend", cartelle, comandi), README e CHANGELOG, e togliere dal `CLAUDE.md` la deroga transitoria.
4. **Deroghe transitorie:** finché Blazor è presente, nel `CLAUDE.md` del progetto si registra come deroga, con il criterio di rimozione (la tecnologia frontend in uso è doppia). Il codice Blazor non si modifica se non per ciò che serve alla coesistenza o a fix urgenti concordati.
5. **Git:** branch dedicato confermato con l'utente (`git.md`, tipo `feature/`); commit piccoli con il flusso "piano e passo-passo"; la rimozione di Blazor è un commit (o una serie) separato dalle migrazioni delle pagine. Il push resta all'utente; punti sensati per un push intermedio: a fine predisposizione API e a fine di ogni area migrata.
6. **Uscita:** nessun riferimento residuo a Blazor (progetti, pacchetti, route, risorse), build e test verdi, flussi principali verificati end-to-end in Angular.

## 4. Dopo l'avvio
- Le specificità del progetto vanno nel suo `CLAUDE.md`, sezione "Eccezioni alle regole globali" o nelle altre sezioni. I moduli in `.claude/rules/` restano identici all'originale (salvo l'intestazione concordata), così il confronto con il template è sempre possibile.
- **Riallineamento a richiesta:** Claude confronta versione e contenuto dei moduli del progetto con quelli di `.claude/rules/` e `.claude/rules-optional/` del template (di cui l'utente ha indicato il percorso), mostra le differenze per modulo e **applica solo dopo l'ok esplicito**. Aggiorna poi la riga "Regole" del `CLAUDE.md`. Non tocca le sezioni specifiche del progetto.
- **Aggiunta di un modulo:** si copia (o si sposta da `rules-optional/`) in `.claude/rules/` e si toglie il modulo dall'elenco dei rimossi o non attivati del `CLAUDE.md`; nessun import da aggiungere.
- **Moduli opzionali del backend (`backend-email.md`, `backend-infra.md`):** all'avvio non si chiedono. Quando durante lo sviluppo emerge la necessità (invio email; messaggistica, cache applicativa o eventi), Claude lo segnala, **chiede conferma** e propone di aggiungere il modulo con la procedura sopra; fino ad allora le funzionalità corrispondenti non si implementano e le regole non si improvvisano (`backend.md` §5). In un progetto esistente che già le usa, il rilevamento del §3c fa proporre il modulo.

## 5. Divieti
- Nessun percorso assoluto della macchina nei file del progetto né nei moduli.
- Nessuna modifica al template sorgente quando si lavora su un progetto esistente.
- Nessun `push`, PR, tag, rilascio o pipeline: sono dell'utente.
