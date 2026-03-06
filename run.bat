@echo off
echo ====================================================
echo    TAI Signal Layer - Starting Servers (Windows)
echo ====================================================
echo.

:: 1. Start Backend Server
echo [+] Starting FastAPI Backend (Port 8000)...
start "TAI Signal Backend" cmd /k "cd backend && call venv\Scripts\activate && uvicorn main:app --reload"

:: 2. Wait for a second so backend starts first
timeout /t 2 /nobreak >nul

:: 3. Start Frontend Server
echo [+] Starting Vite/React Frontend (Port 5173)...
start "TAI Signal Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo    Servers are starting in new Windows!
echo ====================================================
echo [+] The application will be available at: http://localhost:5173
echo.
pause
