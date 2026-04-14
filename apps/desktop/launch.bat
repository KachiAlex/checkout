@echo off
REM Checkout POS - Portable Launcher
REM This script launches the app with the correct Electron binary

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set APP_DIR=%~dp0

REM Check if Electron is installed
if not exist "%APP_DIR%node_modules\electron\dist\electron.exe" (
    echo.
    echo ERROR: Electron runtime not found!
    echo Please ensure node_modules\electron is present in the app directory.
    echo.
    echo To install: npm install
    echo.
    pause
    exit /b 1
)

REM Set environment variables
set ELECTRON_APP_DIR=%APP_DIR%
set NODE_ENV=production

REM Launch the app
echo Launching Checkout POS...
"%APP_DIR%node_modules\electron\dist\electron.exe" "%APP_DIR%dist\main.js"

endlocal
