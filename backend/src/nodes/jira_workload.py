"""
Jira Workload Node — Jira Integration via Swytchcode + REST fallback.

Fetches the user's open/in-progress Jira issues to build a workload
picture for the Day Planner. The AI Advisor uses this to estimate
how many hours of focused work the user needs to do today.

Swytchcode tools: jira.issues.search  (JQL-based search)
Fallback: Direct Jira Cloud REST API (Basic Auth with email + token)

Track 5 — AI Real World Agent | Build with Swytchcode
"""
import requests
from base64 import b64encode
from datetime import datetime
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False

# Estimated hours per Jira priority
_PRIORITY_HOURS = {
    "Highest": 4.0,
    "High":    3.0,
    "Medium":  2.0,
    "Low":     1.0,
    "Lowest":  0.5,
}

_STATUS_EMOJIS = {
    "To Do":        "📋",
    "In Progress":  "🔨",
    "In Review":    "👀",
    "Blocked":      "🚫",
    "Done":         "✅",
}


def _basic_auth_header() -> str:
    """Build a Basic Auth header for Jira Cloud REST API."""
    token = f"{Config.JIRA_EMAIL}:{Config.JIRA_API_TOKEN}"
    return "Basic " + b64encode(token.encode()).decode()


def _fetch_via_rest(log: list) -> list[dict]:
    """Fetch open issues via Jira Cloud REST API (using Atlassian Cloud /search/jql)."""
    if not all([Config.JIRA_DOMAIN, Config.JIRA_EMAIL, Config.JIRA_API_TOKEN]):
        log.append("⚠️ [Jira/REST] Missing JIRA_DOMAIN, JIRA_EMAIL or JIRA_API_TOKEN — skipping")
        return []

    project_filter = f"project = '{Config.JIRA_PROJECT_KEY}'" if Config.JIRA_PROJECT_KEY else ""
    if project_filter:
        jql = f"({project_filter} OR assignee = currentUser()) AND statusCategory != Done ORDER BY priority DESC"
    else:
        jql = "assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC"

    headers = {
        "Authorization": _basic_auth_header(),
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    payload = {
        "jql": jql,
        "maxResults": 20,
        "fields": ["summary", "priority", "status", "issuetype", "updated", "timeestimate", "assignee"]
    }

    # 1. Try modern Atlassian Cloud /search/jql endpoint
    url_jql = f"https://{Config.JIRA_DOMAIN}/rest/api/3/search/jql"
    try:
        resp = requests.post(url_jql, headers=headers, json=payload, timeout=15)
        if resp.status_code == 200:
            data = resp.json()
            issues = data.get("issues", [])
            log.append(f"✅ [Jira/REST] Found {len(issues)} open issues in {Config.JIRA_DOMAIN}")
            return issues
        elif resp.status_code == 401:
            log.append("⚠️ [Jira/REST] Authentication failed — check JIRA_EMAIL and JIRA_API_TOKEN")
            return []
        elif resp.status_code == 403:
            log.append("⚠️ [Jira/REST] Permission denied — check Jira project access")
            return []
        else:
            log.append(f"ℹ️  [Jira/REST] /search/jql returned HTTP {resp.status_code}, trying fallback")
    except requests.Timeout:
        log.append("⚠️ [Jira/REST] Request timed out")
        return []
    except Exception as e:
        log.append(f"ℹ️  [Jira/REST] {e}, trying fallback")

    # 2. Fallback to POST /rest/api/3/search or /rest/api/2/search
    for endpoint in ("/rest/api/3/search", "/rest/api/2/search"):
        try:
            resp = requests.post(f"https://{Config.JIRA_DOMAIN}{endpoint}", headers=headers, json=payload, timeout=10)
            if resp.status_code == 200:
                issues = resp.json().get("issues", [])
                log.append(f"✅ [Jira/REST] Found {len(issues)} open issues via {endpoint}")
                return issues
        except Exception:
            continue

    return []


def _fetch_via_swytchcode(log: list) -> list[dict]:
    """Fetch open issues via Swytchcode Jira integration."""
    if not _HAS_SWYTCHCODE:
        return []
    try:
        jql = "assignee = currentUser() AND statusCategory != Done ORDER BY priority DESC"
        result = swy_exec("jira.issues.search", {
            "body": {"jql": jql, "maxResults": 20}
        })
        data = result.get("data", result) if isinstance(result, dict) else {}
        issues = data.get("issues", [])
        log.append(f"✅ [Jira/Swytchcode] Found {len(issues)} open issues")
        return issues
    except Exception as e:
        log.append(f"ℹ️  [Jira/Swytchcode] {e}")
        return []


def _parse_issues(raw_issues: list) -> list[dict]:
    """Parse raw Jira API issues into clean dicts."""
    parsed = []
    for issue in raw_issues:
        fields = issue.get("fields", {})
        key = issue.get("key", "")
        summary = fields.get("summary", "Untitled")
        priority_data = fields.get("priority") or {}
        priority = priority_data.get("name", "Medium") if isinstance(priority_data, dict) else "Medium"
        status_data = fields.get("status") or {}
        status = (
            status_data.get("name", "To Do")
            if isinstance(status_data, dict) else "To Do"
        )
        issuetype_data = fields.get("issuetype") or {}
        issue_type = (
            issuetype_data.get("name", "Task")
            if isinstance(issuetype_data, dict) else "Task"
        )

        # Time estimate in seconds → hours
        time_est_s = fields.get("timeestimate")
        if time_est_s and isinstance(time_est_s, (int, float)) and time_est_s > 0:
            estimated_hours = round(time_est_s / 3600, 1)
        else:
            estimated_hours = _PRIORITY_HOURS.get(priority, 2.0)

        parsed.append({
            "key": key,
            "summary": summary,
            "priority": priority,
            "status": status,
            "issue_type": issue_type,
            "estimated_hours": estimated_hours,
        })
    return parsed


def _build_demo_issues() -> list[dict]:
    """Demo workload when Jira is not configured or returns nothing."""
    return [
        {"key": "PROJ-101", "summary": "Fix login bug on mobile",        "priority": "High",   "status": "In Progress", "issue_type": "Bug",  "estimated_hours": 3.0},
        {"key": "PROJ-102", "summary": "Review PR for payment module",    "priority": "High",   "status": "In Review",   "issue_type": "Task", "estimated_hours": 2.0},
        {"key": "PROJ-103", "summary": "Write unit tests for auth flow",  "priority": "Medium", "status": "To Do",       "issue_type": "Task", "estimated_hours": 2.0},
        {"key": "PROJ-104", "summary": "Update API documentation",        "priority": "Low",    "status": "To Do",       "issue_type": "Task", "estimated_hours": 1.0},
    ]


def run(state: dict) -> dict:
    """
    Fetch open Jira issues assigned to the current user.

    Produces:
        - jira_issues        : list of parsed issue dicts
        - jira_total_hours   : estimated total work hours today
        - jira_summary       : human-readable work summary
        - jira_high_priority : count of High/Highest priority items
    """
    log = list(state.get("execution_log", []))
    log.append("📋 [Jira] Fetching your open tickets and workload...")

    raw_issues: list[dict] = []

    # ── 1. Try Swytchcode ────────────────────────────────────────────
    raw_issues = _fetch_via_swytchcode(log)

    # ── 2. Fall back to REST API ─────────────────────────────────────
    if not raw_issues:
        raw_issues = _fetch_via_rest(log)

    # ── 3. Parse issues ──────────────────────────────────────────────
    if raw_issues:
        issues = _parse_issues(raw_issues)
    else:
        log.append("ℹ️  [Jira] No live data — using demo workload for Day Planner")
        issues = _build_demo_issues()

    # ── 4. Compute metrics ───────────────────────────────────────────
    total_hours = round(sum(i["estimated_hours"] for i in issues), 1)
    high_priority_count = sum(1 for i in issues if i["priority"] in ("High", "Highest"))
    in_progress = [i for i in issues if i["status"] == "In Progress"]
    blocked = [i for i in issues if i["status"] == "Blocked"]

    # ── 5. Build human-readable summary ─────────────────────────────
    lines = [f"  {_STATUS_EMOJIS.get(i['status'], '📌')} [{i['key']}] {i['summary']} ({i['priority']}, ~{i['estimated_hours']}h)" for i in issues]
    summary = (
        f"📋 {len(issues)} open Jira tickets · ~{total_hours}h total work · "
        f"{high_priority_count} high-priority"
    )
    if in_progress:
        summary += f" · {len(in_progress)} in-progress"
    if blocked:
        summary += f" · ⚠️ {len(blocked)} BLOCKED"

    log.append(f"✅ [Jira] {summary}")

    return {
        **state,
        "jira_issues":        issues,
        "jira_total_hours":   total_hours,
        "jira_summary":       summary,
        "jira_issue_lines":   lines,
        "jira_high_priority": high_priority_count,
        "jira_blocked_count": len(blocked),
        "execution_log":      log,
    }
