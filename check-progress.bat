@echo off
setlocal enabledelayedexpansion

REM All-in-one LHIMS extraction manager
REM Can check progress OR start/resume extraction

:MENU
cls
echo ========================================
echo LHIMS Patient Data Extraction Manager
echo ========================================
echo.

REM Count extracted patient folders
set COUNT=0
for /f %%i in ('dir /ad /b "data\patient-json" 2^>nul ^| find /c /v ""') do set COUNT=%%i

echo Current Status:
echo   Patients extracted: %COUNT% / 61,064
echo.

if %COUNT% GTR 0 (
    REM Calculate percentage
    set /a PERCENT=%COUNT%*100/61064
    echo   Progress: !PERCENT!%%
    echo.

    REM Estimate remaining time (assuming 4 seconds per patient)
    set /a REMAINING=61064-%COUNT%
    set /a SECONDS=!REMAINING!*4
    set /a HOURS=!SECONDS!/3600
    set /a MINUTES=(!SECONDS!%%3600^)/60

    echo   Remaining: ~!HOURS! hours !MINUTES! minutes
    echo.
)

echo ========================================
echo What would you like to do?
echo ========================================
echo.
echo 1. Start/Resume Extraction (with logging)
echo 2. Check Detailed Progress
echo 3. View Extraction Log
echo 4. Exit
echo.
set /p CHOICE="Enter your choice (1-4): "

if "%CHOICE%"=="1" goto START_EXTRACTION
if "%CHOICE%"=="2" goto DETAILED_PROGRESS
if "%CHOICE%"=="3" goto VIEW_LOG
if "%CHOICE%"=="4" goto END

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:START_EXTRACTION
cls
echo ========================================
echo Starting Patient Data Extraction
echo ========================================
echo.
echo This will:
echo   - Keep your PC awake (prevent sleep)
echo   - Extract data for all 61,064 patients
echo   - Skip already-extracted patients
echo   - Save progress to: extraction-progress.log
echo.
echo You can:
echo   - Minimize this window and leave
echo   - Press Ctrl+C to stop anytime
echo   - Resume later by running this again
echo.
echo Press any key to start, or Ctrl+C to cancel...
pause >nul

echo.
echo Starting extraction...
echo.

REM Keep PC awake and run extraction with logging
powershell -Command "$code = '[DllImport(\"kernel32.dll\", CharSet = CharSet.Auto, SetLastError = true)] public static extern uint SetThreadExecutionState(uint esFlags);'; $type = Add-Type -MemberDefinition $code -Name System -Namespace Win32 -PassThru; $ES_CONTINUOUS = [uint32]0x80000000; $ES_SYSTEM_REQUIRED = [uint32]0x00000001; $ES_AWAYMODE_REQUIRED = [uint32]0x00000040; $type::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_AWAYMODE_REQUIRED); npm run extract:patients 2>&1 | Tee-Object -FilePath extraction-progress.log -Append; $type::SetThreadExecutionState($ES_CONTINUOUS)"

echo.
echo ========================================
echo Extraction completed or stopped
echo ========================================
echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:DETAILED_PROGRESS
cls
echo ========================================
echo Detailed Extraction Progress
echo ========================================
echo.
echo Total patients extracted: %COUNT% / 61,064
echo.

if %COUNT% GTR 0 (
    set /a PERCENT=%COUNT%*100/61064
    echo Progress: !PERCENT!%%
    echo.

    set /a REMAINING=61064-%COUNT%
    set /a SECONDS=!REMAINING!*4
    set /a HOURS=!SECONDS!/3600
    set /a MINUTES=(!SECONDS!%%3600^)/60

    echo Estimated remaining: ~!HOURS! hours !MINUTES! minutes
    echo.
    echo ========================================
    echo Last 10 Extracted Patients:
    echo ========================================

    REM Show last 10 extracted patients
    dir /b /od "data\patient-json" 2>nul | findstr /r "VR-" | findstr /v "VR-A01-AAA2142" > temp_patients.txt

    set /a SKIP=%COUNT%-10
    if !SKIP! LSS 0 set SKIP=0

    more +!SKIP! temp_patients.txt 2>nul
    del temp_patients.txt 2>nul

    echo.

    REM Check if log file exists
    if exist "extraction-progress.log" (
        echo ========================================
        echo Recent Log Entries (Last 20 lines):
        echo ========================================
        powershell -Command "Get-Content extraction-progress.log -Tail 20"
    )
) else (
    echo No patients extracted yet.
    echo Run option 1 to start extraction.
)

echo.
echo ========================================
echo Press any key to return to menu...
pause >nul
goto MENU

:VIEW_LOG
cls
echo ========================================
echo Extraction Log Viewer
echo ========================================
echo.

if exist "extraction-progress.log" (
    echo Showing last 50 lines of log file:
    echo ========================================
    echo.
    powershell -Command "Get-Content extraction-progress.log -Tail 50"
    echo.
    echo ========================================
    echo.
    echo Full log available at: extraction-progress.log
) else (
    echo No log file found yet.
    echo Start the extraction first (Option 1).
)

echo.
echo Press any key to return to menu...
pause >nul
goto MENU

:END
cls
echo.
echo Thank you for using LHIMS Extraction Manager!
echo.
echo Current progress: %COUNT% / 61,064 patients extracted
echo.
if %COUNT% LSS 61064 (
    echo Tip: Run this script again anytime to resume extraction.
)
echo.
timeout /t 3
exit /b
