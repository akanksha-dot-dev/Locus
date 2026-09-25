@echo off
echo ====================================================
echo  SwytchAgent Day Planner - STARTING SERVICES
echo ====================================================
echo.

cd /d "d:\SwytchAgent2.0\planner-agent"

echo [1/2] Killing any old Streamlit / server processes...
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2/2] Starting Backend (port 8000) ...
start "SwytchAgent-Backend" /B "venv\Scripts\python.exe" server.py > server.log 2>&1

timeout /t 4 /nobreak >nul

echo [3/3] Starting Dashboard (port 8501) ...
start "SwytchAgent-Dashboard" /B "venv\Scripts\streamlit.exe" run dashboard\app.py --server.port 8501 --server.headless true > dashboard.log 2>&1

timeout /t 5 /nobreak >nul

echo.
echo ====================================================
echo  OPEN YOUR BROWSER AT: http://localhost:8501
echo ====================================================
echo.
pause
