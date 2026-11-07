@echo off
setlocal EnableDelayedExpansion
title Garnet Runner
rem Work from repository root (this file lives in apps\)
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 24 or newer is required. Install from https://nodejs.org
  goto :fail
)

set "PNPM=pnpm"
where pnpm >nul 2>nul
if errorlevel 1 set "PNPM=corepack pnpm"

:menu
cls
echo ====================================================================
echo                           GARNET RUNNER
echo ====================================================================
echo.
echo   --- CONNECT TO DEPLOYED BACKEND (https://garnet.lunafh.com) ---
echo   [1] Mobile APK on Android Phone  (Build + Install via USB)
echo   [2] Mobile in Web Browser        (Starts Expo Web)
echo   [3] Mobile in Expo / Expo Go     (Starts Metro bundler)
echo.
echo   --- CONNECT TO LOCAL BACKEND (http://127.0.0.1:3000) ---
echo   [4] Mobile APK on Android Phone  (Local Docker + API + USB)
echo   [5] Mobile in Web Browser        (Local Docker + API + Web)
echo   [6] Mobile in Expo / Expo Go     (Local Docker + API + Metro)
echo.
echo   --- BACKEND SERVICES ONLY ---
echo   [7] Start Local Backend Only     (Docker Postgres + Mailpit + API)
echo   [8] Check Deployed API Health    (https://garnet.lunafh.com)
echo   [9] Exit
echo.
echo ====================================================================
choice /c 123456789 /n /m "Select an option [1-9]: "
set "OPT=%errorlevel%"

if "%OPT%"=="1" goto :opt_deploy_phone
if "%OPT%"=="2" goto :opt_deploy_web
if "%OPT%"=="3" goto :opt_deploy_expo
if "%OPT%"=="4" goto :opt_local_phone
if "%OPT%"=="5" goto :opt_local_web
if "%OPT%"=="6" goto :opt_local_expo
if "%OPT%"=="7" goto :opt_backend_only
if "%OPT%"=="8" goto :opt_health_check
if "%OPT%"=="9" goto :end
goto :menu

rem --------------------------------------------------------------------
rem DEPLOYED BACKEND OPTIONS
rem --------------------------------------------------------------------
:opt_deploy_phone
call :set_deployed_env
call :check_adb
echo Building and installing APK connected to live backend...
call %PNPM% --filter @garnet/mobile apk -- --install
if errorlevel 1 goto :fail
echo.
echo Launching Garnet on phone...
adb shell monkey -p app.garnet.prototype -c android.intent.category.LAUNCHER 1 >nul 2>nul
echo Done! App installed and connected to https://garnet.lunafh.com
goto :end

:opt_deploy_web
call :set_deployed_env
echo Starting Expo web preview connected to https://garnet.lunafh.com ...
call %PNPM% --filter @garnet/mobile exec expo start --web
goto :end

:opt_deploy_expo
call :set_deployed_env
echo Starting Expo Metro bundler connected to https://garnet.lunafh.com ...
call %PNPM% --filter @garnet/mobile start
goto :end

rem --------------------------------------------------------------------
rem LOCAL BACKEND OPTIONS
rem --------------------------------------------------------------------
:opt_local_phone
call :start_local_backend
call :set_local_env
call :check_adb
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8025 tcp:8025
echo Building and installing APK connected to local backend...
call %PNPM% --filter @garnet/mobile apk -- --install
if errorlevel 1 goto :fail
echo.
echo Launching Garnet on phone...
adb shell monkey -p app.garnet.prototype -c android.intent.category.LAUNCHER 1 >nul 2>nul
echo Done! App installed and connected to local backend (http://127.0.0.1:3000)
goto :end

:opt_local_web
call :start_local_backend
call :set_local_env
echo Starting Expo web preview connected to http://127.0.0.1:3000 ...
call %PNPM% --filter @garnet/mobile exec expo start --web
goto :end

:opt_local_expo
call :start_local_backend
call :set_local_env
echo Starting Expo Metro bundler connected to http://127.0.0.1:3000 ...
call %PNPM% --filter @garnet/mobile start
goto :end

rem --------------------------------------------------------------------
rem BACKEND ONLY
rem --------------------------------------------------------------------
:opt_backend_only
call :start_local_backend
echo.
echo Local backend is running.
echo To stop: docker compose -f infra\docker-compose.yml stop
goto :end

:opt_health_check
echo Checking https://garnet.lunafh.com/v1/health ...
node -e "fetch('https://garnet.lunafh.com/v1/health').then(async r => console.log('STATUS:', r.status, 'BODY:', await r.text())).catch(err => console.error('ERROR:', err.message));"
echo.
pause
goto :menu

rem --------------------------------------------------------------------
rem HELPERS
rem --------------------------------------------------------------------
:set_deployed_env
echo Configuring mobile for DEPLOYED backend (https://garnet.lunafh.com)...
set "EXPO_PUBLIC_API_URL=https://garnet.lunafh.com"
set "EXPO_PUBLIC_API_AREAS=all"
> "apps\mobile\.env" (
  echo EXPO_PUBLIC_API_URL=https://garnet.lunafh.com
  echo EXPO_PUBLIC_API_AREAS=all
)
exit /b 0

:set_local_env
echo Configuring mobile for LOCAL backend (http://127.0.0.1:3000)...
set "EXPO_PUBLIC_API_URL=http://127.0.0.1:3000"
set "EXPO_PUBLIC_API_AREAS=all"
> "apps\mobile\.env" (
  echo EXPO_PUBLIC_API_URL=http://127.0.0.1:3000
  echo EXPO_PUBLIC_API_AREAS=all
)
exit /b 0

:start_local_backend
echo.
echo [1/2] Checking dependencies...
call %PNPM% install
if errorlevel 1 goto :fail
echo.
echo [2/2] Starting local backend (Docker + PostgreSQL + API)...
call node scripts\dev-backend.mjs
if errorlevel 1 goto :fail
exit /b 0

:check_adb
where adb >nul 2>nul
if errorlevel 1 (
  echo [ERROR] adb wasn't found in PATH. Install Android SDK platform-tools.
  goto :fail
)
adb get-state >nul 2>nul
if errorlevel 1 (
  echo [ERROR] No Android phone detected over USB with debugging enabled.
  goto :fail
)
exit /b 0

:fail
echo.
echo [FAIL] Execution encountered an error. Read output above.
pause
exit /b 1

:end
echo.
pause
