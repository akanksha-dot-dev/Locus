"""
Configuration module for the WeatherWise AI Life Agent.
Loads environment variables and provides typed access to all settings.
"""
import os
from dotenv import load_dotenv

# Search order for .env:
# 1. backend/.env (standard project structure)
# 2. ./.env (root working directory)
_backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
_backend_env = os.path.join(_backend_dir, ".env")
_root_env = os.path.join(os.path.abspath(os.path.join(_backend_dir, "..")), ".env")

if os.path.exists(_backend_env):
    load_dotenv(_backend_env)
if os.path.exists(_root_env):
    load_dotenv(_root_env)
load_dotenv()


class Config:
    """Centralized configuration loaded from environment variables."""

    # --- LLM ---
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-flash-lite-latest")

    # --- OpenWeather ---
    OPENWEATHER_API_KEY: str = os.getenv("OPENWEATHER_API_KEY", "")
    DEFAULT_CITY: str = os.getenv("DEFAULT_CITY", "Mumbai")

    # --- Gmail (via Swytchcode) ---
    GMAIL_USER: str = os.getenv("GMAIL_USER", "me")
    GMAIL_MAX_EMAILS: int = int(os.getenv("GMAIL_MAX_EMAILS", "10"))

    # --- Notion ---
    NOTION_LOG_DATABASE_ID: str = os.getenv("NOTION_LOG_DATABASE_ID", "")
    NOTION_API_KEY: str = os.getenv("NOTION_API_KEY", "")
    # Keep backward compat
    NOTION_KB_DATABASE_ID: str = os.getenv(
        "NOTION_KB_DATABASE_ID",
        os.getenv("NOTION_LOG_DATABASE_ID", "")
    )

    # --- Slack ---
    SLACK_BOT_TOKEN: str = os.getenv("SLACK_BOT_TOKEN", "")
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    SLACK_CHANNEL: str = os.getenv("SLACK_CHANNEL", "#weather-alerts")

    # --- Resend ---
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
    RESEND_TO_EMAIL: str = os.getenv("RESEND_TO_EMAIL", "")

    # --- Jira ---
    JIRA_PROJECT_KEY: str = os.getenv("JIRA_PROJECT_KEY", "CCS")
    JIRA_DOMAIN: str = os.getenv("JIRA_DOMAIN", "")
    JIRA_EMAIL: str = os.getenv("JIRA_EMAIL", "")
    JIRA_API_TOKEN: str = os.getenv("JIRA_API_TOKEN", "")

    # --- GitHub ---
    GITHUB_OWNER: str = os.getenv("GITHUB_OWNER", "")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")

    # --- Agent Settings ---
    MAX_EMAILS_PER_RUN: int = int(os.getenv("MAX_EMAILS_PER_RUN", "10"))
    SUPPORT_LABEL: str = os.getenv("SUPPORT_LABEL", "support")

    @classmethod
    def validate(cls) -> list[str]:
        """Return a list of missing required config keys."""
        required = {
            "GOOGLE_API_KEY":      cls.GOOGLE_API_KEY,
            "OPENWEATHER_API_KEY": cls.OPENWEATHER_API_KEY,
        }
        return [k for k, v in required.items() if not v]
