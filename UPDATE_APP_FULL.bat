@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   FULL UPDATE (includes custom nodes)
echo ==========================================
echo.

:: Force node updates regardless of last update time
set "FORCE_NODE_UPDATE=1"

:: Run the normal updater
call "%~dp0UPDATE_APP.bat"
