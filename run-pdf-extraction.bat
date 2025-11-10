@echo off
REM ============================================================================
REM LHIMS Patient PDF Extraction - Run Script
REM ============================================================================
REM
REM This batch file runs the PDF extraction script with optional patient list
REM
REM Usage:
REM   run-pdf-extraction.bat                    (uses master-patient-list.txt)
REM   run-pdf-extraction.bat test-pdf-extraction.txt   (uses custom list)
REM
REM ============================================================================

echo.
echo ======================================================================
echo LHIMS PATIENT PDF EXTRACTION
echo ======================================================================
echo.
echo Starting PDF extraction...
echo.

if "%1"=="" (
    echo Using master-patient-list.txt
    node scripts/extract-patient-pdf.js
) else (
    echo Using custom patient list: %1
    node scripts/extract-patient-pdf.js %1
)

echo.
echo ======================================================================
echo EXTRACTION FINISHED
echo ======================================================================
echo.
echo Check the following locations:
echo   - PDFs: data\patient-pdfs\
echo   - Errors: pdf-extraction-errors.log
echo   - Progress: pdf-extraction-progress.json
echo.

pause
