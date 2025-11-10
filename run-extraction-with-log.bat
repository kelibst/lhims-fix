@echo off
REM Run extraction with progress logging
REM Output is saved to extraction-progress.log

echo ========================================
echo LHIMS Patient Data Extraction with Logging
echo ========================================
echo.
echo Progress will be saved to: extraction-progress.log
echo You can check this file to see current status.
echo.
echo Starting extraction...
echo.

REM Keep PC awake and log output
powershell -Command "$code = '[DllImport(\"kernel32.dll\", CharSet = CharSet.Auto, SetLastError = true)] public static extern uint SetThreadExecutionState(uint esFlags);'; $type = Add-Type -MemberDefinition $code -Name System -Namespace Win32 -PassThru; $ES_CONTINUOUS = [uint32]0x80000000; $ES_SYSTEM_REQUIRED = [uint32]0x00000001; $ES_AWAYMODE_REQUIRED = [uint32]0x00000040; $type::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_AWAYMODE_REQUIRED); npm run extract:patients 2>&1 | Tee-Object -FilePath extraction-progress.log; $type::SetThreadExecutionState($ES_CONTINUOUS)"

echo.
echo ========================================
echo Extraction completed or stopped
echo Check extraction-progress.log for details
echo ========================================
pause
