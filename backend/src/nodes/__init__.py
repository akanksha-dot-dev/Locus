"""
Locus Day Planner — Node Registry.

The 8 LangGraph workflow nodes for the 7-integration Day Planner pipeline:
  1. weather_fetcher  — OpenWeather API: real-time weather & forecasts
  2. gmail_reader     — Gmail context: calendar events, outdoor & travel plans
  3. jira_workload    — Jira context: tickets, priorities & estimated hours
  4. github_workload  — GitHub context: open PRs, code reviews & issues
  5. ai_advisor       — Google Gemini: synthesizes data into a personalized day plan
  6. notion_logger    — Notion API: creates an executive daily planner log page
  7. slack_notifier   — Slack API: sends weather alerts & daily schedule summary
  8. email_sender     — Resend API: sends a responsive HTML day plan email
"""
from . import weather_fetcher
from . import gmail_reader
from . import jira_workload
from . import github_workload
from . import ai_advisor
from . import notion_logger
from . import slack_notifier
from . import email_sender

__all__ = [
    "weather_fetcher",
    "gmail_reader",
    "jira_workload",
    "github_workload",
    "ai_advisor",
    "notion_logger",
    "slack_notifier",
    "email_sender",
]
