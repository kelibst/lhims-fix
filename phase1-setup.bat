@echo off
REM Phase 1: Excel Data Import Setup
REM This script initializes the database and imports all Excel files

echo.
echo ===============================================================
echo   PHASE 1: EXCEL DATA IMPORT - SETUP AND EXECUTION
echo   Volta Regional Hospital, Hohoe
echo ===============================================================
echo.

REM Step 1: Initialize database
echo [1/2] Initializing database...
echo.
node scripts/init-database.js
if errorlevel 1 (
    echo.
    echo ERROR: Database initialization failed!
    pause
    exit /b 1
)

echo.
echo.
echo ===============================================================
echo   Database initialized successfully!
echo ===============================================================
echo.
pause

REM Step 2: Import Excel files
echo.
echo [2/2] Importing Excel files...
echo.
echo This may take 15-30 minutes for all 166 files...
echo.
node scripts/import-excel-data.js
if errorlevel 1 (
    echo.
    echo ERROR: Excel import failed!
    pause
    exit /b 1
)

echo.
echo.
echo ===============================================================
echo   PHASE 1 COMPLETE - DATABASE READY!
echo ===============================================================
echo.
echo Next steps:
echo   1. Review import statistics above
echo   2. Query database to verify data
echo   3. Start Phase 2 enhancement (optional)
echo.
pause
