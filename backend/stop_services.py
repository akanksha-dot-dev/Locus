"""Stop SwytchAgent Day Planner services using saved PIDs."""
import os
import signal
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PIDS_FILE = os.path.join(BASE_DIR, ".running_pids")

if not os.path.exists(PIDS_FILE):
    print("⚠️  No .running_pids file found. Services may not be running.")
    sys.exit(0)

with open(PIDS_FILE) as f:
    pids = [int(line.strip()) for line in f if line.strip()]

for pid in pids:
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"✅ Stopped PID {pid}")
    except ProcessLookupError:
        print(f"⚪ PID {pid} was already stopped")
    except Exception as e:
        print(f"❌ Could not stop PID {pid}: {e}")

os.remove(PIDS_FILE)
print("\n🛑 All services stopped.")
