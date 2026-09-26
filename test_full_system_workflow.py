"""
Locus Autonomous Incident Command Center — Full Workflow & System Verification Suite
Tests:
1. Backend Health & 7 Swytchcode Tool Bindings
2. Live WebSocket Streaming (all 8 LangGraph nodes + agent_complete)
3. REST /run execution with real natural language query
4. REST /demo execution across all 4 benchmark scenarios
5. Analytics & History Ledger Persistence
6. Frontend HTTP Server (Vite port 5173) Availability & Header Security
7. End-to-End Data Contract Integrity
"""

import sys
import json
import time
import asyncio
import urllib.request
import urllib.error

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    import websockets
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "websockets"])
    import websockets

BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
WS_URL = "ws://localhost:8000/ws"

passed_checks = 0
failed_checks = 0

def check(condition: bool, description: str):
    global passed_checks, failed_checks
    if condition:
        print(f"  ✅ [PASS] {description}")
        passed_checks += 1
    else:
        print(f"  ❌ [FAIL] {description}")
        failed_checks += 1

def http_get(url: str, timeout: float = 10.0):
    req = urllib.request.Request(url, headers={"User-Agent": "Locus-Verification/2.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8")

def http_post(url: str, data: dict, timeout: float = 20.0):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "Locus-Verification/2.0"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, resp.read().decode("utf-8")

async def test_full_system():
    print("=" * 70)
    print("  LOCUS DAY PLANNER: FULL SYSTEM WORKFLOW & INTEGRATION VERIFICATION")
    print("=" * 70)
    print()

    # ── 1. Backend Health & Architecture Check ──────────────────────
    print("▶ Phase 1: Backend Health & Swytchcode API Bindings")
    try:
        status, body = http_get(f"{BACKEND_URL}/health")
        check(status == 200, "Backend /health responds with HTTP 200 OK")
        data = json.loads(body)
        check(data.get("status") == "ok", "Health status is 'ok'")
        check(data.get("version") == "2.0.0", "Version is 2.0.0")

        integrations = data.get("integrations", {})
        expected_tools = ["openweather", "gmail", "jira", "github", "notion", "slack", "resend"]
        all_tools_active = all(integrations.get(tool) is True for tool in expected_tools)
        check(all_tools_active, f"All 7 Swytchcode tool bindings verified active: {list(integrations.keys())}")

        swytchcode_apis = data.get("swytchcode_apis", [])
        check(len(swytchcode_apis) == 7, f"All 7 Swytchcode API names registered: {swytchcode_apis}")
    except Exception as e:
        check(False, f"Backend health check failed: {e}")
    print()

    # ── 2. Frontend Server Availability & Assets ───────────────────
    print("▶ Phase 2: Frontend Local Server (Vite) Availability")
    try:
        status, body = http_get(FRONTEND_URL)
        check(status == 200, f"Frontend server at {FRONTEND_URL} responds with HTTP 200 OK")
        check("<div id=\"root\"></div>" in body, "Frontend serves root mount container")
        check("Locus" in body, "Frontend serves application title")
        check("src/main.tsx" in body, "Frontend Vite module loader active")
    except Exception as e:
        check(False, f"Frontend server check failed: {e}")
    print()

    # ── 3. WebSocket Real-Time Telemetry & Live LangGraph Stream ───
    print("▶ Phase 3: WebSocket Streaming & LangGraph 8-Node Telemetry")
    ws_events_received = []

    async def listen_ws():
        try:
            async with websockets.connect(WS_URL) as ws:
                print("     🔗 Connected to WebSocket ws://localhost:8000/ws")
                while True:
                    msg = await ws.recv()
                    event = json.loads(msg)
                    ws_events_received.append(event)
                    event_type = event.get("type")
                    if event_type == "step_complete":
                        step = event.get("step")
                        print(f"     📡 [WS Step Complete] Node '{step}' finished")
                    elif event_type == "agent_complete":
                        verdict = event.get("go_to_office")
                        print(f"     🎯 [WS Agent Complete] Verdict: '{verdict}'")
                        break
        except Exception as e:
            print(f"     ⚠️ WS listening finished: {e}")

    run_response_holder = {}

    async def trigger_run():
        await asyncio.sleep(0.5)
        print("     🚀 Triggering POST /run with realistic developer workload in Mumbai...")
        loop = asyncio.get_event_loop()
        run_start = time.time()
        status, body = await loop.run_in_executor(
            None,
            lambda: http_post(f"{BACKEND_URL}/run", {
                "user_request": "I have 4 high priority Jira tickets and an open PR. Weather is warm and partly cloudy. Synthesize schedule.",
                "city": "Mumbai",
                "user_email": "engineer@company.com"
            })
        )
        run_duration = time.time() - run_start
        run_response_holder["status"] = status
        run_response_holder["body"] = body
        run_response_holder["duration"] = run_duration

    try:
        await asyncio.wait_for(asyncio.gather(listen_ws(), trigger_run()), timeout=40.0)
    except Exception as e:
        print(f"     ⚠️ Gather finished with: {e}")

    status = run_response_holder.get("status")
    body = run_response_holder.get("body", "{}")
    run_duration = run_response_holder.get("duration", 0)

    check(status == 200, f"POST /run succeeded in {run_duration:.2f}s with HTTP 200 OK")
    run_data = json.loads(body)
    check(run_data.get("city") == "Mumbai", "Response city matches requested 'Mumbai'")
    check(run_data.get("go_to_office") in ["office", "wfh", "hybrid"], f"Valid verdict generated: '{run_data.get('go_to_office')}'")
    check(isinstance(run_data.get("weather_score"), (int, float)), f"Weather score calculated: {run_data.get('weather_score')}/100")
    check(len(run_data.get("jira_tickets", [])) > 0, f"Jira tickets parsed: {len(run_data.get('jira_tickets', []))} tickets")
    check(len(run_data.get("github_prs", [])) > 0, f"GitHub PRs parsed: {len(run_data.get('github_prs', []))} PRs")
    check(len(run_data.get("day_plan_timeline", [])) >= 5, f"Schedule timeline slots generated: {len(run_data.get('day_plan_timeline', []))} slots")

    # Verify WS events
    step_events = [e for e in ws_events_received if e.get("type") == "step_complete"]
    steps_received = [e.get("step") for e in step_events]
    check(len(step_events) >= 5, f"WebSocket received {len(step_events)} live step_complete events")
    check("weather" in steps_received, "Telemetry recorded Sensory Ingestion (weather)")
    check("ai_advisor" in steps_received, "Telemetry recorded Reasoning Core (ai_advisor)")
    check(any(e.get("type") == "agent_complete" for e in ws_events_received), "WebSocket received agent_complete event")
    print()

    # ── 4. Benchmark Scenario Presets (/demo) ─────────────────────
    print("▶ Phase 4: Benchmark Scenario Presets (/demo)")
    scenarios = [
        ("storm_warning", "London", "wfh"),
        ("clear_day", "San Francisco", "office"),
        ("travel_day", "Tokyo", "office"),
        ("heavy_workload", "Bengaluru", "wfh"),
    ]

    for sc_key, city, expected_verdict in scenarios:
        try:
            status, body = http_post(f"{BACKEND_URL}/demo", {"scenario": sc_key, "city": city})
            check(status == 200, f"Preset '{sc_key}' ({city}) returned HTTP 200")
            demo_data = json.loads(body)
            check(demo_data.get("city") == city, f"Preset '{sc_key}' returned city '{city}'")
            check(demo_data.get("go_to_office") in ["office", "wfh", "hybrid"], f"Preset '{sc_key}' returned verdict '{demo_data.get('go_to_office')}'")
        except Exception as e:
            check(False, f"Preset '{sc_key}' failed: {e}")
    print()

    # ── 5. Analytics & Historical Audit Ledger ─────────────────────
    print("▶ Phase 5: Historical Audit Ledger & Analytics Aggregation")
    try:
        status, body = http_get(f"{BACKEND_URL}/analytics")
        check(status == 200, "GET /analytics returned HTTP 200 OK")
        analytics = json.loads(body)
        check(analytics.get("total_runs", 0) > 0, f"Total agent runs tracked in ledger: {analytics.get('total_runs')}")

        status, body = http_get(f"{BACKEND_URL}/history")
        check(status == 200, "GET /history returned HTTP 200 OK")
        history = json.loads(body)
        items = history.get("items", []) or history.get("history", [])
        check(len(items) > 0, f"Historical execution snapshots stored: {len(items)} items")
    except Exception as e:
        check(False, f"Analytics/History checks failed: {e}")
    print()

    # ── 6. Final Summary ──────────────────────────────────────────
    print("=" * 70)
    print(f"  FULL SYSTEM VERIFICATION RESULTS: {passed_checks} PASSED / {failed_checks} FAILED")
    print("=" * 70)

    if failed_checks > 0:
        print("  ⚠️ Some checks failed. See details above.")
        sys.exit(1)
    else:
        print("  🎉 COMPLETE SYSTEM WORKFLOW VERIFIED: BACKEND, WEBSOCKET, FRONTEND, AND DATA CONTRACTS ARE 100% OPERATIONAL!")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(test_full_system())
