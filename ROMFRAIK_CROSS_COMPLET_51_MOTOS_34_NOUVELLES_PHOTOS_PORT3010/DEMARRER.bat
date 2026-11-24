@echo off
setlocal
cd /d "%~dp0"
set "PORT=3010"
echo.
echo Demarrage de ROMFRAIK CROSS - version mise a jour
echo Adresse : http://localhost:3010
echo.
start "" /B cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3010"
node server.js
echo.
echo Le serveur est arrete.
pause
