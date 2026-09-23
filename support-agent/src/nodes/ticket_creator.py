"""
Ticket Creator Node — Jira Integration via Swytchcode.

Creates a Jira issue for the support request. Uses Swytchcode's
idempotency feature to prevent duplicate tickets on retries.
"""
from swytchcode_runtime import exec as swy_exec
from src.config import Config

PRIORITY_MAP = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Highest",
}


def run(state: dict) -> dict:
    """
    Create a Jira support ticket for the customer issue.

    Swytchcode tools used:
        - jira.issue.create  (write — idempotency enabled)

    Swytchcode features demonstrated:
        - Idempotency: prevents duplicate ticket creation on retry
        - Policy engine: rate-limited to 10 tickets/hour via policies.json
        - Retries: automatic retry with backoff on transient failures
    """
    log = list(state.get("execution_log", []))
    priority = state.get("priority", "medium")
    jira_priority = PRIORITY_MAP.get(priority, "Medium")

    log.append(f"🎫 [Jira] Creating ticket (priority: {jira_priority})...")

    try:
        # Build description with full context
        description_parts = [
            f"*Customer:* {state.get('email_from', 'Unknown')}",
            f"*Sentiment:* {state.get('sentiment', 'neutral')}",
            f"*Category:* {state.get('issue_category', 'unknown')}",
            "",
            "*Customer Message:*",
            state.get("email_body", "(no body)")[:2000],
        ]

        # Add GitHub issue link if available
        if state.get("github_issue_url"):
            description_parts.extend([
                "",
                f"*Related GitHub Issue:* {state['github_issue_url']}",
            ])

        # Add KB search results if any
        if state.get("kb_results"):
            description_parts.append("")
            description_parts.append("*KB Articles Found:*")
            for article in state["kb_results"][:3]:
                description_parts.append(f"- [{article.get('title', 'Untitled')}]({article.get('url', '')})")

        ticket_key = None
        ticket_url = None

        # 1. Try Swytchcode tool first
        try:
            result = swy_exec("jira.api.issue.create", {
                "body": {
                    "fields": {
                        "project": {"key": Config.JIRA_PROJECT_KEY},
                        "summary": f"[Support] {state.get('email_subject', 'Customer Issue')}",
                        "description": "\n".join(description_parts),
                        "issuetype": {"name": "Bug"},
                        "priority": {"name": jira_priority},
                    }
                }
            })
            res_data = result.get("data", result) if isinstance(result, dict) else {}
            if isinstance(res_data, dict) and res_data.get("key"):
                ticket_key = res_data["key"]
                ticket_url = f"https://{Config.JIRA_DOMAIN}/browse/{ticket_key}"
        except Exception as swy_err:
            log.append(f"ℹ️  [Jira] Swytchcode attempt notice: {swy_err}")

        # 2. Fall back to Jira REST API if needed
        if not ticket_key and Config.JIRA_API_TOKEN and Config.JIRA_EMAIL and Config.JIRA_DOMAIN:
            import requests
            import base64
            auth_str = f"{Config.JIRA_EMAIL}:{Config.JIRA_API_TOKEN}"
            auth_b64 = base64.b64encode(auth_str.encode()).decode()
            resp = requests.post(
                f"https://{Config.JIRA_DOMAIN}/rest/api/2/issue",
                headers={
                    "Authorization": f"Basic {auth_b64}",
                    "Content-Type": "application/json",
                },
                json={
                    "fields": {
                        "project": {"key": Config.JIRA_PROJECT_KEY},
                        "summary": f"[Support] {state.get('email_subject', 'Customer Issue')}",
                        "description": "\n".join(description_parts),
                        "issuetype": {"name": "Bug"},
                        "priority": {"name": jira_priority},
                    }
                },
                timeout=10,
            )
            if resp.status_code in (200, 201):
                ticket_data = resp.json()
                ticket_key = ticket_data.get("key", "UNKNOWN")
                ticket_url = f"https://{Config.JIRA_DOMAIN}/browse/{ticket_key}"

        if ticket_key:
            log.append(f"✅ [Jira] Created ticket: {ticket_key}")
        else:
            log.append("⚠️  [Jira] Ticket could not be created")

        return {
            **state,
            "jira_ticket_id": ticket_key,
            "jira_ticket_url": ticket_url,
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Jira] Ticket creation error: {e}")
        return {
            **state,
            "jira_ticket_id": None,
            "jira_ticket_url": None,
            "execution_log": log,
        }
