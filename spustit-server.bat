@echo off
chcp 65001 >nul
echo ============================================
echo   Domaca kniznica - spustenie lokalneho servera
echo ============================================
echo.
echo Po spusteni sa v prehliadaci otvori adresa:
echo   http://localhost:8000
echo.
echo Server NEZATVARAJ, kym pouzivas katalog.
echo Na zastavenie staci zatvorit toto okno.
echo.
cd /d "%~dp0"
start "" http://localhost:8000
python -m http.server 8000
pause
