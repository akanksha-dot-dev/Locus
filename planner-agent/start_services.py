"""
Launcher script to start both the FastAPI backend and Streamlit dashboard
as independent, persistent detached background processes on Windows.
"""
import subprocess
import sys
import os
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PYTHON_EXE = os.path.join(BASE_DIR, "venv", "Scripts", "python.exe")
STREAMLIT_EXE = os.path.join(BASE_DIR, "venv", "Scripts", "streamlit.exe")

CREATE_NEW_PROCESS_GROUP = 0x00000200
DETACHED_PROCESS = 0x00000008

print("🚀 Starting SwytchAgent Day Planner Services...")

# 1. Start FastAPI Backend (server.py) on Port 8000
server_log = open(os.path.join(BASE_DIR, "server.log"), "w", encoding="utf-8")
server_proc = subprocess.Popen(
    [PYTHON_EXE, "server.py"],
    cwd=BASE_DIR,
    stdout=server_log,
    stderr=subprocess.STDOUT,
    creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
    close_fds=True
)
print(f"✅ Backend server started (PID: {server_proc.pid}) at http://localhost:8000")

time.sleep(2)

# 2. Start Streamlit Dashboard on Port 8501
dashboard_log = open(os.path.join(BASE_DIR, "dashboard.log"), "w", encoding="utf-8")
dashboard_proc = subprocess.Popen(
    [STREAMLIT_EXE, "run", "dashboard/app.py", "--server.port", "8501", "--server.headless", "true"],
    cwd=BASE_DIR,
    stdout=dashboard_log,
    stderr=subprocess.STDOUT,
    creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
    close_fds=True
)
print(f"✅ Streamlit Dashboard started (PID: {dashboard_proc.pid}) at http://localhost:8501")

print("\n🎉 Both services are running in the background!")
print("   - API & Docs: http://localhost:8000/docs")
print("   - Web UI:     http://localhost:8501")
