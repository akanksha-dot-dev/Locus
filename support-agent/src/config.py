"""
Configuration module for the AI Customer Support Knowledge Agent.
Loads environment variables and provides typed access to all settings.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Centralized configuration loaded from environment variables."""

    # --- LLM ---
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-3.6-flash")

    # --- Notion ---
    NOTION_KB_DATABASE_ID: str = os.getenv("NOTION_KB_DATABASE_ID", "")
    NOTION_API_KEY: str = os.getenv("NOTION_API_KEY", "")

    # --- Jira ---
    JIRA_PROJECT_KEY: str = os.getenv("JIRA_PROJECT_KEY", "CCS")
    JIRA_DOMAIN: str = os.getenv("JIRA_DOMAIN", "")
    JIRA_EMAIL: str = os.getenv("JIRA_EMAIL", "")
    JIRA_API_TOKEN: str = os.getenv("JIRA_API_TOKEN", "")

    # --- GitHub ---
    GITHUB_OWNER: str = os.getenv("GITHUB_OWNER", "iakankshaa")
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "support-kb-gaps")

    # --- Resend ---
    RESEND_FROM_EMAIL: str = os.getenv("RESEND_FROM_EMAIL", "support@yourdomain.com")

    # --- Agent ---
    SUPPORT_LABEL: str = os.getenv("SUPPORT_LABEL", "support")
    MAX_EMAILS_PER_RUN: int = int(os.getenv("MAX_EMAILS_PER_RUN", "5"))

    @classmethod
    def validate(cls) -> list[str]:
        """Return a list of missing required config keys."""
        required = {
            "GOOGLE_API_KEY": cls.GOOGLE_API_KEY,
            "NOTION_KB_DATABASE_ID": cls.NOTION_KB_DATABASE_ID,
            "GITHUB_OWNER": cls.GITHUB_OWNER,
        }
        return [k for k, v in required.items() if not v]
