@echo off
REM ============================================================================
REM PATIENT SEARCH SYSTEM - STARTUP SCRIPT
REM Volta Regional Hospital, Hohoe
REM ============================================================================

echo.
echo ========================================================================================================
echo   PATIENT SEARCH SYSTEM
echo   Volta Regional Hospital, Hohoe
echo =========================================================================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Checking Node.js installation...
node --version
echo.

REM Check if npm dependencies are installed
if not exist "node_modules\" (
    echo [2/3] Installing dependencies (this may take a few minutes)...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    echo [2/3] Dependencies already installed
    echo.
)

REM Check if database exists
if not exist "data\database\patient-care-system.db" (
    echo [WARNING] Database not found at data\database\patient-care-system.db
    echo.
    echo Please run the following commands first:
    echo   1. node scripts/init-database.js
    echo   2. node scripts/import-excel-data.js
    echo.
    pause
    exit /b 1
)

echo [3/3] Starting Patient Search Server...
echo.
echo =========================================================================================================
echo   Server will start on http://localhost:3000
echo   Press Ctrl+C to stop the server
echo =========================================================================================================
echo.

REM Start the server
node server/api.js

pause
