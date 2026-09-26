"""
Locus Day Planner — LangGraph Workflow (7 Integrations).

Orchestrates all 7 data sources into a complete intelligent day plan.

PIPELINE:

  User Request
       │
       ▼
  [1] weather_fetcher ──── OpenWeather API (current + 24h forecast)
       │                                                    ╔═══════════════════╗
       ├──────────────────────────────────────────────────► ║  PARALLEL INTAKE  ║
       │                                                    ╚═══════════════════╝
       ▼
  [2] gmail_reader ─────── Gmail API (meetings, events, travel, outdoor plans)
       │
       ▼
  [3] jira_workload ─────── Jira Cloud (open tickets, priorities, estimates)
       │
       ▼
  [4] github_workload ──── GitHub (open PRs, assigned issues, stale reviews)
       │
       ▼
  [5] ai_advisor ────────── Gemini LLM (synthesizes all 4 sources → full day plan)
       │                     · go_to_office decision
       │                     · hourly timeline
       │                     · weather + work + plans integration
       ▼
  [6] notion_logger ─────── Notion (persist full day plan as a Notion page)
       │
       ▼
  [7] slack_notifier ─────── Slack (alert with plan preview + Notion link)
       │
       ▼
  [8] email_sender ────────── Resend (beautiful HTML email digest of the day plan)
       │
       ▼
      END

Track 5 — AI Real World Agent | Build with Swytchcode
Integrations: OpenWeather · Gmail · Jira · GitHub · Notion · Slack · Resend
Framework: LangGraph (Google ADK compatible)
"""
import re
from langgraph.graph import StateGraph, END
from src.state import AgentState
from src.nodes import (
    weather_fetcher,
    gmail_reader,
    notion_logger,
    slack_notifier,
    email_sender,
)
from src.nodes import ai_advisor
from src.nodes import jira_workload
from src.nodes import github_workload
from src.config import Config


def _extract_city(state: AgentState) -> str:
    """Extract city from user request using regex patterns."""
    request = state.get("user_request", "")
    patterns = [
        r"\bin\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b",
        r"\bfor\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b",
        r"\bat\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b",
        r"\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+weather\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, request)
        if match:
            candidate = match.group(1)
            if candidate not in {"My", "The", "A", "An", "I", "Today", "Tomorrow", "This", "Plan"}:
                return candidate
    return state.get("city", Config.DEFAULT_CITY)


def _route_after_advice(state: AgentState) -> str:
    """After AI advisor, always log to Notion."""
    return "log_to_notion"


def _route_after_notion(state: AgentState) -> str:
    """After Notion, always try Slack (node gates internally based on risk)."""
    return "send_slack_alert"


def build_agent_graph() -> StateGraph:
    """
    Build and compile the Locus Day Planner 7-integration workflow.

    Graph: 8 nodes, sequential pipeline with intelligent conditional routing.

    Agentic behaviours:
      - Agent reads Jira tickets → estimates how many hours of work you have
      - Agent reads GitHub PRs → flags stale reviews needing attention today
      - Agent reads Gmail → finds hard schedule anchors (meetings, events)
      - Agent reads OpenWeather → decides if commute/outdoor plans are safe
      - Gemini LLM synthesizes ALL above into a personalized hourly plan
      - Notion captures the full plan as a structured daily log
      - Slack sends a real-time alert with plan preview + Notion link button
      - Resend delivers a beautiful HTML email digest
    """
    graph = StateGraph(AgentState)

    # ── Register all 8 nodes ──────────────────────────────────────────
    graph.add_node("fetch_weather",    weather_fetcher.run)
    graph.add_node("read_gmail",       gmail_reader.run)
    graph.add_node("fetch_jira",       jira_workload.run)
    graph.add_node("fetch_github",     github_workload.run)
    graph.add_node("analyze_and_plan", ai_advisor.run)
    graph.add_node("log_to_notion",    notion_logger.run)
    graph.add_node("send_slack_alert", slack_notifier.run)
    graph.add_node("send_email_digest", email_sender.run)

    # ── Entry point ───────────────────────────────────────────────────
    graph.set_entry_point("fetch_weather")

    # ── Pipeline flow ─────────────────────────────────────────────────
    # Stage 1: Parallel real-world data collection (sequential in LangGraph)
    # Weather → Gmail → Jira → GitHub  (all feed into ai_advisor)
    graph.add_edge("fetch_weather",     "read_gmail")
    graph.add_edge("read_gmail",        "fetch_jira")
    graph.add_edge("fetch_jira",        "fetch_github")

    # Stage 2: AI synthesis of all 4 data sources → full day plan
    graph.add_edge("fetch_github",      "analyze_and_plan")

    # Stage 3: Persist day plan to Notion
    graph.add_conditional_edges(
        "analyze_and_plan",
        _route_after_advice,
        {"log_to_notion": "log_to_notion"}
    )

    # Stage 4: Slack alert (node gates internally based on risk/alerts)
    graph.add_conditional_edges(
        "log_to_notion",
        _route_after_notion,
        {"send_slack_alert": "send_slack_alert"}
    )

    # Stage 5: Always send beautiful email digest via Resend
    graph.add_edge("send_slack_alert",  "send_email_digest")

    # ── Termination ───────────────────────────────────────────────────
    graph.add_edge("send_email_digest", END)

    return graph.compile()


def preprocess_state(initial_state: dict) -> dict:
    """Extract city and normalize the initial state before graph execution."""
    explicit_city = initial_state.get("city")
    if explicit_city and isinstance(explicit_city, str) and explicit_city.strip():
        city = explicit_city.strip()
    else:
        city = _extract_city(initial_state)
    from datetime import datetime
    return {
        **initial_state,
        "city": city,
        "execution_log": initial_state.get("execution_log", [
            f"🚀 Locus Day Planner started — {initial_state.get('user_request', 'Plan my day')}",
            f"📡 Integrations active: OpenWeather · Gmail · Jira · GitHub · Notion · Slack · Resend",
        ]),
        "processed_at": datetime.now().isoformat(),
    }


# ── Pre-compiled graph instance for import ───────────────────────────────────
weather_agent = build_agent_graph()
