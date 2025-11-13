@echo off
REM ============================================================================
REM Test Batch Extraction - 20 Patients
REM ============================================================================
REM
REM This script runs extraction on 20 test patients to verify:
REM   - Fixed concurrency bug (patient IDs are correct)
REM   - Browser restart logic works
REM   - No crashes or errors
REM
REM Duration: ~5-10 minutes
REM Output: data/patient-pdfs/[patient-id]/
REM
REM ============================================================================

echo.
echo ======================================================================
echo LHIMS TEST BATCH EXTRACTION - 20 PATIENTS
echo ======================================================================
echo.
echo This will extract PDFs for 20 test patients to verify fixes work.
echo.
echo Settings:
echo   - Patients: 20 (from test-batch-20-patients.txt)
echo   - Concurrency: 3 workers
echo   - Browser restart: Every 500 patients (won't trigger in this test)
echo   - Improved logging: Patient IDs shown at every step
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting extraction...
echo.

node scripts/extract-patient-pdf-concurrent.js test-batch-20-patients.txt 1

echo.
echo ======================================================================
echo TEST BATCH COMPLETE
echo ======================================================================
echo.
echo Next steps:
echo   1. Review the output above for any errors
echo   2. Check that patient IDs were logged correctly
echo   3. Verify a few PDFs have correct patient data
echo   4. If successful, run: run-full-extraction.bat
echo.
pause
