"""Quick smoke test for the 7-node Day Planner pipeline (no LangGraph needed)."""
import sys
import os

# Windows UTF-8 fix
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, ".")
from src.nodes import jira_workload, github_workload, gmail_reader

# ── Mock state (no external APIs for Jira/GitHub/Gmail fallback test) ─────────
state = {
    "user_request": "Plan my day in Mumbai",
    "city": "Mumbai",
    "weather_summary": "Overcast clouds | 28.2C (feels 30C) | Humidity: 77% | Wind: 4.1 m/s",
    "weather_condition": "Clouds",
    "temperature_c": 28.2,
    "feels_like_c": 30.0,
    "humidity": 77,
    "wind_speed": 4.1,
    "forecast_summary": "24h forecast: Clouds | Temps: 26C - 32C",
    "weather_alerts": [],
    "weather_score": 72,
    "execution_log": ["[Test] Starting pipeline test"],
}

print("=" * 60)
print("SwytchAgent Day Planner - Node Integration Test")
print("=" * 60)

# ── 1. Gmail reader (demo mode) ───────────────────────────────────────────────
print("\n[1] Testing Gmail Reader...")
s1 = gmail_reader.run(state)
print(f"    Gmail Summary: {s1.get('gmail_summary', 'N/A')}")
print(f"    Events found: {len(s1.get('gmail_events', []))}")
print(f"    Outdoor plans: {s1.get('has_outdoor_plans', False)}")
print(f"    Travel plans:  {s1.get('has_travel_plans', False)}")

# ── 2. Jira workload ─────────────────────────────────────────────────────────
print("\n[2] Testing Jira Workload (will try REST, fallback to demo)...")
s2 = jira_workload.run(s1)
print(f"    Jira Summary: {s2.get('jira_summary', 'N/A')}")
print(f"    Total hours:  {s2.get('jira_total_hours', 0)}h")
print(f"    Issues found: {len(s2.get('jira_issues', []))}")
for issue in s2.get("jira_issues", [])[:3]:
    print(f"      - [{issue['key']}] {issue['summary']} ({issue['priority']}, {issue['estimated_hours']}h)")

# ── 3. GitHub workload ───────────────────────────────────────────────────────
print("\n[3] Testing GitHub Workload (will try REST, fallback to demo)...")
s3 = github_workload.run(s2)
print(f"    GitHub Summary: {s3.get('github_summary', 'N/A')}")
print(f"    PRs found:      {len(s3.get('github_prs', []))}")
print(f"    Issues found:   {len(s3.get('github_issues_open', []))}")
print(f"    Stale PRs:      {len(s3.get('github_stale_prs', []))}")
for pr in s3.get("github_prs", [])[:3]:
    print(f"      - PR #{pr['number']}: {pr['title']} ({pr['days_old']}d old)")

# ── Summary ───────────────────────────────────────────────────────────────────
total_work = s3.get("jira_total_hours", 0) + s3.get("github_total_hours", 0)
print("\n" + "=" * 60)
print("READY FOR GEMINI SYNTHESIS")
print(f"  Weather:   {s3.get('weather_summary', 'N/A')}")
print(f"  Work load: ~{total_work:.1f}h total ({s3.get('jira_total_hours', 0)}h Jira + {s3.get('github_total_hours', 0)}h GitHub)")
print(f"  Gmail:     {len(s3.get('gmail_events', []))} events")
print("  -> Gemini will synthesize these into a full day plan + office decision")
print("=" * 60)

# Log
print("\nExecution Log:")
for entry in s3.get("execution_log", []):
    print(f"  {entry}")
