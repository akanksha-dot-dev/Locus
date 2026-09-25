"""
WeatherWise AI Life Agent — FastAPI Backend Server v2.0

The interactive demo server for the WeatherWise AI Agent.
Provides a complete REST API and WebSocket live feed for the dashboard.

Track 5 — AI Real World Agent | Build with Swytchcode
Integrations: OpenWeather, Gmail, Notion, Slack, Resend

Endpoints:
    GET  /health                    — Health check + integration status
    POST /run                       — Run the full WeatherWise AI pipeline
    POST /demo                      — Run demo with preset scenarios
    GET  /history                   — All past agent runs
    GET  /analytics                 — Aggregate metrics
    GET  /weather/{city}            — Quick weather lookup
    POST /quick-alert               — Send immediate Slack + email alert
    GET  /audit                     — Swytchcode API call audit trail
    WS   /ws                        — Real-time agent activity feed

Run with:
    python server.py
"""
import sys
import os
import asyncio
import json
from contextlib import asynccontextmanager

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from datetime import datetime
from collections import deque, Counter
from typing import Optional, List, Dict, Any

# ── Project root on path ──────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

from src.config import Config
from src.agent import weather_agent, preprocess_state
from src.nodes import (
    weather_fetcher,
    gmail_reader,
    jira_workload,
    github_workload,
    ai_advisor,
    notion_logger,
    slack_notifier,
    email_sender,
)

# ── In-memory stores ──────────────────────────────────────────────
HISTORY: deque = deque(maxlen=200)
SWY_AUDIT: deque = deque(maxlen=500)


# ── WebSocket Manager ─────────────────────────────────────────────
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, payload: dict):
        dead = []
        for ws in list(self.active):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            if ws in self.active:
                self.active.remove(ws)


manager = ConnectionManager()


# ── Lifespan Context Manager ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🌦️  SwytchAgent Day Planner (WeatherWise v2.0) Server starting...")
    print(f"   Default city: {Config.DEFAULT_CITY}")
    print(f"   OpenWeather: {'✅ Configured' if Config.OPENWEATHER_API_KEY else '⚠️  Not configured (fallback active)'}")
    print(f"   Gmail:       {'✅ Configured' if bool(getattr(Config, 'GMAIL_USER', None)) else '⚠️  Demo simulation'}")
    print(f"   Jira:        {'✅ Configured' if bool(Config.JIRA_API_TOKEN or Config.JIRA_DOMAIN) else '⚠️  Demo simulation'}")
    print(f"   GitHub:      {'✅ Configured' if (Config.GITHUB_TOKEN or Config.GITHUB_REPO) else '⚠️  Demo simulation'}")
    print(f"   Notion:      {'✅ Configured' if Config.NOTION_KB_DATABASE_ID else '⚠️  Not configured'}")
    print(f"   Slack:       {'✅ Configured' if (Config.SLACK_WEBHOOK_URL or Config.SLACK_BOT_TOKEN) else '⚠️  Not configured'}")
    print(f"   Resend:      {'✅ Configured' if Config.RESEND_API_KEY else '⚠️  Not configured'}")
    yield
    print("🛑 SwytchAgent Day Planner Server shutting down...")


# ── FastAPI App ───────────────────────────────────────────────────
app = FastAPI(
    title="SwytchAgent Day Planner API v2.0",
    description=(
        "SwytchAgent Day Planner (WeatherWise v2.0) — 8-Node LangGraph AI Agent combining "
        "OpenWeather, Gmail, Jira, GitHub, Gemini AI, Notion, Slack, and Resend via Swytchcode."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────
class AgentRequest(BaseModel):
    user_request: str = Field(
        ...,
        json_schema_extra={
            "example": "I have an outdoor picnic and a flight to Delhi today. What's the weather in Mumbai?"
        },
        description="Natural language request describing your plans and location"
    )
    city: Optional[str] = Field(
        None,
        json_schema_extra={"example": "Mumbai"},
        description="Override city for weather lookup"
    )
    user_email: Optional[str] = Field(
        None,
        json_schema_extra={"example": "user@example.com"},
        description="Email for Resend digest"
    )


class AgentResponse(BaseModel):
    city: str
    weather_summary: str
    temperature_c: float
    feels_like_c: Optional[float] = 0.0
    humidity: int
    wind_speed: float
    weather_condition: str
    weather_icon: Optional[str] = None
    weather_score: int
    risk_level: str
    ai_summary: str
    recommendations: list[str] = []
    outfit_suggestion: str = ""
    weather_alerts: list[str] = []
    forecast_summary: str = ""
    activity_adjustments: list[str] = []
    gmail_events: list = []
    gmail_summary: Optional[str] = None
    has_outdoor_plans: bool = False
    has_travel_plans: bool = False
    jira_tickets: list[dict] = []
    jira_estimated_hours: float = 0.0
    jira_summary: Optional[str] = None
    github_prs: list[dict] = []
    github_issues: list = []
    github_estimated_hours: float = 0.0
    github_summary: Optional[str] = None
    go_to_office: str = "undecided"
    office_reason: Optional[str] = ""
    day_plan_timeline: list = []
    estimated_productive_hours: float = 0.0
    notion_logged: bool = False
    notion_page_url: Optional[str] = None
    slack_message_sent: bool = False
    email_sent: bool = False
    resend_message_id: Optional[str] = None
    execution_log: list[str] = []
    processed_at: str


def normalize_office_decision(val: Optional[str]) -> str:
    """Centralize go_to_office normalization so that 'yes' becomes 'office' and 'no' becomes 'wfh'."""
    if not val:
        return "wfh"
    v = str(val).strip().lower()
    if v in ("yes", "office", "go_to_office", "true", "1"):
        return "office"
    if v in ("no", "wfh", "stay_home", "false", "0"):
        return "wfh"
    if v in ("hybrid", "maybe", "flexible"):
        return "hybrid"
    return v


class DemoScenario(BaseModel):
    scenario: str = Field(
        "outdoor_picnic",
        description="Demo scenario: outdoor_picnic | travel_day | storm_warning | clear_day"
    )
    city: Optional[str] = None
    user_email: Optional[str] = None


class QuickAlertRequest(BaseModel):
    city: str
    message: str
    risk_level: str = "high"
    user_email: Optional[str] = None


# ── Demo Scenarios ────────────────────────────────────────────────
DEMO_SCENARIOS = {
    "day_planner_office": (
        "Check my Jira tickets and GitHub PRs to estimate my workload, check today's weather in Mumbai, "
        "and decide if I should go to the office or work from home. Then plan my full day hour-by-hour."
    ),
    "outdoor_picnic": (
        "I have a team picnic at the city park at 11 AM and a cricket match at 4 PM. "
        "Should I proceed with outdoor plans? Give me a weather-aware briefing."
    ),
    "travel_day": (
        "I have a morning flight at 6 AM and need to reach the airport by 4 AM. "
        "Will the weather affect my travel? Any thunderstorms or fog expected?"
    ),
    "storm_warning": (
        "There's supposed to be heavy rain today. I have outdoor meetings and a school run. "
        "What precautions should I take?"
    ),
    "clear_day": (
        "Planning a family day out at the beach. Is it a good day to go outside? "
        "Check my emails for any plans and give recommendations."
    ),
    "work_from_home": (
        "Thinking about working from home today. What's the weather like? "
        "Do I have anything important in my email that requires going out?"
    ),
}


# ═══════════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """Health check with integration status."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "agent": "SwytchAgent Day Planner (WeatherWise v2.0)",
        "version": "2.0.0",
        "track": "Track 5 — AI Real World Agent",
        "framework": "LangGraph + Google Gemini",
        "integrations": {
            "openweather": bool(Config.OPENWEATHER_API_KEY),
            "gmail": bool(getattr(Config, 'GMAIL_USER', None) or True),  # Via Swytchcode simulation
            "jira": bool(Config.JIRA_API_TOKEN or Config.JIRA_DOMAIN),
            "github": bool(Config.GITHUB_TOKEN or Config.GITHUB_REPO),
            "notion": bool(Config.NOTION_KB_DATABASE_ID),
            "slack": bool(Config.SLACK_WEBHOOK_URL or Config.SLACK_BOT_TOKEN),
            "resend": bool(Config.RESEND_API_KEY),
        },
        "swytchcode_apis": [
            "openweather.current.get",
            "gmail.messages.list",
            "jira.issues.list",
            "github.pullRequests.list",
            "notion.pages.create",
            "slack.messages.send",
            "resend.email.create",
        ],
        "history_count": len(HISTORY),
        "live_connections": len(manager.active),
        "default_city": Config.DEFAULT_CITY,
    }


@app.post("/run", response_model=AgentResponse)
async def run_agent(request: AgentRequest):
    """
    Run the full SwytchAgent Day Planner AI agent pipeline.

    Agent flow:
        User Request → OpenWeather → Gmail → Jira → GitHub →
        Gemini AI Advisor → Notion Logger → Slack Alert → Resend Email → Final Response
    """
    try:
        initial_state = {
            "user_request": request.user_request,
            "user_email": request.user_email or Config.RESEND_TO_EMAIL or Config.JIRA_EMAIL,
            "city": request.city or Config.DEFAULT_CITY,
            "execution_log": [
                f"🚀 SwytchAgent Day Planner invoked via API at {datetime.now().isoformat()}"
            ],
        }

        state = preprocess_state(initial_state)

        # 1. Weather Node
        state = await asyncio.to_thread(weather_fetcher.run, state)
        await manager.broadcast({"type": "step_complete", "step": "weather", "data": {
            "city": state.get("city"),
            "condition": state.get("weather_condition"),
            "temp": state.get("temperature_c"),
            "feels_like": state.get("feels_like_c", state.get("temperature_c")),
        }})

        # 2. Gmail Node
        state = await asyncio.to_thread(gmail_reader.run, state)
        await manager.broadcast({"type": "step_complete", "step": "gmail", "data": {
            "events": len(state.get("gmail_events", [])),
            "outdoor": state.get("has_outdoor_plans"),
            "travel": state.get("has_travel_plans"),
        }})

        # 3. Jira Workload Node
        state = await asyncio.to_thread(jira_workload.run, state)
        await manager.broadcast({"type": "step_complete", "step": "jira", "data": {
            "tickets": len(state.get("jira_issues", [])),
            "hours": state.get("jira_total_hours", 0.0),
        }})

        # 4. GitHub Workload Node
        state = await asyncio.to_thread(github_workload.run, state)
        await manager.broadcast({"type": "step_complete", "step": "github", "data": {
            "prs": len(state.get("github_prs", [])),
            "issues": len(state.get("github_issues_open", [])),
            "hours": state.get("github_total_hours", 0.0),
        }})

        # 5. Gemini AI Advisor Node
        state = await asyncio.to_thread(ai_advisor.run, state)
        normalized_office = normalize_office_decision(state.get("go_to_office"))
        state["go_to_office"] = normalized_office

        await manager.broadcast({"type": "step_complete", "step": "ai_advisor", "data": {
            "score": state.get("weather_score"),
            "risk": state.get("risk_level"),
            "go_to_office": normalized_office,
            "office_reason": state.get("office_reason", ""),
            "should_alert": state.get("should_alert"),
        }})

        # 6. Notion Logger Node
        state = await asyncio.to_thread(notion_logger.run, state)
        await manager.broadcast({"type": "step_complete", "step": "notion", "data": {
            "logged": state.get("notion_logged"),
            "url": state.get("notion_page_url"),
        }})

        # 7. Slack Notifier Node
        state = await asyncio.to_thread(slack_notifier.run, state)
        await manager.broadcast({"type": "step_complete", "step": "slack", "data": {
            "sent": state.get("slack_message_sent"),
        }})

        # 8. Resend Email Node
        state = await asyncio.to_thread(email_sender.run, state)
        await manager.broadcast({"type": "step_complete", "step": "resend", "data": {
            "sent": state.get("email_sent"),
            "msg_id": state.get("resend_message_id"),
        }})

        # Log to Swytchcode audit trail
        SWY_AUDIT.append({
            "timestamp": datetime.now().isoformat(),
            "tools_called": [
                "openweather.current.get",
                "gmail.messages.list",
                "jira.issues.list",
                "github.pullRequests.list",
                "notion.pages.create",
                "slack.messages.send",
                "resend.email.create",
            ],
            "city": state.get("city"),
            "risk": state.get("risk_level"),
            "score": state.get("weather_score"),
            "go_to_office": normalized_office,
            "office_reason": state.get("office_reason", ""),
            "notion_logged": state.get("notion_logged"),
            "slack_sent": state.get("slack_message_sent"),
            "email_sent": state.get("email_sent"),
        })

        record = {**state, "processed_at": datetime.now().isoformat()}
        HISTORY.append(record)

        await manager.broadcast({
            "type": "agent_complete",
            "city": state.get("city"),
            "risk": state.get("risk_level"),
            "score": state.get("weather_score"),
            "go_to_office": normalized_office,
            "office_reason": state.get("office_reason", ""),
            "timestamp": record["processed_at"],
        })

        # Build clean response with complete intelligence output
        jira_tickets = state.get("jira_issues") or state.get("jira_tickets") or []
        github_prs = state.get("github_prs") or []

        response_data = {
            "city": state.get("city", ""),
            "weather_summary": state.get("weather_summary", ""),
            "temperature_c": float(state.get("temperature_c", 0.0)),
            "feels_like_c": float(state.get("feels_like_c", state.get("temperature_c", 0.0))),
            "humidity": int(state.get("humidity", 0)),
            "wind_speed": float(state.get("wind_speed", 0.0)),
            "weather_condition": state.get("weather_condition", ""),
            "weather_icon": state.get("weather_icon"),
            "weather_score": int(state.get("weather_score", 0)),
            "risk_level": state.get("risk_level", "low"),
            "ai_summary": state.get("ai_summary", ""),
            "recommendations": state.get("recommendations", []),
            "outfit_suggestion": state.get("outfit_suggestion", ""),
            "weather_alerts": state.get("weather_alerts", []),
            "forecast_summary": state.get("forecast_summary", ""),
            "activity_adjustments": state.get("activity_adjustments", []),
            "gmail_events": state.get("gmail_events", []),
            "gmail_summary": state.get("gmail_summary"),
            "has_outdoor_plans": bool(state.get("has_outdoor_plans", False)),
            "has_travel_plans": bool(state.get("has_travel_plans", False)),
            "jira_tickets": jira_tickets,
            "jira_estimated_hours": float(state.get("jira_total_hours", 0.0)),
            "jira_summary": state.get("jira_summary"),
            "github_prs": github_prs,
            "github_issues": state.get("github_issues_open", []),
            "github_estimated_hours": float(state.get("github_total_hours", 0.0)),
            "github_summary": state.get("github_summary"),
            "go_to_office": normalized_office,
            "office_reason": state.get("office_reason", ""),
            "day_plan_timeline": state.get("day_plan_timeline", []),
            "estimated_productive_hours": float(state.get("estimated_productive_hours", 0.0)),
            "notion_logged": bool(state.get("notion_logged", False)),
            "notion_page_url": state.get("notion_page_url"),
            "slack_message_sent": bool(state.get("slack_message_sent", False)),
            "email_sent": bool(state.get("email_sent", False)),
            "resend_message_id": state.get("resend_message_id"),
            "execution_log": state.get("execution_log", []),
            "processed_at": record["processed_at"],
        }

        return AgentResponse(**response_data)

    except Exception as e:
        await manager.broadcast({
            "type": "pipeline_error",
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        })
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/demo", response_model=AgentResponse)
async def run_demo(request: DemoScenario):
    """
    Run a demo scenario with preset user requests.

    Available scenarios: day_planner_office, outdoor_picnic, travel_day, storm_warning, clear_day, work_from_home
    """
    scenario_text = DEMO_SCENARIOS.get(
        request.scenario,
        DEMO_SCENARIOS.get("day_planner_office", DEMO_SCENARIOS["outdoor_picnic"])
    )
    city = request.city or Config.DEFAULT_CITY or "Mumbai"

    agent_req = AgentRequest(
        user_request=scenario_text,
        city=city,
        user_email=request.user_email or Config.JIRA_EMAIL,
    )
    return await run_agent(agent_req)


def _mock_weather_for_city(city: str) -> dict:
    """Generate realistic mock weather data for offline/test environments."""
    city_lower = (city or "").lower().strip()
    mock_db = {
        "mumbai": {"temp": 29.5, "feels_like": 33.0, "humidity": 78, "wind": 4.5, "cond": "Clouds", "desc": "scattered clouds", "icon": "03d"},
        "london": {"temp": 16.0, "feels_like": 15.2, "humidity": 68, "wind": 5.1, "cond": "Rain", "desc": "light rain", "icon": "10d"},
        "delhi": {"temp": 32.0, "feels_like": 35.0, "humidity": 55, "wind": 3.8, "cond": "Clear", "desc": "clear sky", "icon": "01d"},
        "new york": {"temp": 21.0, "feels_like": 20.5, "humidity": 60, "wind": 4.2, "cond": "Clear", "desc": "clear sky", "icon": "01d"},
        "bengaluru": {"temp": 24.0, "feels_like": 24.5, "humidity": 65, "wind": 3.5, "cond": "Clouds", "desc": "broken clouds", "icon": "04d"},
        "bangalore": {"temp": 24.0, "feels_like": 24.5, "humidity": 65, "wind": 3.5, "cond": "Clouds", "desc": "broken clouds", "icon": "04d"},
        "tokyo": {"temp": 22.0, "feels_like": 21.8, "humidity": 62, "wind": 3.2, "cond": "Clear", "desc": "clear sky", "icon": "01d"},
        "paris": {"temp": 18.5, "feels_like": 18.0, "humidity": 64, "wind": 4.0, "cond": "Clouds", "desc": "few clouds", "icon": "02d"},
    }
    spec = mock_db.get(city_lower, {
        "temp": 25.0, "feels_like": 26.0, "humidity": 65, "wind": 4.0, "cond": "Clouds", "desc": "partly cloudy", "icon": "04d"
    })
    return {
        "city": city.title(),
        "temperature_c": spec["temp"],
        "feels_like_c": spec["feels_like"],
        "humidity": spec["humidity"],
        "wind_speed": spec["wind"],
        "condition": spec["cond"],
        "description": spec["desc"],
        "icon_url": f"https://openweathermap.org/img/wn/{spec['icon']}@2x.png",
        "timestamp": datetime.now().isoformat(),
        "is_mock": True,
    }


@app.get("/weather/{city}")
async def quick_weather(city: str):
    """Quick weather lookup for a city with realistic fallback when API key is unconfigured or invalid."""
    import requests as req_lib
    if not Config.OPENWEATHER_API_KEY:
        return _mock_weather_for_city(city)

    try:
        resp = req_lib.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={"q": city, "appid": Config.OPENWEATHER_API_KEY, "units": "metric"},
            timeout=10,
        )
        if resp.status_code == 404:
            raise HTTPException(status_code=404, detail=f"City '{city}' not found")
        if resp.status_code in (401, 403):
            # API key invalid or unauthorized, fall back smoothly
            return _mock_weather_for_city(city)

        resp.raise_for_status()
        data = resp.json()

        main = data.get("main", {})
        weather = data.get("weather", [{}])[0]
        return {
            "city": city,
            "temperature_c": main.get("temp"),
            "feels_like_c": main.get("feels_like", main.get("temp")),
            "humidity": main.get("humidity"),
            "wind_speed": data.get("wind", {}).get("speed"),
            "condition": weather.get("main"),
            "description": weather.get("description"),
            "icon_url": f"https://openweathermap.org/img/wn/{weather.get('icon', '01d')}@2x.png",
            "timestamp": datetime.now().isoformat(),
            "is_mock": False,
        }
    except HTTPException:
        raise
    except Exception:
        # Network failure or any other error -> fallback to mock weather
        return _mock_weather_for_city(city)


@app.get("/history")
async def get_history(limit: int = 20):
    """Return past agent runs in reverse chronological order."""
    items = list(reversed(list(HISTORY)))[:limit]
    return {
        "items": [{
            "processed_at": i.get("processed_at", ""),
            "city": i.get("city", ""),
            "weather_condition": i.get("weather_condition", ""),
            "temperature_c": i.get("temperature_c", 0),
            "feels_like_c": i.get("feels_like_c", i.get("temperature_c", 0)),
            "weather_score": i.get("weather_score", 0),
            "risk_level": i.get("risk_level", ""),
            "go_to_office": i.get("go_to_office", "undecided"),
            "office_reason": i.get("office_reason", ""),
            "ai_summary": i.get("ai_summary", "")[:100] + "..." if len(i.get("ai_summary", "")) > 100 else i.get("ai_summary", ""),
            "email_sent": i.get("email_sent", False),
            "slack_sent": i.get("slack_message_sent", False),
            "notion_logged": i.get("notion_logged", False),
        } for i in items],
        "total": len(HISTORY),
    }


@app.get("/analytics")
async def get_analytics():
    """Aggregate metrics over all agent runs."""
    items = list(HISTORY)
    total = len(items)
    if total == 0:
        return {"total_runs": 0, "message": "No agent runs yet. POST to /run to start."}

    scores = [i.get("weather_score", 0) for i in items]
    risks = [i.get("risk_level", "low") for i in items]
    conditions = [i.get("weather_condition", "Unknown") for i in items]
    offices = [i.get("go_to_office", "undecided") for i in items]

    return {
        "total_runs": total,
        "avg_weather_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "risk_distribution": dict(Counter(risks)),
        "top_conditions": dict(Counter(conditions).most_common(5)),
        "office_distribution": dict(Counter(offices)),
        "emails_sent": sum(1 for i in items if i.get("email_sent")),
        "slack_alerts": sum(1 for i in items if i.get("slack_message_sent")),
        "notion_pages": sum(1 for i in items if i.get("notion_logged")),
        "outdoor_plans_detected": sum(1 for i in items if i.get("has_outdoor_plans")),
        "travel_plans_detected": sum(1 for i in items if i.get("has_travel_plans")),
        "swytchcode_api_calls": len(SWY_AUDIT) * 4,  # Approx 4 calls per run
    }


@app.get("/audit")
async def get_audit():
    """Return the Swytchcode API call audit trail."""
    return {
        "audit_trail": list(SWY_AUDIT),
        "total_api_calls": len(SWY_AUDIT),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/quick-alert")
async def send_quick_alert(request: QuickAlertRequest):
    """
    Send an immediate weather alert via Slack + Resend without running the full pipeline.
    Useful for testing integrations.
    """
    mock_state = {
        "city": request.city,
        "weather_condition": "Alert",
        "temperature_c": 30.0,
        "feels_like_c": 32.0,
        "humidity": 70,
        "wind_speed": 5.0,
        "weather_score": 30,
        "risk_level": request.risk_level,
        "ai_summary": request.message,
        "recommendations": [request.message],
        "outfit_suggestion": "Check weather before going out",
        "weather_alerts": [request.message],
        "forecast_summary": "Alert conditions expected",
        "gmail_events": [],
        "should_alert": True,
        "user_email": request.user_email or Config.JIRA_EMAIL,
        "execution_log": [f"🚨 Quick alert triggered at {datetime.now().isoformat()}"],
    }

    slack_result = await asyncio.to_thread(slack_notifier.run, mock_state)
    email_result = await asyncio.to_thread(email_sender.run, slack_result)

    return {
        "slack_sent": email_result.get("slack_message_sent", False),
        "email_sent": email_result.get("email_sent", False),
        "execution_log": email_result.get("execution_log", []),
    }


@app.get("/scenarios")
async def list_scenarios():
    """List available demo scenarios."""
    return {
        "scenarios": [
            {"id": k, "description": v[:80] + "..."}
            for k, v in DEMO_SCENARIOS.items()
        ]
    }


# ── WebSocket live activity feed ───────────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    recent = list(reversed(list(HISTORY)))[:5]
    try:
        await ws.send_json({
            "type": "connected",
            "message": "SwytchAgent Day Planner WebSocket connected",
            "recent_runs": len(recent),
        })
        while True:
            await ws.receive_text()  # Keep-alive
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        manager.disconnect(ws)


# ── Run ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🌦️  SwytchAgent Day Planner (WeatherWise v2.0)")
    print("   API:   http://localhost:8000")
    print("   Docs:  http://localhost:8000/docs")
    print("   WS:    ws://localhost:8000/ws")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
