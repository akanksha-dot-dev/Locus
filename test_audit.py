import sys
import os

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

import asyncio
import json
import websockets
import requests

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

def audit_rest_endpoints():
    print("=" * 60)
    print("AUDIT VECTOR 1: REST API & LangGraph Execution")
    print("=" * 60)
    
    # 1. Health
    r = requests.get(f"{BASE_URL}/health", timeout=5)
    assert r.status_code == 200, f"Health failed: {r.status_code}"
    health = r.json()
    print("✅ GET /health -> 200 OK")
    print(f"   Integrations: {health['integrations']}")
    print(f"   Swytchcode APIs: {len(health['swytchcode_apis'])} registered")
    
    # 2. Weather
    r = requests.get(f"{BASE_URL}/weather/Mumbai", timeout=5)
    assert r.status_code == 200, f"Weather failed: {r.status_code}"
    w = r.json()
    print("✅ GET /weather/Mumbai -> 200 OK")
    print(f"   Temp: {w['temperature_c']}°C, Condition: {w['condition']}, is_mock: {w['is_mock']}")
    
    # 3. Demo endpoint
    payload = {"scenario": "storm_warning", "city": "London"}
    print("\nTriggering POST /demo (scenario=storm_warning, city=London)...")
    r = requests.post(f"{BASE_URL}/demo", json=payload, timeout=60)
    assert r.status_code == 200, f"POST /demo failed: {r.status_code} {r.text}"
    demo_res = r.json()
    print("✅ POST /demo -> 200 OK")
    print(f"   City: {demo_res.get('city')}")
    print(f"   Weather Score: {demo_res.get('weather_score')}/100, Risk: {demo_res.get('risk_level')}")
    print(f"   Verdict (go_to_office): {demo_res.get('go_to_office')}")
    print(f"   Office Reason: {demo_res.get('office_reason')[:80]}...")
    print(f"   Productive Hours: {demo_res.get('estimated_productive_hours')}h")
    print(f"   Jira Tickets: {len(demo_res.get('jira_tickets', []))}")
    print(f"   GitHub PRs: {len(demo_res.get('github_prs', []))}")
    print(f"   Timeline Slots: {len(demo_res.get('day_plan_timeline', []))}")
    print(f"   Resend Email Sent: {demo_res.get('email_sent')}")
    print(f"   Slack Alert Sent: {demo_res.get('slack_message_sent')}")
    
    # Verify required keys in response
    required_keys = [
        "city", "weather_summary", "temperature_c", "feels_like_c", "humidity", "wind_speed",
        "weather_condition", "weather_score", "risk_level", "ai_summary", "recommendations",
        "outfit_suggestion", "weather_alerts", "activity_adjustments", "gmail_events",
        "jira_tickets", "jira_estimated_hours", "github_prs", "github_estimated_hours",
        "go_to_office", "office_reason", "day_plan_timeline", "estimated_productive_hours",
        "notion_logged", "slack_message_sent", "email_sent", "execution_log", "processed_at"
    ]
    missing = [k for k in required_keys if k not in demo_res]
    assert not missing, f"Missing fields in AgentResponse: {missing}"
    print(f"✅ All {len(required_keys)} critical schema fields verified present in response!")

    # 4. Analytics
    r = requests.get(f"{BASE_URL}/analytics", timeout=5)
    assert r.status_code == 200
    analytics = r.json()
    print(f"✅ GET /analytics -> 200 OK (Total runs: {analytics.get('total_runs')})")

    # 5. History
    r = requests.get(f"{BASE_URL}/history?limit=3", timeout=5)
    assert r.status_code == 200
    history = r.json()
    print(f"✅ GET /history -> 200 OK (History items: {len(history.get('items', []))})")

async def audit_websocket_stream():
    print("\n" + "=" * 60)
    print("AUDIT VECTOR 2: WebSocket Streaming Telemetry")
    print("=" * 60)
    received_events = []
    
    async def listen():
        async with websockets.connect(WS_URL) as ws:
            print("Connected to WebSocket ws://localhost:8000/ws")
            # Wait for messages until agent_complete or timeout
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                received_events.append(data)
                ev_type = data.get("type")
                step = data.get("step")
                if ev_type == "step_complete":
                    print(f"   📡 WS event: step_complete -> {step}")
                elif ev_type == "agent_complete":
                    print(f"   🎯 WS event: agent_complete -> verdict: {data.get('go_to_office')}, score: {data.get('score')}")
                    break
    
    # Launch agent run in a separate task while listener collects messages
    async def trigger_run():
        await asyncio.sleep(0.5)
        print("   Triggering agent run via REST while WebSocket is listening...")
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            lambda: requests.post(
                f"{BASE_URL}/run",
                json={"user_request": "Audit test run: Plan day in Paris with 2h review.", "city": "Paris"},
                timeout=60
            )
        )

    try:
        await asyncio.wait_for(asyncio.gather(listen(), trigger_run()), timeout=45.0)
        print(f"✅ WebSocket test passed! Received {len(received_events)} real-time streaming events.")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        raise

if __name__ == "__main__":
    audit_rest_endpoints()
    asyncio.run(audit_websocket_stream())
    print("\n🎉 ALL AUDIT CHECKS PASSED WITH 100% SUCCESS!")
