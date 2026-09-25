"""
Launcher script to start both the FastAPI backend and Streamlit dashboard
as independent, persistent detached background processes on Windows.
Logs are written to server.log and dashboard.log in this directory.
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

# Windows flags: fully detach child from parent process
CREATE_NEW_PROCESS_GROUP = 0x00000200
DETACHED_PROCESS         = 0x00000008
CREATE_NO_WINDOW         = 0x08000000

print("🚀 Starting SwytchAgent Day Planner Services...")
print(f"   Base dir : {BASE_DIR}")
print(f"   Python   : {PYTHON_EXE}")
print(f"   Streamlit: {STREAMLIT_EXE}")
print()

# ── 1. FastAPI Backend ─────────────────────────────────────────────
server_log_path = os.path.join(BASE_DIR, "server.log")
server_log = open(server_log_path, "a", encoding="utf-8")
server_proc = subprocess.Popen(
    [PYTHON_EXE, os.path.join(BASE_DIR, "server.py")],
    cwd=BASE_DIR,
    stdout=server_log,
    stderr=subprocess.STDOUT,
    creationflags=CREATE_NEW_PROCESS_GROUP,
)
print(f"✅ Backend  started → PID {server_proc.pid}  |  http://localhost:8000")
time.sleep(3)

# ── 2. Streamlit Dashboard ─────────────────────────────────────────
dashboard_log_path = os.path.join(BASE_DIR, "dashboard.log")
dashboard_log = open(dashboard_log_path, "a", encoding="utf-8")
dashboard_proc = subprocess.Popen(
    [
        STREAMLIT_EXE, "run",
        os.path.join(BASE_DIR, "dashboard", "app.py"),
        "--server.port", "8501",
        "--server.headless", "true",
    ],
    cwd=BASE_DIR,
    stdout=dashboard_log,
    stderr=subprocess.STDOUT,
    creationflags=CREATE_NEW_PROCESS_GROUP,
)
print(f"✅ Dashboard started → PID {dashboard_proc.pid}  |  http://localhost:8501")

# ── Save PIDs for stop_services.py ────────────────────────────────
pids_file = os.path.join(BASE_DIR, ".running_pids")
with open(pids_file, "w") as f:
    f.write(f"{server_proc.pid}\n{dashboard_proc.pid}\n")

print()
print("🎉 Both services are running in the background!")
print("   API Docs  : http://localhost:8000/docs")
print("   Dashboard : http://localhost:8501")
print()
print("   Stop with : python stop_services.py")
print(f"   Logs      : {server_log_path}")
print(f"               {dashboard_log_path}")
