@echo off
REM ============================================================================
REM IPD-ONLY Extraction - All Patients
REM ============================================================================
REM
REM This script extracts ONLY IPD (Inpatient) admission PDFs
REM OPD (Outpatient) PDFs are SKIPPED entirely
REM
REM Features:
REM   - Skips patients already extracted
REM   - Won't overwrite existing IPD PDFs
REM   - Browser restarts every 500 patients
REM   - Progress saved after each patient
REM   - Separate progress file from OPD extraction
REM
REM Duration: ~10-15 hours (depending on how many patients have IPD data)
REM
REM ============================================================================

echo.
echo ======================================================================
echo LHIMS IPD-ONLY EXTRACTION
echo ======================================================================
echo.
echo This extracts ONLY Inpatient (IPD) admission PDFs.
echo Outpatient (OPD) PDFs are completely skipped.
echo.
echo Settings:
echo   - Total patients: 70,068
echo   - Extract: IPD admissions only
echo   - Concurrency: 3 workers
echo   - Browser restart: Every 500 patients
echo   - Progress file: ipd-extraction-progress.json
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
echo Starting IPD-only extraction...
echo.

node scripts/extract-ipd-only.js master-patient-list.txt 3

echo.
echo ======================================================================
echo IPD EXTRACTION COMPLETE
echo ======================================================================
echo.
echo Check the summary above for:
echo   - Total IPD PDFs created
echo   - Patients with no IPD data (outpatients only)
echo   - Any errors (see ipd-extraction-errors.log)
echo.
echo Output location: data/patient-pdfs/[patient-id]/
echo Stats file: ipd-extraction-stats.json
echo Progress file: ipd-extraction-progress.json
echo.
pause
