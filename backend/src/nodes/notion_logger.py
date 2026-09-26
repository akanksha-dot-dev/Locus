"""
Notion Logger Node — Notion Integration via Swytchcode.

Creates a daily intelligence log entry in Notion with:
  - Weather snapshot
  - Gmail events summary
  - AI recommendations
  - Risk assessment

Swytchcode tools: notion.pages.create
Fallback: Direct Notion REST API
"""
import requests
from datetime import datetime
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False


def _get_title_property_name(database_id: str) -> str:
    """Detect the title property name of the Notion database dynamically."""
    if not Config.NOTION_API_KEY or not database_id:
        return "Name"
    try:
        resp = requests.get(
            f"https://api.notion.com/v1/databases/{database_id}",
            headers={
                "Authorization": f"Bearer {Config.NOTION_API_KEY}",
                "Notion-Version": "2022-06-28",
            },
            timeout=8,
        )
        if resp.status_code == 200:
            props = resp.json().get("properties", {})
            for k, v in props.items():
                if v.get("type") == "title":
                    return k
    except Exception:
        pass
    return "Date & Time Recorded"


def _build_notion_page(state: dict) -> dict:
    """Build the Notion page properties and content (full 7-integration day plan)."""
    now = datetime.now()
    city = state.get("city", "Unknown City")
    condition = state.get("weather_condition", "Unknown")
    temp = state.get("temperature_c", 0)
    score = state.get("weather_score", 50)
    risk = state.get("risk_level", "medium").upper()
    summary = state.get("ai_summary", "")
    recommendations = state.get("recommendations", [])
    outfit = state.get("outfit_suggestion", "")
    alerts = state.get("weather_alerts", [])
    go_to_office = state.get("go_to_office", "?").upper()
    office_reason = state.get("office_reason", "")
    prod_hours = state.get("estimated_productive_hours", 0)

    risk_emojis = {"LOW": "🟢", "MEDIUM": "🟡", "HIGH": "🔴", "CRITICAL": "⛔"}
    risk_emoji = risk_emojis.get(risk, "🟡")
    office_emojis = {
        "OFFICE": "🏢",
        "WFH": "🏠",
        "HYBRID": "🔀",
        "YES": "🏢",
        "NO": "🏠",
    }
    office_emoji = office_emojis.get(go_to_office, "❓")

    db_id = Config.NOTION_KB_DATABASE_ID or Config.NOTION_LOG_DATABASE_ID
    title_prop = _get_title_property_name(db_id)

    title = f"📅 Day Plan — {city} — {now.strftime('%b %d, %Y')}"

    properties = {
        title_prop: {"title": [{"text": {"content": title}}]}
    }

    # Weather section
    alerts_text = "\n".join(f"  ⚠️ {a}" for a in alerts) if alerts else "  None"

    # Gmail events
    events = state.get("gmail_events", [])
    events_text = "\n".join(
        f"  • {e.get('subject', 'Event')} — {e.get('from', '')}" for e in events[:6]
    ) or "  No upcoming events found"

    # Jira section
    jira_tickets = state.get("jira_tickets") or state.get("jira_issues", [])
    if state.get("jira_issue_lines"):
        jira_lines = "\n".join(state.get("jira_issue_lines", []))
    elif jira_tickets:
        jira_lines = "\n".join(
            f"  [{t.get('key')}] {t.get('summary')} ({t.get('priority', 'Normal')}, ~{t.get('estimated_hours', 2)}h)"
            for t in jira_tickets[:8]
        )
    else:
        jira_lines = "  No Jira issues"

    # GitHub section
    prs = state.get("github_prs", [])
    prs_text = "\n".join(
        f"  PR #{pr.get('number')} [{pr.get('days_old', 0)}d old]: {pr.get('title', '')}"
        for pr in prs[:8]
    ) or "  No open PRs"

    gh_issues = state.get("github_issues_open", [])
    gh_text = "\n".join(
        f"  Issue #{i.get('number')}: {i.get('title', '')}" for i in gh_issues[:5]
    ) or "  No assigned issues"

    # Day plan timeline
    timeline = state.get("day_plan_timeline", [])
    formatted_timeline = []
    for t in timeline:
        if isinstance(t, dict):
            time_str = t.get("time", "")
            act_str = t.get("activity", "")
            formatted_timeline.append(f"  {time_str}: {act_str}".strip())
        else:
            formatted_timeline.append(f"  {t}")
    timeline_text = "\n".join(formatted_timeline) or "  Not generated"

    # Recommendations
    recs_text = "\n".join(f"  • {r}" for r in recommendations)

    content_body = f"""
=== 🌤️ WEATHER SNAPSHOT ===
City: {city}
Conditions: {condition} at {temp:.1f}°C
Weather Score: {score}/100  |  Risk: {risk_emoji} {risk}
Forecast: {state.get("forecast_summary", "N/A")}
Alerts:
{alerts_text}

=== {office_emoji} OFFICE DECISION ===
Go to Office: {go_to_office}
Reason: {office_reason}
Estimated Productive Hours: ~{prod_hours}h

=== 🧠 AI DAY BRIEFING ===
{summary}

=== ⏰ DAY PLAN TIMELINE ===
{timeline_text}

=== ✅ RECOMMENDATIONS ===
{recs_text}

=== 👔 OUTFIT ===
{outfit}

=== 📬 GMAIL EVENTS ===
{events_text}

=== 📋 JIRA WORKLOAD ===
{state.get("jira_summary", "")}
{jira_lines}

=== 🐙 GITHUB WORKLOAD ===
{state.get("github_summary", "")}
PRs:
{prs_text}
Issues:
{gh_text}

=== META ===
Generated: {now.isoformat()}
Agent: Locus Day Planner v2.0 | Integrations: OpenWeather × Gmail × Jira × GitHub × Notion × Slack × Resend
""".strip()

    # Notion API limit: each rich_text content block must be ≤ 2000 chars
    # Split content into multiple paragraph blocks of ≤ 1900 chars each
    CHUNK = 1900
    blocks = []
    for i in range(0, len(content_body), CHUNK):
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [
                    {"type": "text", "text": {"content": content_body[i:i + CHUNK]}}
                ]
            }
        })

    return {
        "parent": {"database_id": Config.NOTION_KB_DATABASE_ID or Config.NOTION_LOG_DATABASE_ID},
        "properties": properties,
        "children": blocks,
    }


def _log_via_swytchcode(page_data: dict, log: list) -> tuple[str | None, str | None]:
    """Try creating the page via Swytchcode."""
    if not _HAS_SWYTCHCODE:
        return None, None
    try:
        result = swy_exec("notion.pages.create", {"body": page_data})
        data = result.get("data", result) if isinstance(result, dict) else {}
        page_id = data.get("id")
        page_url = data.get("url")
        if page_id:
            log.append(f"✅ [Notion/Swytchcode] Page created: {page_url or page_id}")
            return page_id, page_url
    except Exception as e:
        log.append(f"ℹ️  [Notion/Swytchcode] {e}")
    return None, None


def _log_via_rest(page_data: dict, log: list) -> tuple[str | None, str | None]:
    """Create Notion page via direct REST API."""
    if not Config.NOTION_API_KEY:
        log.append("⚠️ [Notion] No API key — skipping REST fallback")
        return None, None

    try:
        resp = requests.post(
            "https://api.notion.com/v1/pages",
            headers={
                "Authorization": f"Bearer {Config.NOTION_API_KEY}",
                "Notion-Version": "2022-06-28",
                "Content-Type": "application/json",
            },
            json=page_data,
            timeout=15,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            page_id = data.get("id")
            page_url = data.get("url")
            log.append(f"✅ [Notion/REST] Page created: {page_url or page_id}")
            return page_id, page_url
        else:
            log.append(f"⚠️ [Notion/REST] {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.append(f"❌ [Notion/REST] Error: {e}")
    return None, None


def run(state: dict) -> dict:
    """
    Log daily weather briefing and AI recommendations to Notion.

    Swytchcode tools used: notion.pages.create
    Fallback: Direct Notion REST API
    """
    log = list(state.get("execution_log", []))
    log.append("📓 [Notion] Logging daily briefing...")

    db_id = Config.NOTION_KB_DATABASE_ID or Config.NOTION_LOG_DATABASE_ID
    if not db_id:
        log.append("⚠️ [Notion] No database ID configured — skipping log")
        return {**state, "notion_logged": False, "execution_log": log}

    page_data = _build_notion_page(state)

    # ── Try Swytchcode first ─────────────────────────────────────────
    page_id, page_url = _log_via_swytchcode(page_data, log)

    # ── Fallback to REST ─────────────────────────────────────────────
    if not page_id:
        page_id, page_url = _log_via_rest(page_data, log)

    if page_id:
        log.append(f"✅ [Notion] Daily briefing logged successfully")
        return {
            **state,
            "notion_page_id": page_id,
            "notion_page_url": page_url,
            "notion_logged": True,
            "execution_log": log,
        }
    else:
        log.append("⚠️ [Notion] Could not create page — continuing pipeline")
        return {**state, "notion_logged": False, "execution_log": log}
