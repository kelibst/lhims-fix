@echo off
REM Keep Windows awake during extraction
REM This prevents sleep/hibernate while the script runs

echo ========================================
echo LHIMS Patient Data Extraction
echo ========================================
echo.
echo This will keep your PC awake during extraction.
echo You can close this window to stop.
echo.
echo Starting extraction...
echo.

REM Use PowerShell to prevent sleep and run extraction
powershell -Command "$code = '[DllImport(\"kernel32.dll\", CharSet = CharSet.Auto, SetLastError = true)] public static extern uint SetThreadExecutionState(uint esFlags);'; $type = Add-Type -MemberDefinition $code -Name System -Namespace Win32 -PassThru; $ES_CONTINUOUS = [uint32]0x80000000; $ES_SYSTEM_REQUIRED = [uint32]0x00000001; $ES_AWAYMODE_REQUIRED = [uint32]0x00000040; $type::SetThreadExecutionState($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_AWAYMODE_REQUIRED); npm run extract:patients; $type::SetThreadExecutionState($ES_CONTINUOUS)"

echo.
echo ========================================
echo Extraction completed or stopped
echo ========================================
pause
