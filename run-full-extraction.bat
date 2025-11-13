@echo off
REM ============================================================================
REM Full Extraction - All Remaining Patients (~48,000)
REM ============================================================================
REM
REM This script runs extraction on ALL patients in master-patient-list.txt
REM
REM Safety features:
REM   - Skips 22,016 already-completed patients automatically
REM   - Won't overwrite existing PDFs
REM   - Browser restarts every 500 patients (prevents memory crash)
REM   - Progress saved after each patient
REM
REM Estimated time: 10-15 hours
REM Output: data/patient-pdfs/[patient-id]/
REM
REM ============================================================================

echo.
echo ======================================================================
echo LHIMS FULL EXTRACTION - ALL REMAINING PATIENTS
echo ======================================================================
echo.
echo WARNING: This is a LONG-RUNNING process!
echo.
echo Settings:
echo   - Total patients: 70,068
echo   - Already completed: ~22,016 (will be skipped)
echo   - Remaining: ~48,000 patients to process
echo   - Concurrency: 3 workers
echo   - Browser restart: Every 500 patients
echo   - Estimated time: 10-15 hours
echo.
echo Your computer should:
echo   - Stay connected to hospital network (10.10.0.59)
echo   - Not go to sleep/hibernate
echo   - Have stable power supply
echo.
echo You can safely:
echo   - Press Ctrl+C to stop anytime (progress is saved)
echo   - Resume later (will continue from last completed patient)
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting full extraction...
echo.
echo TIP: You can monitor progress by checking the console output
echo      Stats are shown every 10 patients
echo      Browser will restart every 500 patients
echo.

node scripts/extract-patient-pdf-concurrent.js master-patient-list.txt 1

echo.
echo ======================================================================
echo FULL EXTRACTION COMPLETE
echo ======================================================================
echo.
echo Check the summary above for:
echo   - Total PDFs created (OPD + IPD)
echo   - Success/failure rates
echo   - Any errors (see pdf-extraction-concurrent-errors.log)
echo.
echo Output location: data/patient-pdfs/
echo Stats file: pdf-extraction-concurrent-stats.json
echo.
pause
