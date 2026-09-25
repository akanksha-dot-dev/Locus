"""
LangGraph state definition for the SwytchAgent Day Planner.

This TypedDict flows through every node in the 7-integration workflow,
accumulating real-world data so the AI can plan the user's full day.

Track 5 — AI Real World Agent | Build with Swytchcode
Integrations: OpenWeather, Gmail, Notion, Slack, Resend, Jira, GitHub
"""
from __future__ import annotations
from typing import TypedDict, Optional, Union


class AgentState(TypedDict, total=False):
    """State that flows through the SwytchAgent Day Planner workflow."""

    # ── User Request (entry point) ───────────────────────────────
    user_request: str           # Natural language user request
    user_email: str             # User's email for Resend digest
    city: str                   # Extracted city for weather lookup

    # ── Weather Data (populated by weather_fetcher node) ─────────
    weather_data: dict          # Raw OpenWeather API response
    weather_summary: str        # Human-readable weather summary
    temperature_c: float        # Current temperature in Celsius
    feels_like_c: float         # Feels like temperature
    humidity: int               # Humidity percentage
    wind_speed: float           # Wind speed m/s
    weather_condition: str      # "Clear", "Rain", "Thunderstorm", etc.
    weather_icon: str           # Weather icon code
    weather_alerts: list[str]   # Any severe weather warnings
    uv_index: Optional[float]   # UV index if available
    forecast_summary: str       # Brief 24h forecast

    # ── Gmail Context (populated by gmail_reader node) ────────────
    gmail_events: list[dict]    # Upcoming events/plans from Gmail
    gmail_summary: str          # Summary of relevant emails
    has_outdoor_plans: bool     # AI-detected outdoor activity plans
    has_travel_plans: bool      # Travel-related emails detected

    # ── Jira Workload (populated by jira_workload node) ───────────
    jira_issues: list[dict]     # Parsed Jira issues assigned to user
    jira_tickets: list[dict]    # Structured Jira tickets list (alias for compatibility)
    jira_total_hours: float     # Estimated total Jira work hours today
    jira_summary: str           # Human-readable Jira summary
    jira_issue_lines: list[str] # Formatted issue lines for display
    jira_high_priority: int     # Count of High/Highest priority issues
    jira_blocked_count: int     # Count of Blocked issues

    # ── GitHub Workload (populated by github_workload node) ───────
    github_prs: list[dict]          # Open pull requests
    github_issues_open: list[dict]  # Open assigned issues
    github_total_hours: float       # Estimated review/triage hours
    github_summary: str             # Human-readable GitHub summary
    github_stale_prs: list[dict]    # PRs older than 3 days

    # ── AI Intelligence (populated by ai_advisor node) ────────────
    weather_score: int          # 0-100 weather suitability score
    recommendations: list[str]  # Actionable recommendations
    risk_level: str             # "low" | "medium" | "high" | "critical"
    outfit_suggestion: str      # What to wear
    activity_adjustments: list[str]  # Suggested plan changes
    ai_summary: str             # Full AI-generated briefing
    should_alert: bool          # Whether to send Slack alert
    go_to_office: str           # Canonical values: "office" | "wfh" | "hybrid"
    office_reason: str          # 1-sentence rationale for office vs WFH recommendation
    day_plan_timeline: list[str | dict]  # Ordered timeline blocks (supports str or dict)
    estimated_productive_hours: float  # Total productive hours today

    # ── Notion Log (populated by notion_logger node) ───────────────
    notion_page_id: Optional[str]    # Created Notion page ID
    notion_page_url: Optional[str]   # Notion page URL
    notion_logged: bool              # Success flag

    # ── Slack Notification (populated by slack_notifier node) ──────
    slack_message_sent: bool         # Success flag
    slack_channel: str               # Channel used

    # ── Resend Email (populated by email_sender node) ──────────────
    resend_message_id: Optional[str] # Email message ID
    email_sent: bool                 # Success flag

    # ── Audit Trail ─────────────────────────────────────────────────
    execution_log: list[str]
    processed_at: str
