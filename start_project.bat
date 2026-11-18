@echo off
echo ====================================================
echo Starting Supplivix Platform (Backend + Frontend)
echo ====================================================

start "Supplivix Backend (Django)" cmd /k "cd /d \"%~dp0backend\" && .venv\Scripts\activate && python manage.py runserver 127.0.0.1:8000"
start "Supplivix Frontend (Vite)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev -- --host 127.0.0.1"

echo.
echo Both servers have been launched in separate windows!
echo - Frontend: http://127.0.0.1:5173/
echo - Backend:  http://127.0.0.1:8000/
echo ====================================================
pause

