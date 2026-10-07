@echo off
setlocal
cd /d "%~dp0"
echo Installing opc-tui ...
where node >nul 2>nul || (echo [ERROR] Node.js not found, install from https://nodejs.org & pause & exit /b 1)
call npm install -g .
if errorlevel 1 (echo Install failed & pause & exit /b 1)
echo.
echo Done! Type opc-tui in CMD to run.
echo.
where opc-tui
pause