# 📅 SwytchAgent Day Planner

> **Track 5 — AI Real World Agent | Build with Swytchcode Hackathon 2026**

An intelligent, context-aware AI agent that understands real-world situations by synthesizing **live weather forecasts**, **personal calendar commitments from Gmail**, and **workload metrics from Jira and GitHub** to deliver automated Office vs. WFH recommendations, hour-by-hour schedules, and executive briefings across **Notion**, **Slack**, and **Resend**.

---

## 🎯 Problem Statement

> *Build an AI agent that can understand real-world situations using external information and take useful actions for users.*

**SwytchAgent Day Planner** solves this by:
1. Fetching **real-time weather and 24h forecasts** via OpenWeather
2. Understanding scheduled meetings and travel commitments from **Gmail**
3. Inspecting assigned tickets, priorities, and estimated hours from **Jira**
4. Reviewing open Pull Requests, code review queue, and issues from **GitHub**
5. **Reasoning** with Google Gemini to decide whether to go to the office or work from home
6. **Formulating** a personalized, conflict-free hour-by-hour day plan timeline
7. **Executing** coordinated follow-up actions:
   - Creating a structured Day Plan page in **Notion**
   - Broadcasting a schedule summary to team channels on **Slack**
   - Delivering a responsive HTML daily briefing email via **Resend**

---

## 🤖 8-Node LangGraph Architecture

```
User Natural Language Request
        │
        ▼
┌───────────────────┐
│  [1] OPENWEATHER  │ → Current conditions, 24h forecast, temperature, humidity & alerts
│  weather_fetcher  │   api.openweathermap.org
└────────┬──────────┘
         │ weather_data, forecast, alerts, score
         ▼
┌───────────────────┐
│  [2] GMAIL        │ → Analyzes inbox for meetings, flights, appointments & travel
│  gmail_reader     │   Swytchcode: gmail.messages.list + gmail.messages.get
└────────┬──────────┘
         │ gmail_events, has_outdoor_plans, has_travel_plans
         ▼
┌───────────────────┐
│  [3] JIRA         │ → Scans assigned tickets, priority levels, and estimates hours
│  jira_workload    │   Swytchcode: jira.issues.list + REST API
└────────┬──────────┘
         │ jira_tickets, jira_estimated_hours
         ▼
┌───────────────────┐
│  [4] GITHUB       │ → Inspects assigned pull requests & code review commitments
│  github_workload  │   Swytchcode: github.pullRequests.list + REST API
└────────┬──────────┘
         │ github_prs, github_issues, github_estimated_hours
         ▼
┌───────────────────┐
│  [5] GEMINI AI    │ → Multi-source reasoning: Office vs WFH decision + hourly timeline
│  ai_advisor       │   Google Gemini LLM synthesis
└────────┬──────────┘
         │ go_to_office, day_plan_timeline, recommendations, outfit, should_alert
         ▼
┌───────────────────┐
│  [6] NOTION       │ → Creates an executive Day Plan page with timeline & metrics
│  notion_logger    │   Swytchcode: notion.pages.create
└────────┬──────────┘
         │ notion_page_url
         ▼
┌───────────────────┐
│  [7] SLACK        │ → Delivers rich Block Kit briefing & weather alerts to channel
│  slack_notifier   │   Swytchcode: slack.messages.send
└────────┬──────────┘
         │ slack_message_sent
         ▼
┌───────────────────┐
│  [8] RESEND       │ → Sends a responsive HTML Day Plan email digest
│  email_sender     │   Swytchcode: resend.email.create
└───────────────────┘
         │
         ▼
    Final Response (REST JSON + Streamlit Dashboard)
```

---

## 🔗 7 Real-World Integrations

| API | Integration Method | Primary Function |
|---|---|---|
| **OpenWeather** | Direct REST / Swytchcode | Real-time weather, forecast & severe alerts |
| **Gmail** | `gmail.messages.list` | Meeting detection & calendar commitments |
| **Jira** | `jira.issues.list` | Workload estimation & sprint ticket tracking |
| **GitHub** | `github.pullRequests.list` | PR reviews, issue priorities & code commits |
| **Notion** | `notion.pages.create` | Executive Day Plan log with timeline |
| **Slack** | `slack.messages.send` | Block Kit schedule alerts & warnings |
| **Resend** | `resend.email.create` | Responsive HTML daily briefing email |

---

## 🚀 Quick Start

### 1. Configure Environment
Create `.env` inside `backend/` (or copy from `.env.example`):
```bash
GOOGLE_API_KEY=your_gemini_api_key
OPENWEATHER_API_KEY=your_openweather_key
DEFAULT_CITY=Mumbai
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
RESEND_API_KEY=your_resend_api_key
RESEND_TO_EMAIL=your_email@example.com
NOTION_API_KEY=your_notion_key
NOTION_KB_DATABASE_ID=your_notion_db_id
```

### 2. Verify Setup
```powershell
cd backend
.\venv\Scripts\python.exe main.py --verify
```

### 3. Run Demo Scenarios via CLI
```powershell
cd backend
.\venv\Scripts\python.exe main.py --demo
.\venv\Scripts\python.exe main.py --demo --city London
```

### 4. Run the Full Stack (Backend + Dashboard)
```powershell
cd backend
.\venv\Scripts\python.exe start_services.py
```
- **Streamlit Web UI:** `http://localhost:8501`
- **FastAPI Backend:** `http://localhost:8000`
- **Swagger Documentation:** `http://localhost:8000/docs`

To stop background services:
```powershell
.\venv\Scripts\python.exe stop_services.py
```
