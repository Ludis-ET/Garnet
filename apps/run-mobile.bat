@echo off
setlocal
title Garnet mobile
rem Double-click to run the Garnet mobile prototype (Phase 2: local mock data only, no backend).

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

if not exist "apps\mobile\node_modules\" (
  echo Installing dependencies. This happens on the first run only...
  call %PNPM% install
  if errorlevel 1 goto :fail
)

echo.
echo   Garnet mobile
echo   -------------
echo   [1] Browser preview  - recommended, opens http://localhost:8081
echo   [2] Phone with Expo Go - scan the QR code; needs Expo Go for SDK 57
echo   [3] Android phone over USB - development build; first run is slow
echo.
choice /c 123 /n /t 15 /d 1 /m "Choose 1, 2 or 3 [starts 1 in 15 seconds]: "
if errorlevel 3 goto :android
if errorlevel 2 goto :expogo

echo Starting the browser preview. Press Ctrl+C in this window to stop.
call %PNPM% --filter @garnet/mobile exec expo start --web
goto :end

:expogo
echo Starting Expo. Scan the QR code with Expo Go; phone and PC on the same Wi-Fi.
call %PNPM% --filter @garnet/mobile start
goto :end

:android
echo Building and installing on the connected Android phone. USB debugging must be on.
call %PNPM% --filter @garnet/mobile exec expo run:android
goto :end

:fail
echo.
echo Something went wrong. Read the messages above.

:end
echo.
pause
