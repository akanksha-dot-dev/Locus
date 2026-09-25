"""
Helper script to stop background backend and dashboard processes.
"""
import subprocess

print("🛑 Stopping SwytchAgent services on ports 8000 and 8501...")
cmd = 'Get-NetTCPConnection -LocalPort 8000, 8501 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }'
subprocess.run(["powershell", "-Command", cmd], capture_output=True)
print("✅ Services stopped successfully.")
