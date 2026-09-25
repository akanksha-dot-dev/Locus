@echo off
title SwytchAgent Day Planner
cd /d "d:\SwytchAgent2.0\planner-agent"

echo.
echo  ============================================
echo   SwytchAgent Day Planner - Services Manager
echo  ============================================
echo.

echo [Step 1] Stopping any old services...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "0.0.0.0:8000" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "0.0.0.0:8501" ^| findstr "LISTENING" 2^>nul') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

echo [Step 2] Starting Backend API (port 8000)...
start "SwytchAgent-Backend" "venv\Scripts\python.exe" "d:\SwytchAgent2.0\planner-agent\server.py"
timeout /t 4 /nobreak >nul

echo [Step 3] Starting Dashboard UI (port 8501)...
start "SwytchAgent-Dashboard" "venv\Scripts\streamlit.exe" run "d:\SwytchAgent2.0\planner-agent\dashboard\app.py" --server.port 8501 --server.headless true

timeout /t 5 /nobreak >nul

echo.
echo  ============================================
echo   OPEN IN BROWSER: http://localhost:8501
echo  ============================================
echo.
echo  Both windows are running. Do NOT close them.
echo  Close this window when done.
echo.
pause
