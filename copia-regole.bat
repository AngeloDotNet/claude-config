@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

rem Copia e aggiorna le regole di Claude Code (.claude\rules) in un progetto.
rem Va tenuto nella root del template: il template e' la cartella che lo contiene.
rem Voce 1: copia le regole e, a richiesta, i file di root (CLAUDE.md, NuGet.config,
rem .editorconfig, .gitignore, .gitattributes). Voce 2: aggiorna le regole gia' presenti (in rules
rem e in rules-optional); se c'e' backend.md, aggiunge i moduli backend mancanti.
rem Non tocca mai PIANO.md ne' altri file del progetto.

set "TPL=%~dp0"
if "%TPL:~-1%"=="\" set "TPL=%TPL:~0,-1%"

if not exist "%TPL%\.claude\rules\core.md" (
    echo Template non valido: manca .claude\rules\core.md in "!TPL!".
    pause
    exit /b 1
)

:menu
cls
echo ================================================
echo  Regole Claude Code - copia e aggiornamento
echo ================================================
echo  Template: %TPL%
echo.
echo  1. Progetto esistente SENZA regole: copia le regole
echo  2. Progetto con regole gia' presenti: aggiorna le regole
echo  0. Esci
echo.
choice /c 120 /n /m "Scelta: "
if errorlevel 3 exit /b 0
if errorlevel 2 call :Update & pause & goto :menu
if errorlevel 1 call :Copy & pause & goto :menu
goto :menu

rem ---------------------------------------------------------------
rem Voce 1: copia delle regole in un progetto
rem ---------------------------------------------------------------
:Copy
call :AskDest || exit /b 0
set "HASRULES="
if exist "!DEST!\.claude\rules\" (
    set "HASRULES=1"
    echo.
    echo Il progetto ha gia' le regole in .claude\rules: per aggiornarle usare la voce 2.
    choice /c SN /m "Continuare comunque con la copia"
    if errorlevel 2 exit /b 0
)
if not exist "!DEST!\.claude\rules" mkdir "!DEST!\.claude\rules"
echo.
echo Moduli sempre inclusi:
call :Sync "%TPL%\.claude\rules\core.md" "!DEST!\.claude\rules\core.md"
call :Sync "%TPL%\.claude\rules\git.md" "!DEST!\.claude\rules\git.md"
echo.
echo Moduli facoltativi:
call :Ask security rules "regole di sicurezza"
call :AskBackend
call :Ask frontend rules "frontend Angular"
call :Ask docker rules "Docker e compose"
call :Ask feature-workflow rules-optional "flusso per entita', solo fullstack"
call :Ask backend-email rules-optional "invio email"
call :Ask backend-infra rules-optional "messaggistica, cache ed eventi"
echo.
echo File di progetto nella root (CLAUDE.md solo se manca; per gli altri, se esistono gia' e sono diversi, viene chiesta conferma):
call :CopyIfMissing CLAUDE.md
call :AskRoot NuGet.config "solo backend .NET"
call :AskRoot .editorconfig "solo backend .NET"
call :AskRoot .gitignore "Visual Studio, .NET, Angular, file locali di Claude Code"
call :AskRoot .gitattributes "fine riga (text=auto)"
echo.
if defined HASRULES (
    echo Progetto con regole gia' presenti: la procedura di avvio non e' stata copiata.
    echo Verificare con /context che le regole risultino caricate.
    exit /b 0
)
echo Procedura di avvio per Claude (la cartella _template viene eliminata da Claude a fine procedura):
if not exist "!DEST!\_template" mkdir "!DEST!\_template"
call :Sync "%TPL%\_template\avvio-progetto.md" "!DEST!\_template\avvio-progetto.md"
echo.
echo Fatto. Aprire Claude Code nel progetto e scrivere: Applica le regole di questo progetto
echo Claude compila o allinea il CLAUDE.md con le domande di avvio.
echo Verificare con /context che le regole risultino caricate.
exit /b 0

rem ---------------------------------------------------------------
rem Voce 2: aggiornamento delle regole gia' presenti nel progetto
rem ---------------------------------------------------------------
:Update
call :AskDest || exit /b 0
if not exist "!DEST!\.claude\rules\" (
    echo Nessuna cartella .claude\rules nel progetto: usare la voce 1.
    exit /b 0
)
echo.
set "BKDIR="
if exist "!DEST!\.claude\rules\backend.md" set "BKDIR=rules"
if not defined BKDIR if exist "!DEST!\.claude\rules-optional\backend.md" set "BKDIR=rules-optional"
if defined BKDIR (
    echo Moduli backend: backend.md e' diviso in tre moduli, i mancanti vengono aggiunti in .claude\!BKDIR!:
    call :Sync "%TPL%\.claude\rules\backend-architecture.md" "!DEST!\.claude\!BKDIR!\backend-architecture.md"
    call :Sync "%TPL%\.claude\rules\backend-app.md" "!DEST!\.claude\!BKDIR!\backend-app.md"
    echo.
)
echo Confronto con il template:
for %%F in ("%TPL%\.claude\rules\*.md") do call :UpdateOne "%%~fF" "%%~nxF" rules
for %%F in ("%TPL%\.claude\rules-optional\*.md") do call :UpdateOne "%%~fF" "%%~nxF" optional
echo.
echo Fatto. I file sovrascritti sono salvati accanto agli originali con estensione .bak
echo (non vengono caricati da Claude Code; si possono cancellare dopo il controllo).
echo Il CLAUDE.md del progetto non viene toccato: aprire Claude Code nel progetto e scrivere
echo "Riallinea le regole" per allineare i rimandi e l'elenco dei moduli.
exit /b 0

rem Aggiorna un modulo solo se e' gia' presente nel progetto, in rules o in rules-optional:
rem %1 origine, %2 nome, %3 rules o optional (cartella del template di provenienza). Un modulo del
rem template che il progetto tiene disattivato in rules-optional si aggiorna li'.
:UpdateOne
if exist "!DEST!\.claude\rules\%~2" (
    call :Sync %1 "!DEST!\.claude\rules\%~2"
    exit /b 0
)
if exist "!DEST!\.claude\rules-optional\%~2" (
    call :Sync %1 "!DEST!\.claude\rules-optional\%~2"
    exit /b 0
)
if "%~3"=="rules" echo   [nuovo]      %~2 e' nel template ma non nel progetto: per aggiungerlo usare la voce 1
exit /b 0

rem Chiede il percorso del progetto e lo valida; imposta DEST.
:AskDest
set "DEST="
set /p "DEST=Percorso della cartella del progetto: "
set "DEST=%DEST:"=%"
if not defined DEST (
    echo Percorso vuoto.
    exit /b 1
)
if "!DEST:~-1!"=="\" set "DEST=!DEST:~0,-1!"
if not exist "!DEST!\" (
    echo Cartella non trovata: !DEST!
    exit /b 1
)
for %%I in ("!DEST!") do set "DEST=%%~fI"
if /i "!DEST!"=="%TPL%" (
    echo Il progetto non puo' coincidere con il template.
    exit /b 1
)
exit /b 0

rem Chiede se includere un modulo: %1 nome, %2 cartella del template, %3 descrizione.
:Ask
choice /c SN /m "Includere %~1 - %~3"
if errorlevel 2 exit /b 0
call :Sync "%TPL%\.claude\%~2\%~1.md" "!DEST!\.claude\rules\%~1.md"
exit /b 0

rem Copia un file di root solo se manca nel progetto, senza chiedere; se esiste non lo tocca.
rem %1 nome. Serve per il CLAUDE.md: se c'e' gia', Claude lo allinea invece di sostituirlo.
:CopyIfMissing
if exist "!DEST!\%~1" (
    echo   [presente]   %~1 non toccato: Claude lo allineera' alle regole
    exit /b 0
)
copy /y "%TPL%\%~1" "!DEST!\%~1" >nul
echo   [copiato]    %~1 modello da compilare con Claude
exit /b 0

rem Chiede se copiare un file di root del template: %1 nome, %2 descrizione.
:AskRoot
choice /c SN /m "Copiare %~1 - %~2"
if errorlevel 2 exit /b 0
call :Sync "%TPL%\%~1" "!DEST!\%~1"
exit /b 0

rem Copia %1 in %2: se manca lo crea, se e' uguale lo salta, se e' diverso chiede conferma
rem e salva il vecchio file come .bak.
:Sync
set "NAME=%~nx1"
if not exist "%~2" (
    copy /y "%~1" "%~2" >nul
    echo   [copiato]    !NAME!
    exit /b 0
)
fc /b "%~1" "%~2" >nul 2>&1
if not errorlevel 1 (
    echo   [uguale]     !NAME!
    exit /b 0
)
echo   [diverso]    !NAME!
choice /c SN /m "  Sovrascrivere? Il vecchio file diventa !NAME!.bak"
if errorlevel 2 (
    echo   [saltato]    !NAME!
    exit /b 0
)
copy /y "%~2" "%~2.bak" >nul
copy /y "%~1" "%~2" >nul
echo   [aggiornato] !NAME!
exit /b 0

rem Chiede se includere il backend .NET: i tre moduli (backend, backend-architecture, backend-app) vanno sempre insieme.
:AskBackend
choice /c SN /m "Includere backend (tre moduli: regole comuni, architettura, logica applicativa) - backend .NET"
if errorlevel 2 exit /b 0
call :Sync "%TPL%\.claude\rules\backend.md" "!DEST!\.claude\rules\backend.md"
call :Sync "%TPL%\.claude\rules\backend-architecture.md" "!DEST!\.claude\rules\backend-architecture.md"
call :Sync "%TPL%\.claude\rules\backend-app.md" "!DEST!\.claude\rules\backend-app.md"
exit /b 0
