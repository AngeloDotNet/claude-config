# Regole Git: flusso, commit e integrazione GitHub

> Versione 1.0 — ultima revisione: 2026-11-23.
> Estratto da `git.md` con gli stessi titoli di sezione. Richiede `core.md`. Caricato nei profili standard e strutturato; le pull request, il rilascio e le skill sono in `git-avanzato.md`.

## Integrazione GitHub: operazioni consentite e GitHub CLI
- **Autonome, senza conferma (`gh` e git):** issue, sub-issue, commit e branch locale di lavoro. Le issue sostituiscono `PIANO.md` e `CHECKLIST.md` (vedi `core.md` §6.15 e §6.22): il piano è una issue padre con le sub-issue come passi, i problemi sono issue.
- **Con il via dell'utente:** PR, `push` (incluso il primo push di un branch di lavoro verso il remoto), tag, rilasci. Claude li esegue su richiesta dell'utente (lanciare `/kit:pr-develop` o `/kit:pr-main` è la richiesta della PR) o con sua conferma esplicita; per tag, push del tag e rilascio propone lui l'operazione e chiede il via (vedi «Rilascio»).
- **Cancellazione di branch di lavoro:** autonoma solo dopo la verifica che la PR verso `develop` o `main` sia mergiata (vedi «Branch»).
- **Gestione del repository: mai da Claude.** Impostazioni e accessi del repository: visibilità, collaboratori e team, protezione dei branch e ruleset, segreti e variabili della CI, webhook, eliminazione, archiviazione o trasferimento. Creare un repository solo su richiesta esplicita. Il merge di PR resta all'utente.
- **Una sola domanda per progetto: la GitHub CLI.** Alla prima operazione che passa da `gh` (PR o rilascio) in un progetto, Claude chiede **una sola domanda**: se su questo PC è installata la GitHub CLI (`gh`). Con la risposta scrive nel `CLAUDE.md` di progetto, nella sezione «Eccezioni alle regole globali», la riga fissa `- **GitHub CLI (gh) installata:** sì/no (AAAA-MM-GG)`. Da lì in poi non la chiede più, salvo cambi di ambiente.
- **Con `sì`:** issue, sub-issue, PR e rilasci passano da `gh`. Prima, Claude verifica con `gh auth status` (sola lettura) che sia autenticata; se non lo è, lo dice e non procede.
- **Con `no`, o riga assente o non valida:** Claude non propone né esegue operazioni `gh` (issue, PR, rilasci) e indica all'utente cosa fare. Il hook `guard-commands` blocca `gh pr` e `gh release` finché la riga non c'è o dice `sì`.
- **Push, tag e commit** usano git e restano disponibili anche con `no`, alle condizioni sopra (il tag alle condizioni di «Rilascio»).
- **Uso di `gh`:** solo per le operazioni di questa sezione (issue, sub-issue, PR, rilasci, verifica di una PR mergiata per la cancellazione dei branch) e per la verifica di autenticazione. Nessun altro uso, nemmeno per leggere CI o impostazioni. Le chiusure di git flow restano a cura dell'utente (vedi «Branch»).
- **Pipeline (`gh workflow run` e simili):** Claude può avviarle, ma non senza una domanda esplicita di conferma **prima di ogni esecuzione**. La domanda nomina la pipeline, il branch o il ref e gli input; senza un sì a quella domanda Claude non avvia nulla. La conferma vale solo per quella esecuzione. Il hook non le blocca: la regola è questa.
- **Sempre bloccati:** restano vietati `push --force` (e varianti), `reset --hard`, `--no-verify`, `clean -f`, e `rm -rf`: riscrivono la storia, saltano i controlli o cancellano dati. Il hook `guard-commands` del plugin `kit` applica questo elenco. La cancellazione di branch remoti (`git push --delete`) è bloccata dall'hook salvo per i branch di lavoro (`feature/`, `bugfix/`, `release/`, `hotfix/`), e solo dopo la verifica di PR mergiata descritta in «Branch» (regola scritta, non verificabile dall'hook). `git init` resta vietato a Claude (vedi «Repository, fine riga e hook») ma come regola scritta, non più bloccato dall'hook; lo stesso vale per maiuscola iniziale, punto finale e lunghezza massima dell'oggetto del commit (l'hook controlla solo `tipo(scope): descrizione`).


## Branch (git flow)
- **Modello:** git flow completo, **obbligatorio in ogni progetto**. `main` contiene solo codice rilasciato; `develop` è il branch di integrazione (il nome è sempre `develop`); il lavoro nasce su branch dedicati: `feature/` (nuove funzionalità), `bugfix/` (correzioni), `release/` (preparazione di un rilascio), che partono da `develop`, e `hotfix/` (correzione urgente su produzione), che parte da `main`. Non esiste un flusso semplificato senza `develop`: si deroga solo con approvazione esplicita dell'utente.
- **Se `develop` non esiste:** Claude non propone di partire da `main` e non lo aggira. Pone una sola domanda: se può creare `develop` da `main` (branch locale, solo dopo la conferma; `push` e collegamento al remoto restano all'utente). Ricevuta la risposta, crea il branch di lavoro (per esempio `feature/nome-breve`) a partire da `develop`, senza altre conferme. Se il progetto ha un branch principale con altro nome (per esempio `master`) o un altro modello, Claude lo segnala e chiede se adottare `main` e `develop`, senza rinominare nulla di sua iniziativa.
- **Nomi:** `tipo/descrizione-breve` in minuscolo con trattini (`feature/order-export`, `bugfix/login-redirect`, `release/1.4.0`, `hotfix/1.4.1`). Se il lavoro è collegato a un ticket, il suo ID entra nel nome (`feature/ABC-123-order-export`). I commit dentro il branch usano i tipi Conventional Commits (`feat`, `fix`, ...), indipendenti dal nome del branch.
- **Branch di lavoro, senza conferma:** prima del primo commit di un lavoro Claude dice in una riga su quale branch si trova; se è su `main` o `develop` sceglie tipo, nome e branch di partenza e crea il branch di lavoro da solo, quando lo ritiene opportuno per gestirvi i commit. Se è già su un branch di lavoro, continua lì. Non serve chiedere conferma.
- **Mai commit diretto su `main` o `develop`.** Un'eccezione esiste solo se l'utente la dichiara esplicitamente e vale per il caso o il progetto indicato, non diventa la regola generale.
- Claude crea il branch locale di lavoro senza chiedere conferma. Non esegue le chiusure di git flow (merge di `feature`, `release`, `hotfix` in `develop`/`main`): sono a cura dell'utente. **Cancellazione dei branch di lavoro (`feature/`, `bugfix/`, `release/`, `hotfix/`, locali e remoti):** Claude la esegue in autonomia solo dopo aver verificato che la PR verso `develop` o `main` sia in stato `MERGED` (`gh pr view`); per uno squash la verifica è lo stato della PR, non l'ancestry git. Mai `main` o `develop`, e mai un branch con una PR ancora aperta. Con `/kit:pr-main` l'allineamento di `main` e `develop` locali con `git pull --ff-only` resta un passo della skill, senza merge né rebase né commit. Un branch remoto nasce solo dal `push` normale del branch di lavoro (necessario per aprire una PR), eseguito su richiesta o con conferma. Il tag è consentito alle condizioni di «Rilascio».
- **Base avanzata o conflitti:** se Claude nota che il branch di partenza è avanzato, o che ci sono conflitti (per esempio dopo un'operazione dell'utente), lo segnala e non committa finché i conflitti non sono risolti. Può **proporre** come risolverli, mostrando le versioni a confronto e il motivo della scelta, ma applica la risoluzione solo dopo l'ok dell'utente; l'aggiornamento del branch (merge o rebase) resta a cura dell'utente.
- Branch di breve durata. L'aggiornamento dal branch di partenza e il merge (squash o rebase secondo la politica del progetto) sono a cura dell'utente; il push è consentito su richiesta o con conferma (vedi «Integrazione GitHub»). Con git flow la politica ha una regola fissa, vedi "Pull Request": squash solo per le PR verso `develop`, merge commit per ogni PR che coinvolge `main`.


## Messaggi di commit (Conventional Commits, in inglese)
▲ Verificato dal plugin `kit` (hook `guard-commands`): un messaggio non conforme viene bloccato.
- Formato: `tipo(scope): descrizione` — tipi ammessi: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.
- Oggetto all'imperativo, minuscolo, senza punto finale, al massimo 72 caratteri. `scope` opzionale (modulo o slice, es. `orders`, `auth`).
- Il corpo, se serve, spiega il **perché** e non il cosa, andando a capo a 100 caratteri circa.
- Breaking change: `!` dopo il tipo/scope (`feat(api)!: ...`) e footer `BREAKING CHANGE: ...`. Riferimenti ai ticket nel footer (`Refs: ABC-123`).
- **Il corpo è la norma, non l'eccezione**, per tutto ciò che non è banale: un breve paragrafo che spiega perché si cambia e quale problema risolve (causa radice per i `fix`), oppure un elenco puntato (`- `) degli interventi principali. Cita per nome tipi, metodi e file toccati.
- Riferimento a issue o PR nel corpo o nell'oggetto: `(issue #123)`, `(#456)`. Su `develop` i commit di squash di una PR hanno il suffisso `(#NNN)`; su `main` il commit di merge ha oggetto `merge: <sintesi> (#NNN)` (vedi «Pull Request»). `merge` non è un tipo per i commit di Claude: è solo l'oggetto del commit di merge creato dall'utente su GitHub, fuori dal controllo del hook; un merge locale fatto da Claude (per esempio `main` in `develop`) usa `chore(repo)`.
- **Bot delle dipendenze (Dependabot/Renovate):** quando Claude scrive la configurazione del bot, i commit e i titoli delle PR usano il prefisso `build(deps)` per le dipendenze di produzione e `chore(deps-dev)` per quelle di sviluppo, così restano conformi a Conventional Commits e al lint sulle PR verso `develop`.
- Mai messaggi generici (`Save uncommitted changes`, `wip`, `fix`, `update`): ogni commit dice cosa e perché. Unica eccezione, i commit WIP richiesti dall'utente (vedi "Repository, fine riga e hook").
- Trailer in fondo, dopo una riga vuota. Se è richiesta un'attribuzione a Claude: `Co-Authored-By: <modello> <noreply@anthropic.com>`; se la sessione ha un link, anche `Claude-Session: <url>`. Mai nell'oggetto.


## Granularità e sequenza
Una funzionalità non è un unico commit gigante: è una **serie di commit piccoli e ordinati sul branch**, ciascuno che builda e passa i test. Ordine tipico:
1. `feat(scope)`: modello/entità, configurazione EF e migrazione (+ servizio applicativo, se piccolo);
2. `feat(scope)`: endpoint o UI che usano il servizio;
3. `test(scope)`: test del servizio e dell'isolamento tra utenti; test di integrazione per ciò che gli unit test non coprono, nel progetto `IntegrationTests` con il database di prova (vedi `core.md` §4 e `backend-app.md` §4.5);
4. `docs(scope)` / `chore(...)`: aggiornamento di `README.md` e `CHANGELOG.md` (a ogni step del piano, vedi `core.md` §5b), ADR se servono.
- I **test stanno in commit `test(scope)` separati** dal codice di produzione, ma nella stessa PR; mai una PR con funzionalità senza test.
- Un `fix` è un commit a sé, con la causa radice nel corpo. Un bug di sicurezza usa `fix(security)`.
- Non mescolare refactoring, formattazione e cambi di comportamento nello stesso commit.
- Le chiavi di traduzione IT/EN viaggiano con la superficie UI che le usa (un commit per superficie va bene, come `extract orders surface strings`).
- Se un commit corregge il precedente della stessa serie e non è stato ancora pubblicato (nessun upstream che lo contiene), puoi fare `--amend` solo sull'ultimo commit creato da te in sessione; altrimenti crea un commit `fix` nuovo.


## Commit multipli: piano e passo-passo
**Con `/kit:commit-passo`** il lancio è il via libera: la skill crea tutti i commit in sequenza senza ok a ciascuno e si ferma con una domanda solo nei casi anomali elencati nella skill (controllo fallito, possibile segreto, tipo ambiguo, file con modifiche per commit diversi, build o test rossi, hook fallito). Il resto di questa sezione vale **fuori dalle skill**, quando le modifiche sono più di un'unità logica (o l'utente chiede "committa tutto"): Claude crea i commit uno alla volta, come sotto, senza chiedere ok per ciascuno.
1. **Piano:** prima di ogni commit elenca quelli che intende fare, numerati e in ordine ("Granularità e sequenza"), con oggetto e file. Segnala i file che non rientrano in nessun commit (segreti, generati, estranei) e quelli con **modifiche destinate a commit diversi**: `git add -p` non è disponibile, quindi **chiede caso per caso** se spezzarli (patch parziale con `git apply --cached`, mostrata prima) o unire i commit; non sceglie da solo. Il piano della serie è una **issue padre** con una sub-issue per commit, chiusa dopo ogni commit; nessun file locale. Quando tutte le sub-issue sono chiuse, Claude chiude la issue padre.
2. **Un commit alla volta:** crea il commit n. 1 (file per nome, `git status` e `git diff --staged` controllati), mostra hash e oggetto, poi passa al successivo (`n/N`, oggetto) senza chiedere, purché build e test siano verdi. Se un passo fallisce o le modifiche sono ambigue, si ferma e chiede.
3. **Commit in autonomia:** i commit non richiedono ok (decisione B, 2026-11-22). Il piano della serie è la issue padre con una sub-issue per commit; le domande restano solo per i casi anomali (file con modifiche destinate a commit diversi, segreti, build o test rossi).
4. **Chiusura:** riepiloga commit creati e rimasti e segnala che sono pronti per il `push` (su richiesta o con conferma). Poiché ogni commit è verificato prima, il push può essere a lotti: Claude **propone i punti sensati per un push intermedio** (gruppo coerente con build e test verdi), senza eseguirlo.
5. **Se un commit fallisce** (hook, test rossi): corregge la causa, ricrea quel commit e ripresenta il punto; non passa al successivo.


## Cosa non entra mai nel repository
- Segreti, `.env`, certificati, chiavi, dump di database, file generati (`bin`, `obj`, `node_modules`, `dist`) e file di IDE personali. Verifica `.gitignore` all'inizio del progetto.
- Prima di ogni commit controlla `git status` e `git diff --staged`: aggiungi i file per nome, mai `git add -A` alla cieca (▲ verificato da `guard-commands`: blocca `git add -A`, `git add .` e i file sensibili). Se compare qualcosa che sembra un segreto, fermati e segnalalo.
- **Controlli automatici sulle modifiche in stage:** `git diff --cached --check` (spazi finali, marcatori di conflitto, fine riga misti); `gitleaks` solo se è già installato sulla macchina (altrimenti lo dici, senza installarlo); segnala file aggiunti molto grandi o binari non attesi prima di committarli.
- I lock file (`packages.lock.json`, `package-lock.json`) vanno committati; i file di build no.


## Repository, fine riga e hook
- **Cartella non versionata:** se la cartella di lavoro non è un repository git, Claude **non esegue mai `git init`**, nemmeno se l'utente non lo vieta: si limita a **segnalare** che in quel progetto/soluzione git non è stato inizializzato e non committa. Claude è limitato ai commit locali su repository già esistenti; l'inizializzazione (e il collegamento a un remoto) è a cura dell'utente. Quando l'utente avrà inizializzato il repository, Claude riprende da lì.
- **Fine riga:** il repository ha un `.gitattributes` con `* text=auto` e `eol` esplicito per i file che lo richiedono (es. `*.sh text eol=lf`, `*.ps1 text eol=crlf`); `.editorconfig` coerente. Serve perché si lavora su Windows: senza, i diff si riempiono di cambi di fine riga. Se manca, Claude lo segnala e **valuta caso per caso** se proporlo: non lo dà per scontato e non lo crea né lo committa senza il tuo ok. Se l'utente conferma, il commit è `chore(repo)` a sé, e solo se il repository esiste (Claude non lo inizializza, vedi sopra). In un progetto esistente la modifica delle regole di fine riga può cambiare molti file: va valutata con l'utente prima di toccarli.
- **Hook pre-commit** (es. husky + lint-staged, o hook in `.githooks/`): sono parte del progetto. Claude può scriverli e committarli se richiesto; l'attivazione sulla macchina (`core.hooksPath`, `npm install`) è dell'utente. Se un hook fallisce durante un commit, Claude corregge la causa e ricrea il commit (divieto di `--no-verify`: vedi «Sicurezza della cronologia»).
- **Commit con test rossi (WIP):** di norma ogni commit builda e passa i test. Un commit con build o test rossi è ammesso solo se l'utente lo chiede esplicitamente (es. per salvare un lavoro a metà); in tal caso oggetto `chore(wip): <cosa è in corso>`, corpo che indica cosa è rotto e perché, e nessun `--amend` o riscrittura successiva senza richiesta. La pulizia (squash) prima della PR è dell'utente.


## Sicurezza della cronologia
- Mai riscrivere cronologia che potrebbe essere già pubblicata (`rebase`, `reset`, `commit --amend` su commit non creati da te in sessione) senza conferma. Mai `push --force` (né `--force-with-lease`).
- Mai saltare gli hook (`--no-verify`) né la firma dei commit: se un hook fallisce, correggi la causa.
- Per annullare una modifica già pubblicata usa `git revert`, non `reset`.
- Se un segreto finisce in un commit, la rotazione del segreto viene prima di qualsiasi pulizia della cronologia.

Le sezioni «Pull Request», «Rilascio», «Skill del plugin `kit` per commit e PR» ed «Esempio di riferimento» stanno in `git-avanzato.md`, con gli stessi titoli (profili standard e strutturato).

