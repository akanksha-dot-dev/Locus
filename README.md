# 📅 SwytchAgent Day Planner — AI Real World Agent

> **Track 5: AI Real World Agent | Build with Swytchcode Hackathon 2026**  
> An autonomous, context-aware AI agent that combines real-time weather data with your work context (Gmail, Jira, GitHub) to estimate workloads, recommend office vs. WFH decisions, formulate hour-by-hour schedules, and automate daily briefings via Notion, Slack, and Resend.

---

## 🔗 7 Real-World Integrations

| Integration | Source | Role in Day Planning |
|---|---|---|
| **OpenWeather** | Live Weather API | Real-time conditions, 24h forecast, temperature, humidity, severe alerts |
| **Gmail** | Swytchcode / Google | Identifies calendar meetings, appointments, travel, outdoor commitments |
| **Jira** | Swytchcode / Atlassian | Pulls open assigned tickets, priorities, and estimates focus hours needed |
| **GitHub** | Swytchcode / GitHub | Inspects assigned Pull Requests, review workloads, and pending issues |
| **Google Gemini** | LangGraph Node | Synthesizes all 4 inputs into a reasoned Office vs. WFH decision & hourly schedule |
| **Notion** | Swytchcode / Notion | Publishes the complete executive Day Plan page with timeline & breakdown |
| **Slack** | Swytchcode / Webhook | Broadcasts the daily schedule & severe weather alerts directly to team channels |
| **Resend** | Swytchcode / Resend | Delivers a responsive, stylized HTML daily briefing email to the user |

---

## 📁 Repository Structure

```
SwytchAgent2.0/
└── planner-agent/
    ├── main.py                 # CLI entry point (demo, verify, live interactive)
    ├── server.py               # FastAPI backend with REST API & WebSocket live feed
    ├── dashboard/
    │   └── app.py              # Streamlit interactive UI dashboard
    ├── src/
    │   ├── agent.py            # LangGraph StateGraph (8-node pipeline)
    │   ├── state.py            # TypedDict AgentState schema
    │   ├── config.py           # Centralized environment variable manager
    │   ├── tools.py            # Swytchcode tool loader
    │   └── nodes/              # 8 dedicated workflow nodes:
    │       ├── weather_fetcher.py   # [1] OpenWeather fetcher
    │       ├── gmail_reader.py      # [2] Gmail plan detector
    │       ├── jira_workload.py     # [3] Jira workload analyzer
    │       ├── github_workload.py   # [4] GitHub PR & issue analyzer
    │       ├── ai_advisor.py        # [5] Gemini AI reasoning engine
    │       ├── notion_logger.py     # [6] Notion page creator
    │       ├── slack_notifier.py    # [7] Slack Block Kit notifier
    │       └── email_sender.py      # [8] Resend HTML email dispatcher
    ├── policies.json           # Swytchcode governance & rate limit policies
    ├── setup_swytchcode.bat    # Swytchcode tool installation script
    ├── start_services.py       # One-click persistent service launcher
    ├── stop_services.py        # Service shutdown script
    ├── test_day_planner.py     # End-to-end integration test runner
    └── requirements.txt        # Python dependencies
```

---

## 🚀 Quick Start

### 1. Run the Agent (CLI Demo)
```powershell
cd planner-agent
.\venv\Scripts\python.exe main.py --demo
```

### 2. Verify Integrations & Configuration
```powershell
cd planner-agent
.\venv\Scripts\python.exe main.py --verify
```

### 3. Launch Backend & Dashboard
```powershell
cd planner-agent
.\venv\Scripts\python.exe start_services.py
```
- **Streamlit Web UI:** [http://localhost:8501](http://localhost:8501)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

For detailed technical documentation, please see the **[Planner Agent Documentation](./planner-agent/README.md)**.
