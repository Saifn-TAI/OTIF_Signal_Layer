@echo off
echo ====================================================
echo    TAI Signal Layer - Project Setup (Windows)
echo ====================================================
echo.

:: 1. Check Python installation
echo [+] Checking for Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH. Please install Python 3.9+.
    pause
    exit /b 1
)

:: 2. Check Node.js installation
echo [+] Checking for Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH. Please install Node.js 18+.
    pause
    exit /b 1
)

:: 3. Setup Backend (Python)
echo.
echo ====================================================
echo    Setting up Backend Infrastructure...
echo ====================================================
cd backend

echo [+] Creating Virtual Environment...
if not exist venv (
    python -m venv venv
)

echo [+] Upgrading pip...
call venv\Scripts\python.exe -m pip install --upgrade pip

echo [+] Installing Python dependencies...
call venv\Scripts\pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)
cd ..

:: 4. Setup Frontend (Node)
echo.
echo ====================================================
echo    Setting up Frontend Infrastructure...
echo ====================================================
cd frontend

echo [+] Installing NPM dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Node dependencies.
    pause
    exit /b 1
)
cd ..

echo.
echo ====================================================
echo    Setup Complete! 
echo ====================================================
echo [+] The project is fully configured.
echo [+] To start the application, double-click 'run.bat'.
echo.
pause
