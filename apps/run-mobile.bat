@echo off
setlocal
title Garnet mobile
rem Double-click to run Garnet. Starts the local backend first (Docker with Postgres and Mailpit,
rem migrations, the API in its own window; P-76, B1), then the app. Everything stays on this PC.

rem Work from the repository root (this file lives in apps\).
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required. Install it from https://nodejs.org and try again.
  goto :fail
)

set "PNPM=pnpm"
where pnpm >nul 2>nul
if errorlevel 1 set "PNPM=corepack pnpm"

echo Checking dependencies...
call %PNPM% install
if errorlevel 1 goto :fail

echo.
echo Starting the local backend...
call node scripts\dev-backend.mjs
if errorlevel 1 goto :fail

echo.
echo   Garnet mobile
echo   -------------
echo   [1] Android phone over USB - real accounts on this PC's backend (builds the APK; slow first time)
echo   [2] Browser preview        - sample data, opens http://localhost:8081
echo   [3] Phone with Expo Go     - sample data; needs Expo Go for SDK 57
echo   [4] Backend only           - leave the API running and close this window
echo.
choice /c 1234 /n /m "Choose 1, 2, 3 or 4: "
if errorlevel 4 goto :backend
if errorlevel 3 goto :expogo
if errorlevel 2 goto :web

rem The phone reaches the PC's API and mailbox over USB (adb reverse), so nothing is opened to Wi-Fi.
where adb >nul 2>nul
if errorlevel 1 (
  echo adb wasn't found. Install the Android SDK platform-tools and add them to PATH.
  goto :fail
)
adb get-state >nul 2>nul
if errorlevel 1 (
  echo No Android phone found. Connect it over USB with USB debugging on, then try again.
  goto :fail
)
adb reverse tcp:3000 tcp:3000
if errorlevel 1 goto :fail
adb reverse tcp:8025 tcp:8025
set "EXPO_PUBLIC_API_URL=http://127.0.0.1:3000"
set "EXPO_PUBLIC_API_AREAS=auth,pairing,setup,settings"
echo Building and installing on the phone. Account emails arrive at http://127.0.0.1:8025
call %PNPM% --filter @garnet/mobile apk -- --install
if errorlevel 1 goto :fail
echo.
echo Installed. Open Garnet on the phone. If you unplug it, run "adb reverse tcp:3000 tcp:3000" again.
goto :end

:web
echo Starting the browser preview. Press Ctrl+C in this window to stop.
call %PNPM% --filter @garnet/mobile exec expo start --web
goto :end

:expogo
echo Starting Expo. Scan the QR code with Expo Go; phone and PC on the same Wi-Fi.
call %PNPM% --filter @garnet/mobile start
goto :end

:backend
echo The API keeps running in its "Garnet API" window; close that window to stop it.
echo To stop the database and mailbox: docker compose -f infra\docker-compose.yml stop
goto :end

:fail
echo.
echo Something went wrong. Read the messages above.

:end
echo.
pause
