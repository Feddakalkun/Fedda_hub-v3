@echo off
setlocal
cd /d "%~dp0"
title FEDDA Updater

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

echo.
echo ============================================================================
echo   FEDDA UPDATER
echo ============================================================================
echo.

:: ============================================================================
:: FIND GIT
:: ============================================================================
where git >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%BASE_DIR%\git_embeded\cmd\git.exe" (
        echo   Using embedded git...
        set "PATH=%BASE_DIR%\git_embeded\cmd;%PATH%"
    ) else (
        echo   [ERROR] Git not found! Run install.bat first.
        pause
        exit /b 1
    )
)

:: ============================================================================
:: INITIALIZE GIT IF NEEDED (for ZIP downloads)
:: ============================================================================
if not exist "%BASE_DIR%\.git" (
    echo   No git repo found — initializing from GitHub...
    git init
    git remote add origin https://github.com/Feddakalkun/comfyuifeddafront.git
)

:: ============================================================================
:: PULL LATEST FROM GITHUB
:: ============================================================================
echo   Pulling latest changes from GitHub...
echo.
git fetch origin main
git reset --hard origin/main
git clean -fd

:: ============================================================================
:: RUN UPDATE LOGIC (detects portable vs lite automatically)
:: ============================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%BASE_DIR%\scripts\update_logic.ps1"

echo.
echo   Update finished. Run RUN.bat to start FEDDA.
echo.
pause
