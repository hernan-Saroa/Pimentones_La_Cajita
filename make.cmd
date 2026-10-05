@echo off
setlocal
if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="dev" goto dev
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="test" goto test
if "%1"=="build" goto build
if "%1"=="smoke" goto smoke
if "%1"=="logs" goto logs
if "%1"=="backup" goto backup
if "%1"=="restore" goto restore
if "%1"=="deploy" goto deploy
if "%1"=="rollback" goto rollback

echo Comando desconocido: %1
exit /b 1

:help
echo Comandos disponibles: dev, up, down, test, build, smoke, logs, backup, restore, deploy, rollback
exit /b 0

:dev
"C:\Program Files\Git\bin\bash.exe" scripts/dev.sh
exit /b %ERRORLEVEL%

:up
"C:\Program Files\Git\bin\bash.exe" scripts/up.sh
exit /b %ERRORLEVEL%

:down
docker compose down
exit /b %ERRORLEVEL%

:test
npm test -w apps/api
exit /b %ERRORLEVEL%

:build
npm run build
exit /b %ERRORLEVEL%

:smoke
"C:\Program Files\Git\bin\bash.exe" scripts/smoke.sh %2
exit /b %ERRORLEVEL%

:logs
"C:\Program Files\Git\bin\bash.exe" scripts/logs.sh %2
exit /b %ERRORLEVEL%

:backup
"C:\Program Files\Git\bin\bash.exe" scripts/backup.sh
exit /b %ERRORLEVEL%

:restore
"C:\Program Files\Git\bin\bash.exe" scripts/restore.sh %2
exit /b %ERRORLEVEL%

:deploy
"C:\Program Files\Git\bin\bash.exe" scripts/deploy.sh
exit /b %ERRORLEVEL%

:rollback
"C:\Program Files\Git\bin\bash.exe" scripts/rollback.sh %2
exit /b %ERRORLEVEL%
