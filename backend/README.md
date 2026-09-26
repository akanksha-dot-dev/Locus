# ⚙️ Locus Backend & LangGraph Agent Runtime

> **Track 5 — AI Real World Agent | Build with Swytchcode Hackathon 2026**  
> High-performance FastAPI server and 8-node LangGraph autonomous state machine orchestrating 7 real-world Swytchcode tools, Gemini 2.5 Flash reasoning, WebSocket live telemetry streaming, and enterprise audit logging.

---

## 🎯 Overview

The **Locus Backend** is an autonomous intelligence service that synthesizes atmospheric conditions, inbox commitments, sprint backlogs, and code review queues into an actionable day plan. It exposes:
- **FastAPI REST API**: High-throughput endpoints for prompt execution, scenario benchmarks, weather curves, and audit queries.
- **WebSocket Feed (`/ws`)**: Sub-second streaming of LangGraph node state transitions, latencies, and tool execution logs.
- **8-Node LangGraph Pipeline**: A deterministic DAG state machine with state schema validation and graceful fallback.
- **Swytchcode Tool Integration Layer**: Managed authentication, policy-based guardrails (`policies.json`), retries, and audit logging.

---

## 🤖 8-Node LangGraph State Machine Architecture

```
                      User Natural Language Request
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [1] weather_fetcher (OpenWeather)                                      │
│     api.openweathermap.org → Current conditions, 24h forecast, scores  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ weather_data, forecast, alerts, score
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [2] gmail_reader (Google Gmail)                                        │
│     Swytchcode: gmail.messages.list + gmail.messages.get               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ gmail_events, has_travel_plans
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [3] jira_workload (Atlassian Jira)                                     │
│     Swytchcode: jira.issues.list + REST API                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ jira_tickets, jira_estimated_hours
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [4] github_workload (GitHub)                                           │
│     Swytchcode: github.pullRequests.list + REST API                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ github_prs, github_issues, github_hours
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [5] ai_advisor (Google Gemini 2.5 Flash)                               │
│     Autonomous Multi-Source Synthesis: Office vs WFH + Hourly Plan     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ go_to_office, day_plan_timeline, outfit
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [6] notion_logger (Notion)                                             │
│     Swytchcode: notion.pages.create → Executive Briefing Page          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ notion_page_url
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [7] slack_notifier (Slack)                                             │
│     Swytchcode: slack.messages.send → Block Kit Alerts & Briefing      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ slack_message_sent
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ [8] email_sender (Resend)                                              │
│     Swytchcode: resend.email.create → Responsive HTML Digest Email     │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
       Streaming Output via WebSocket (/ws) & REST Response (/run)
```

---

## 🔗 7 Real-World Tool Bindings (Swytchcode)

| Tool / Provider | Method / Endpoint | Primary Function |
|:---|:---|:---|
| **OpenWeather** | Direct REST / Swytchcode | Real-time weather, 24h hourly forecast, diurnal temp curves & alerts |
| **Google Gmail** | `gmail.messages.list` | Meeting detection, flight & travel commitments, calendar parsing |
| **Atlassian Jira** | `jira.issues.list` | Sprint ticket tracking, priority weights, estimated engineering hours |
| **GitHub** | `github.pullRequests.list` | PR reviews, issue priorities, stale PR detection (>2 days) |
| **Google Gemini** | `gemini-2.5-flash` | Multi-source reasoning, WFH vs. Office verdict, hourly schedule generation |
| **Notion** | `notion.pages.create` | Executive Day Plan log with timeline & metrics |
| **Slack** | `slack.messages.send` | Block Kit schedule alerts & warnings to team channels |
| **Resend** | `resend.email.create` | Responsive HTML daily briefing email delivery |

---

## 📡 API Endpoint Reference

The backend runs on `http://localhost:8000`. Interactive OpenAPI documentation is available at `http://localhost:8000/docs`.

### Core Execution Endpoints
- **`POST /run`**: Execute the full LangGraph state machine from a natural language prompt or city override.
  ```json
  // Request
  {
    "city": "London",
    "prompt": "Severe rain expected. Should I commute to the office?",
    "force_refresh": false
  }
  ```
- **`GET /demo?scenario={id}`**: Run pre-configured, verified benchmark scenarios (`storm`, `flight`, `crunch`, `optimal`) with sub-second response times.
- **`GET /weather?city={name}`**: Retrieve 24-hour hourly temperatures, atmospheric viability scores, and transit condition ratings.
- **`GET /history`**: Retrieve the chronological ledger of past agent runs, verdicts, and generated schedules.
- **`WS /ws`**: Bidirectional WebSocket connection broadcasting real-time agent execution events (`step_start`, `step_complete`, `agent_complete`).

### Enterprise Governance & Audit Endpoints
- **`GET /api/audit/logs`**: Swytchcode tool execution audit trail with timestamps, latency, and status.
- **`GET /api/audit/compliance-by-vertical`**: Vertical-level compliance metrics across external integrations.
- **`GET /api/policies`**: Active security guardrails defined in `policies.json`.

---

## 🚀 Setup & Execution

### 1. Environment Configuration
Create or update `backend/.env` (refer to `.env.example`):
```ini
# LLM Provider
GOOGLE_API_KEY=your_gemini_api_key

# Weather
OPENWEATHER_API_KEY=your_openweather_key
DEFAULT_CITY=Mumbai

# Team Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
RESEND_API_KEY=your_resend_api_key
RESEND_TO_EMAIL=your_email@example.com

# Workspace Documentation
NOTION_API_KEY=your_notion_key
NOTION_KB_DATABASE_ID=your_notion_db_id
```

### 2. Verify Swytchcode Tool Bindings
```powershell
cd backend
.\venv\Scripts\python.exe main.py --verify
```

### 3. Run Benchmark Scenarios via CLI
```powershell
cd backend
.\venv\Scripts\python.exe main.py --demo
.\venv\Scripts\python.exe main.py --demo --city London
```

### 4. Start the FastAPI Server Standalone
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Automated Test Suite
Run the comprehensive test suite validating all 8 LangGraph nodes, fallbacks, and schema integrity:
```powershell
cd backend
.\venv\Scripts\python.exe -m pytest test_day_planner.py test_audit.py -v
```

---

## 🏛️ Project Structure

```
backend/
├── main.py                  # CLI interface & LangGraph graph builder
├── server.py                # FastAPI REST & WebSocket server
├── policies.json            # Swytchcode policy guardrails & security constraints
├── requirements.txt         # Pinned Python dependencies
├── test_day_planner.py      # Core unit & integration test suite (27 tests)
├── test_audit.py            # Swytchcode policy & audit test suite
├── start_services.py        # Background process launcher
├── stop_services.py         # Graceful shutdown script
├── dashboard/               # Optional legacy Streamlit dashboard
│   └── app.py
└── src/
    ├── tools/               # Swytchcode & REST tool implementations
    │   ├── weather.py
    │   ├── gmail.py
    │   ├── jira.py
    │   ├── github.py
    │   ├── notion.py
    │   ├── slack.py
    │   └── resend.py
    └── nodes/               # LangGraph state machine node handlers
        ├── weather_node.py
        ├── gmail_node.py
        ├── jira_node.py
        ├── github_node.py
        ├── advisor_node.py
        ├── notion_node.py
        ├── slack_node.py
        └── email_node.py
```
