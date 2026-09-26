@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title SwytchAgent 2.0 - Incident Command Center Launcher

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

echo.
echo  ======================================================================
echo    ⚡ SWYTCHAGENT 2.0: INCIDENT COMMAND CENTER ^& AUTONOMOUS PLANNER
echo    Unified Production Launch Manager
echo  ======================================================================
echo.

:: ── Step 1: Clean up any stale instances on ports 8000 ^& 5173 ──────────
echo  [Step 1/5] Checking for stale port allocations (8000, 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING" 2^>nul') do (
    echo    Stopping stale process on port 8000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do (
    echo    Stopping stale process on port 5173 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: ── Step 2: Validate Python Virtual Environment ────────────────────────
echo  [Step 2/5] Validating Python environment...
set "PYTHON_EXE=%ROOT_DIR%backend\venv\Scripts\python.exe"

if not exist "%PYTHON_EXE%" (
    echo    [WARN] Virtual environment python not found at: %PYTHON_EXE%
    echo    Checking system Python...
    where python >nul 2>&1
    if !errorlevel! neq 0 (
        echo.
        echo    [ERROR] Python is not installed or not in PATH!
        echo    Please install Python 3.11+ and create a virtual environment in backend\venv.
        pause
        exit /b 1
    )
    set "PYTHON_EXE=python"
    echo    Using system Python: !PYTHON_EXE!
) else (
    echo    [OK] Python Virtual Environment verified: %PYTHON_EXE%
)

:: ── Step 3: Validate Node.js ^& Frontend Dependencies ───────────────────
echo  [Step 3/5] Validating Node.js and frontend dependencies...
where node >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo    [ERROR] Node.js is not installed or not in PATH!
    echo    Please install Node.js v18+ from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>&1
if !errorlevel! neq 0 (
    echo.
    echo    [ERROR] npm is not installed or not in PATH!
    pause
    exit /b 1
)

if not exist "%ROOT_DIR%frontend\node_modules" (
    echo    [INFO] Frontend node_modules not detected. Installing dependencies...
    cd /d "%ROOT_DIR%frontend"
    call npm install
    if !errorlevel! neq 0 (
        echo    [ERROR] npm install failed! Please check frontend dependencies.
        pause
        exit /b 1
    )
    cd /d "%ROOT_DIR%"
) else (
    echo    [OK] Frontend dependencies detected.
)

:: ── Step 3b: Validate Environment Configuration (.env) ───────────────────
echo  [Step 3b/5] Validating environment configuration...
if not exist "%ROOT_DIR%backend\.env" (
    echo    [WARN] No .env file detected! Initializing backend\.env from template...
    copy "%ROOT_DIR%backend\.env.example" "%ROOT_DIR%backend\.env" >nul
    echo    [NOTICE] A template .env was created at backend\.env.
    echo    SwytchAgent will start in resilient demo mode. Add your API keys to backend\.env for live services.
) else (
    echo    [OK] Environment configuration file detected at backend\.env.
)

:: ── Step 4: Launch FastAPI Backend (Port 8000) ─────────────────────────
echo  [Step 4/5] Launching FastAPI Backend on port 8000...
start "SwytchAgent-FastAPI-Backend" cmd /k "title SwytchAgent Backend (FastAPI :8000) && cd /d "%ROOT_DIR%backend" && "%PYTHON_EXE%" server.py"

echo    Waiting for FastAPI backend to initialize...
timeout /t 3 /nobreak >nul

:: ── Step 5: Launch Vite Frontend Dev Server (Port 5173) ────────────────
echo  [Step 5/5] Launching Vite Frontend Dev Server on port 5173...
start "SwytchAgent-Vite-Frontend" cmd /k "title SwytchAgent Frontend (Vite :5173) && cd /d "%ROOT_DIR%frontend" && npm run dev"

echo    Waiting for Vite dev server to bind...
timeout /t 3 /nobreak >nul

:: Open default browser to Frontend
echo.
echo  ======================================================================
echo    🚀 ALL SERVICES ONLINE ^& OPERATIONAL:
echo  ======================================================================
echo    • Command Center Frontend:  http://localhost:5173
echo    • FastAPI REST API:         http://localhost:8000
echo    • Swagger API Documentation: http://localhost:8000/docs
echo    • Live WebSocket Stream:    ws://localhost:8000/ws
echo  ======================================================================
echo.

start http://localhost:5173

:LOOP
echo  Command Options:
echo    [1] Re-open Command Center (http://localhost:5173)
echo    [2] Open Swagger API Docs (http://localhost:8000/docs)
echo    [Q] Graceful Shutdown (Stop all services and exit)
echo.
set /p "CHOICE=Enter choice [1, 2, Q]: "

if /i "%CHOICE%"=="1" (
    start http://localhost:5173
    goto LOOP
)
if /i "%CHOICE%"=="2" (
    start http://localhost:8000/docs
    goto LOOP
)
if /i "%CHOICE%"=="Q" (
    echo.
    echo  Stopping all SwytchAgent services...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
    echo  All services stopped. Thank you for using SwytchAgent 2.0!
    timeout /t 2 /nobreak >nul
    exit /b 0
)

goto LOOP
