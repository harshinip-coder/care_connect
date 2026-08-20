@echo off
echo ===================================================
echo   CARECONNECT — LAUNCHING BACKEND ^& FRONTEND
echo ===================================================
echo.

:: Check if virtual environment exists and activate
if exist "venv\Scripts\activate.bat" (
    echo [1/3] Activating Virtual Environment...
    call venv\Scripts\activate.bat
) else (
    echo [1/3] Virtual Environment not found in venv. Using global Python...
)

echo [2/3] Checking Django Database ^& Migrations...
python manage.py migrate --noinput

echo [3/3] Starting Django Server (Port 8000) and Vite Frontend (Port 5173)...
echo.
npm run dev
