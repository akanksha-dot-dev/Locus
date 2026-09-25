"""
WeatherWise AI Life Agent — Streamlit Dashboard v2.0

Interactive demo dashboard for the Swytchcode Hackathon.
Showcases the full 8-node agentic workflow with live visualization:
  - Natural language input & demo scenarios
  - Real-time WebSocket telemetry feed (ws://localhost:8000/ws)
  - Interactive hour-by-hour schedule editor with reordering, task toggles & slider
  - One-click exports (Markdown briefing, pure-Python RFC 5545 ICS, structured JSON)
  - Weather visualization & outfit suggestions
  - Jira & GitHub developer workload analysis
  - Gmail commitments & outdoor plan detection
  - Multi-service integration status (Notion, Slack, Resend)

Track 5 — AI Real World Agent
"""
import streamlit as st
import streamlit.components.v1 as components
import requests
import json
import re
from datetime import datetime, date

# ── Page Config ────────────────────────────────────────────────────
st.set_page_config(
    page_title="SwytchAgent Day Planner — WeatherWise v2.0",
    page_icon="🌦️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── API Base URL ───────────────────────────────────────────────────
API_BASE = "http://localhost:8000"

# ── Custom CSS — Theme-Aware (Light & Dark Mode) ───────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap');

    /* ── Theme Variables ── */
    :root {
        --ww-bg-main: #f5f6fa;
        --ww-surface: #ffffff;
        --ww-border: #e8eaf0;
        --ww-text-main: #111827;
        --ww-text-sub: #374151;
        --ww-text-muted: #6b7280;
        --ww-primary: #6366f1;
        --ww-primary-hover: #4f46e5;
        --ww-card-bg: #ffffff;
        --ww-sidebar-bg: #ffffff;
        --ww-card-shadow: 0 2px 12px rgba(99, 102, 241, 0.05);
    }

    @media (prefers-color-scheme: dark) {
        :root {
            --ww-bg-main: #0f172a;
            --ww-surface: #1e293b;
            --ww-border: #334155;
            --ww-text-main: #f8fafc;
            --ww-text-sub: #cbd5e1;
            --ww-text-muted: #94a3b8;
            --ww-primary: #818cf8;
            --ww-primary-hover: #6366f1;
            --ww-card-bg: #1e293b;
            --ww-sidebar-bg: #0f172a;
            --ww-card-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        }
    }

    [data-theme="dark"], .stApp[data-theme="dark"] {
        --ww-bg-main: #0f172a;
        --ww-surface: #1e293b;
        --ww-border: #334155;
        --ww-text-main: #f8fafc;
        --ww-text-sub: #cbd5e1;
        --ww-text-muted: #94a3b8;
        --ww-primary: #818cf8;
        --ww-primary-hover: #6366f1;
        --ww-card-bg: #1e293b;
        --ww-sidebar-bg: #0f172a;
        --ww-card-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
    }

    /* ── Global Typography ── */
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    /* ── Sidebar ── */
    section[data-testid="stSidebar"] {
        background: var(--ww-sidebar-bg, #ffffff) !important;
        border-right: 1px solid var(--ww-border, #e8eaf0) !important;
    }
    section[data-testid="stSidebar"] .stMarkdown p,
    section[data-testid="stSidebar"] label {
        color: var(--ww-text-sub, #374151) !important;
    }

    /* ── Hero Banner ── */
    .hero-card {
        background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%);
        border-radius: 24px;
        padding: 34px 40px;
        color: #ffffff;
        margin-bottom: 24px;
        box-shadow: 0 12px 40px rgba(79, 70, 229, 0.30);
        position: relative;
        overflow: hidden;
    }
    .hero-card::before {
        content: '';
        position: absolute;
        top: -60px; right: -60px;
        width: 220px; height: 220px;
        background: rgba(255,255,255,0.08);
        border-radius: 50%;
    }
    .hero-title { font-size: 2.2rem; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
    .hero-sub { font-size: 0.95rem; opacity: 0.92; margin: 10px 0 0; line-height: 1.6; }
    .hero-flow span {
        background: rgba(255,255,255,0.18);
        border-radius: 20px;
        padding: 3px 10px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.3px;
        margin: 2px;
        display: inline-block;
    }

    /* ── Cards & Surfaces ── */
    .surface-card {
        background: var(--ww-card-bg, #ffffff);
        border: 1px solid var(--ww-border, #e8eaf0);
        border-radius: 16px;
        padding: 20px 22px;
        margin-bottom: 14px;
        box-shadow: var(--ww-card-shadow);
        transition: box-shadow 0.2s ease, border-color 0.2s ease;
    }
    .surface-card:hover {
        border-color: var(--ww-primary, #6366f1);
    }

    /* ── Weather Card ── */
    .weather-card {
        border-radius: 20px;
        padding: 28px 24px;
        color: #ffffff;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    }
    .weather-temp { font-size: 3.5rem; font-weight: 800; letter-spacing: -2px; }
    .weather-cond { font-size: 1rem; opacity: 0.92; font-weight: 500; }

    /* ── Step / Timeline Card ── */
    .step-card {
        background: var(--ww-card-bg, #ffffff);
        border: 1px solid var(--ww-border, #e8eaf0);
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 10px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.04);
        transition: border-color 0.2s;
    }
    .step-card:hover { border-color: var(--ww-primary, #a5b4fc); }
    .step-active { border-color: #6366f1; border-left: 4px solid #6366f1; }
    .step-done   { border-color: #10b981; border-left: 4px solid #10b981; }

    /* ── Recommendation Chip ── */
    .rec-chip {
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.25);
        border-radius: 12px;
        padding: 11px 16px;
        margin-bottom: 8px;
        font-size: 14px;
        color: var(--ww-text-main, #3730a3);
        line-height: 1.5;
    }

    /* ── Alert Box ── */
    .alert-box {
        background: rgba(239, 68, 68, 0.08);
        border-left: 4px solid #ef4444;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 8px;
        color: #b91c1c;
        font-size: 14px;
    }

    /* ── Integration Status Badges ── */
    .int-ok   { color: #059669; font-weight: 600; }
    .int-warn { color: #d97706; font-weight: 600; }

    /* ── Work Location Badges ── */
    .badge-office {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.35);
        padding: 4px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 12px;
        display: inline-block;
    }
    .badge-wfh {
        background: rgba(14, 165, 233, 0.15);
        color: #0284c7;
        border: 1px solid rgba(14, 165, 233, 0.35);
        padding: 4px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 12px;
        display: inline-block;
    }
    .badge-hybrid {
        background: rgba(139, 92, 246, 0.15);
        color: #7c3aed;
        border: 1px solid rgba(139, 92, 246, 0.35);
        padding: 4px 14px;
        border-radius: 20px;
        font-weight: 700;
        font-size: 12px;
        display: inline-block;
    }

    /* ── Task Completion Badges ── */
    .badge-completed {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.3);
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        display: inline-block;
    }
    .badge-pending {
        background: rgba(99, 102, 241, 0.12);
        color: #4f46e5;
        border: 1px solid rgba(99, 102, 241, 0.25);
        padding: 2px 8px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 700;
        display: inline-block;
    }

    /* ── Risk / Priority Badges ── */
    .badge-low     { background: #d1fae5; color: #065f46; padding: 3px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
    .badge-medium  { background: #fef3c7; color: #92400e; padding: 3px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
    .badge-high    { background: #fee2e2; color: #991b1b; padding: 3px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }
    .badge-critical{ background: #ede9fe; color: #5b21b6; padding: 3px 12px; border-radius: 20px; font-weight: 700; font-size: 12px; }

    /* ── Event Cards ── */
    .event-card {
        background: var(--ww-card-bg, #ffffff);
        border: 1px solid var(--ww-border, #e8eaf0);
        border-radius: 12px;
        padding: 13px 16px;
        margin-bottom: 9px;
        border-left: 4px solid #6366f1;
        box-shadow: 0 1px 6px rgba(0,0,0,0.04);
    }
    .event-outdoor { border-left-color: #10b981; }
    .event-travel  { border-left-color: #f59e0b; }

    /* ── Streamlit native widget styling ── */
    .stTextArea textarea, .stTextInput input {
        background: var(--ww-surface, #ffffff) !important;
        border: 1.5px solid var(--ww-border, #d1d5db) !important;
        border-radius: 10px !important;
        color: var(--ww-text-main, #1f2937) !important;
        font-family: 'Inter', sans-serif;
    }
    .stTextArea textarea:focus, .stTextInput input:focus {
        border-color: #6366f1 !important;
        box-shadow: 0 0 0 3px rgba(99,102,241,0.15) !important;
    }
    .stSelectbox [data-baseweb="select"] {
        border-radius: 10px !important;
    }
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
        border: none !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        letter-spacing: 0.3px;
        box-shadow: 0 4px 14px rgba(99,102,241,0.30) !important;
        transition: transform 0.15s, box-shadow 0.15s;
    }
    .stButton > button[kind="primary"]:hover {
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(99,102,241,0.38) !important;
    }
    .stButton > button[kind="secondary"] {
        border-radius: 10px !important;
        font-weight: 600 !important;
    }

    /* ── Metrics ── */
    [data-testid="metric-container"] {
        background: var(--ww-card-bg, #ffffff);
        border: 1px solid var(--ww-border, #e8eaf0);
        border-radius: 14px;
        padding: 16px 18px;
        box-shadow: var(--ww-card-shadow);
    }
    [data-testid="metric-container"] label {
        color: var(--ww-text-muted, #6b7280) !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    [data-testid="metric-container"] [data-testid="metric-value"] {
        color: var(--ww-text-main, #111827) !important;
        font-weight: 800 !important;
        font-size: 1.6rem !important;
    }

    /* ── Tabs ── */
    .stTabs [role="tab"] {
        font-weight: 600;
        border-radius: 8px 8px 0 0;
    }
    .stTabs [role="tab"][aria-selected="true"] {
        color: #4f46e5 !important;
        border-bottom-color: #6366f1 !important;
    }

    /* ── Expander ── */
    .stExpander {
        background: var(--ww-card-bg, #ffffff);
        border: 1px solid var(--ww-border, #e8eaf0) !important;
        border-radius: 12px !important;
        box-shadow: 0 1px 6px rgba(0,0,0,0.03);
    }

    /* ── Divider ── */
    hr { border-color: var(--ww-border, #e8eaf0) !important; }

    /* ── Section Headers ── */
    h2, h3 { color: var(--ww-text-main, #111827) !important; letter-spacing: -0.3px; }

    /* ── Footer ── */
    .app-footer {
        text-align: center;
        color: var(--ww-text-muted, #9ca3af);
        font-size: 13px;
        padding: 20px 0 8px;
        border-top: 1px solid var(--ww-border, #e8eaf0);
        margin-top: 8px;
    }
    .app-footer strong { color: #6366f1; }
</style>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════
#  HELPER FUNCTIONS: TIMELINE NORMALIZATION & EXPORTS
# ══════════════════════════════════════════════════════════════════════

def normalize_timeline_item(item, idx: int) -> dict:
    """
    Safely parse both dictionary and string timeline entries into a
    structured dictionary block: {id, time, activity, location, context, completed}.
    Avoids AttributeError: 'str' object has no attribute 'get'.
    """
    if isinstance(item, dict):
        time_val = item.get("time") or item.get("hour") or f"Slot {idx + 1}"
        act_val = item.get("activity") or item.get("title") or item.get("desc") or "Planned Task"
        loc_val = item.get("location") or ("Office" if "office" in act_val.lower() else ("Home" if "home" in act_val.lower() else "Workplace"))
        ctx_val = item.get("context") or item.get("notes") or ""
        done_val = bool(item.get("completed", False))
        block_id = item.get("id") or f"slot_{idx}_{abs(hash(str(time_val) + str(act_val))) % 100000}"
        return {
            "id": block_id,
            "time": str(time_val),
            "activity": str(act_val),
            "location": str(loc_val),
            "context": str(ctx_val),
            "completed": done_val,
        }
    elif isinstance(item, str):
        raw = item.strip()
        time_part = f"Slot {idx + 1}"
        act_part = raw

        # Match time format e.g. "07:00–08:00: Activity..." or "09:00 - 10:00: Activity" or "07:00: Activity"
        m = re.match(r"^(\d{1,2}:\d{2}(?:\s*(?:[^0-9a-zA-Z:\s]+|to)\s*\d{1,2}:\d{2})?)\s*:\s*(.*)$", raw)
        if m:
            time_part = m.group(1).strip()
            act_part = m.group(2).strip()
        elif ":" in raw:
            parts = re.split(r"(?<=\d{2})\s*:\s*", raw, maxsplit=1)
            if len(parts) == 2 and any(char.isdigit() for char in parts[0]):
                time_part = parts[0].strip()
                act_part = parts[1].strip()
            else:
                parts = raw.split(":", 1)
                time_part = parts[0].strip()
                act_part = parts[1].strip()

        # Extract parenthetical context if present
        ctx_part = ""
        if "(" in act_part and ")" in act_part:
            start_idx = act_part.find("(")
            end_idx = act_part.rfind(")")
            ctx_part = act_part[start_idx + 1:end_idx].strip()
            act_part = (act_part[:start_idx] + act_part[end_idx + 1:]).strip()

        # Infer location from text
        lower_act = act_part.lower()
        if "office" in lower_act:
            loc_part = "Office"
        elif "home" in lower_act or "remote" in lower_act:
            loc_part = "Home"
        elif "commute" in lower_act or "transit" in lower_act or "metro" in lower_act or "flight" in lower_act:
            loc_part = "Transit"
        elif "outdoor" in lower_act or "picnic" in lower_act or "walk" in lower_act or "park" in lower_act:
            loc_part = "Outdoor"
        else:
            loc_part = "Office/Home"

        block_id = f"slot_{idx}_{abs(hash(raw)) % 100000}"
        return {
            "id": block_id,
            "time": time_part,
            "activity": act_part,
            "location": loc_part,
            "context": ctx_part,
            "completed": False,
        }
    else:
        return {
            "id": f"slot_{idx}",
            "time": f"Slot {idx + 1}",
            "activity": str(item),
            "location": "Workplace",
            "context": "",
            "completed": False,
        }


def parse_timeline(raw_timeline: list) -> list:
    """Normalize full timeline list into structured schedule blocks."""
    if not raw_timeline:
        return [
            {"id": "slot_0", "time": "08:30–09:00", "activity": "Morning review & weather briefing", "location": "Home", "context": "Start day smoothly", "completed": False},
            {"id": "slot_1", "time": "09:00–12:30", "activity": "Deep focus on sprint tickets", "location": "Office/Home", "context": "Priority Jira tasks", "completed": False},
            {"id": "slot_2", "time": "12:30–13:30", "activity": "Lunch break & hydration", "location": "Indoor", "context": "Check forecast", "completed": False},
            {"id": "slot_3", "time": "13:30–16:00", "activity": "GitHub PR reviews & team sync", "location": "Office/Home", "context": "PR code reviews", "completed": False},
            {"id": "slot_4", "time": "16:00–17:30", "activity": "Wrap-up daily logs to Notion", "location": "Office/Home", "context": "Notion update", "completed": False},
        ]
    return [normalize_timeline_item(item, i) for i, item in enumerate(raw_timeline)]


def build_markdown_export(result: dict, schedule_blocks: list, productive_hours: float) -> str:
    """Generate a beautifully formatted Markdown briefing for the synthesized Day Plan."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    city = result.get("city", "City N/A")
    go_to = str(result.get("go_to_office", "undecided")).upper()
    office_reason = result.get("office_reason", "")
    temp = result.get("temperature_c", 0.0)
    feels = result.get("feels_like_c") if result.get("feels_like_c") is not None else temp
    cond = result.get("weather_condition", "N/A")
    score = result.get("weather_score", 0)

    lines = [
        "# 📅 SwytchAgent Day Planner — Synthesized Day Plan",
        f"**Generated:** {now_str}  |  **Location:** {city}  |  **Weather Score:** {score}/100",
        "",
        "---",
        "",
        f"## 🎯 Work Location Recommendation: `{go_to}`",
    ]
    if office_reason:
        lines.append(f"> 💡 **Reasoning:** {office_reason}")
    else:
        lines.append(f"> 💡 **Summary:** Conditions evaluated for commute and productivity.")
    lines.extend([
        "",
        f"- **Weather:** {cond} at {temp:.1f}°C (Feels like {feels:.1f}°C)",
        f"- **Allocated Productive Focus:** {productive_hours:.1f} hours",
        f"- **Dev Workload:** Jira: {result.get('jira_estimated_hours', 0.0):.1f}h  |  GitHub: {result.get('github_estimated_hours', 0.0):.1f}h",
        "",
        "---",
        "",
        "## 📅 Hour-by-Hour Schedule",
        "| Status | Time | Activity | Location | Context / Notes |",
        "|:---:|:---|:---|:---|:---|",
    ])

    for b in schedule_blocks:
        st_icon = "✅ Done" if b.get("completed") else "⏳ Scheduled"
        lines.append(f"| {st_icon} | {b.get('time', '')} | {b.get('activity', '')} | {b.get('location', '')} | {b.get('context', '')} |")

    lines.extend([
        "",
        "---",
        "",
        "## 💻 Engineering Workload Summary",
    ])

    jira_tickets = result.get("jira_tickets", [])
    if jira_tickets:
        lines.append(f"### 🎫 Jira Sprint Tickets ({len(jira_tickets)} tickets, ~{result.get('jira_estimated_hours', 0.0):.1f}h)")
        for t in jira_tickets:
            lines.append(f"- **`{t.get('key')}`**: {t.get('summary', '')} ({t.get('priority', 'Medium')} priority, ~{t.get('estimated_hours', 2.0)}h)")
    else:
        lines.append("No critical Jira tickets for today.")

    gh_prs = result.get("github_prs", [])
    if gh_prs:
        lines.append(f"\n### 🐙 GitHub Pull Requests ({len(gh_prs)} PRs, ~{result.get('github_estimated_hours', 0.0):.1f}h)")
        for pr in gh_prs:
            author = pr.get("author") or pr.get("user") or "dev"
            hours = pr.get("estimated_hours") or pr.get("est_hours") or pr.get("review_hours") or 1.0
            lines.append(f"- **PR #{pr.get('number')}**: {pr.get('title', '')} (by @{author}, ~{hours:.1f}h review)")

    recs = result.get("recommendations", [])
    if recs:
        lines.extend(["\n---", "\n## 📋 Smart Recommendations"])
        for r in recs:
            lines.append(f"- {r}")

    outfit = result.get("outfit_suggestion", "")
    if outfit:
        lines.extend(["\n---", f"\n## 👔 Outfit Suggestion\n{outfit}"])

    adjs = result.get("activity_adjustments", [])
    if adjs:
        lines.extend(["\n---", "\n## 🔄 Activity Adjustments"])
        for a in adjs:
            lines.append(f"- ⚠️ {a}")

    lines.extend([
        "\n---",
        "\n*Generated by SwytchAgent Day Planner (WeatherWise v2.0) · Track 5: AI Real World Agent*",
    ])
    return "\n".join(lines)


def build_ics_export(result: dict, schedule_blocks: list) -> str:
    """
    Generate standard RFC 5545 iCalendar (.ics) format in pure Python
    without external dependencies.
    """
    today_dt = datetime.now()
    d_str = today_dt.strftime("%Y%m%d")
    now_utc = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    city = result.get("city", "Office")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//SwytchAgent//WeatherWise Day Planner v2.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:Day Plan - {city} ({d_str})",
        "X-WR-TIMEZONE:UTC",
    ]

    for i, block in enumerate(schedule_blocks):
        t_str = block.get("time", "")
        # Parse start and end hours (e.g. "09:00–12:30")
        m = re.findall(r"(\d{1,2}):(\d{2})", t_str)
        if len(m) >= 2:
            sh, sm = int(m[0][0]), int(m[0][1])
            eh, em = int(m[1][0]), int(m[1][1])
        elif len(m) == 1:
            sh, sm = int(m[0][0]), int(m[0][1])
            eh, em = (sh + 1) % 24, sm
        else:
            sh, sm = (9 + i) % 24, 0
            eh, em = (sh + 1) % 24, 0

        dtstart = f"{d_str}T{sh:02d}{sm:02d}00"
        dtend = f"{d_str}T{eh:02d}{em:02d}00"

        raw_act = block.get("activity", "Scheduled Task")
        summary = raw_act.replace("\n", " ").replace(";", "\\;").replace(",", "\\,")
        raw_loc = block.get("location", city)
        location = raw_loc.replace("\n", " ").replace(";", "\\;")
        raw_ctx = block.get("context", "")
        context = raw_ctx.replace("\n", " ").replace(";", "\\;")

        completed = block.get("completed", False)
        status = "COMPLETED" if completed else "CONFIRMED"
        uid = f"weatherwise-{d_str}-{i}-{int(today_dt.timestamp())}@swytchagent.local"
        desc = f"Location: {location}\\nContext: {context}\\nStatus: {'Done' if completed else 'Pending'}"

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{now_utc}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{desc}",
            f"LOCATION:{location}",
            f"STATUS:{status}",
            "END:VEVENT",
        ])

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def build_json_export(result: dict, schedule_blocks: list, productive_hours: float) -> str:
    """Generate clean formatted JSON export of the day plan and state."""
    gh_issues = result.get("github_issues") or result.get("github_issues_open", [])
    export_payload = {
        "metadata": {
            "app": "SwytchAgent Day Planner (WeatherWise v2.0)",
            "version": "2.0.0",
            "exported_at": datetime.now().isoformat(),
            "city": result.get("city", "N/A"),
        },
        "executive_decision": {
            "go_to_office": result.get("go_to_office", "undecided"),
            "office_reason": result.get("office_reason", ""),
            "weather_score": result.get("weather_score", 0),
            "estimated_productive_hours": productive_hours,
        },
        "weather_summary": {
            "temperature_c": result.get("temperature_c"),
            "feels_like_c": result.get("feels_like_c"),
            "condition": result.get("weather_condition"),
            "humidity": result.get("humidity"),
            "wind_speed": result.get("wind_speed"),
            "forecast_summary": result.get("forecast_summary"),
            "alerts": result.get("weather_alerts", []),
        },
        "day_plan_schedule": schedule_blocks,
        "dev_workload": {
            "jira": {
                "estimated_hours": result.get("jira_estimated_hours", 0.0),
                "tickets": result.get("jira_tickets", []),
            },
            "github": {
                "estimated_hours": result.get("github_estimated_hours", 0.0),
                "prs": result.get("github_prs", []),
                "issues": gh_issues,
            },
        },
        "ai_advisory": {
            "summary": result.get("ai_summary", ""),
            "recommendations": result.get("recommendations", []),
            "outfit_suggestion": result.get("outfit_suggestion", ""),
            "activity_adjustments": result.get("activity_adjustments", []),
        },
        "integrations_status": {
            "notion_logged": result.get("notion_logged", False),
            "notion_page_url": result.get("notion_page_url"),
            "slack_message_sent": result.get("slack_message_sent", False),
            "email_sent": result.get("email_sent", False),
        },
    }
    return json.dumps(export_payload, indent=2, ensure_ascii=False)


# ══════════════════════════════════════════════════════════════════════
#  REAL-TIME WEBSOCKET HTML5 CLIENT COMPONENT
# ══════════════════════════════════════════════════════════════════════

def render_websocket_feed():
    """
    Embed a lightweight HTML5 WebSocket client via components.v1.html
    connecting to ws://localhost:8000/ws.
    Visualizes live step-by-step progress across all 8 nodes with state transitions.
    """
    ws_component_code = """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background: transparent;
          color: #1e293b;
          overflow-x: hidden;
          padding: 4px;
        }
        @media (prefers-color-scheme: dark) {
          body { color: #f1f5f9; }
          .container { background: #1e293b !important; border-color: #334155 !important; }
          .node-card { background: #0f172a !important; border-color: #334155 !important; color: #f1f5f9 !important; }
          .terminal { background: #090d16 !important; color: #38bdf8 !important; }
          .node-name { color: #f1f5f9 !important; }
        }
        .container {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px 18px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        .title {
          font-weight: 700;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pulse-dot {
          width: 9px;
          height: 9px;
          background-color: #10b981;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .badge {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 12px;
        }
        .badge-connecting { background: #fef3c7; color: #b45309; }
        .badge-connected  { background: #d1fae5; color: #047857; }
        .badge-offline    { background: #fee2e2; color: #b91c1c; }

        .pipeline-track {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }
        @media (max-width: 800px) {
          .pipeline-track { grid-template-columns: repeat(4, 1fr); }
        }
        .node-card {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 8px;
          text-align: center;
          transition: all 0.25s ease;
        }
        .node-icon { font-size: 20px; margin-bottom: 4px; }
        .node-name { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .node-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 6px;
          display: inline-block;
          text-transform: uppercase;
        }
        .node-detail {
          font-size: 10px;
          color: #64748b;
          margin-top: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Dynamic states */
        .state-idle .node-badge { background: #e2e8f0; color: #64748b; }
        
        .state-running {
          border-color: #6366f1 !important;
          background: rgba(99, 102, 241, 0.08) !important;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.25);
          animation: runningPulse 1.2s infinite alternate;
        }
        .state-running .node-badge { background: #6366f1; color: #ffffff; }

        .state-completed {
          border-color: #10b981 !important;
          background: rgba(16, 185, 129, 0.07) !important;
        }
        .state-completed .node-badge { background: #10b981; color: #ffffff; }

        @keyframes runningPulse {
          0% { border-color: #818cf8; transform: translateY(0); }
          100% { border-color: #4f46e5; transform: translateY(-2px); }
        }

        .terminal {
          background: #0f172a;
          color: #38bdf8;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          font-size: 11px;
          line-height: 1.45;
          padding: 8px 12px;
          border-radius: 8px;
          height: 60px;
          overflow-y: auto;
        }
        .term-row { margin-bottom: 3px; }
        .term-time { color: #94a3b8; margin-right: 6px; }
        .term-step { color: #a78bfa; font-weight: 600; }
        .term-ok   { color: #4ade80; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="title">
            <span class="pulse-dot"></span>
            <span>Live Swytchcode Agent Pipeline Feed (8 Nodes)</span>
          </div>
          <div id="conn-badge" class="badge badge-connecting">Connecting...</div>
        </div>

        <div class="pipeline-track">
          <!-- 1. OpenWeather -->
          <div id="node-weather" class="node-card state-idle">
            <div class="node-icon">🌦️</div>
            <div class="node-name">OpenWeather</div>
            <div id="badge-weather" class="node-badge">Idle</div>
            <div id="desc-weather" class="node-detail">Waiting...</div>
          </div>
          <!-- 2. Gmail -->
          <div id="node-gmail" class="node-card state-idle">
            <div class="node-icon">📬</div>
            <div class="node-name">Gmail</div>
            <div id="badge-gmail" class="node-badge">Idle</div>
            <div id="desc-gmail" class="node-detail">Waiting...</div>
          </div>
          <!-- 3. Jira -->
          <div id="node-jira" class="node-card state-idle">
            <div class="node-icon">🎫</div>
            <div class="node-name">Jira</div>
            <div id="badge-jira" class="node-badge">Idle</div>
            <div id="desc-jira" class="node-detail">Waiting...</div>
          </div>
          <!-- 4. GitHub -->
          <div id="node-github" class="node-card state-idle">
            <div class="node-icon">🐙</div>
            <div class="node-name">GitHub</div>
            <div id="badge-github" class="node-badge">Idle</div>
            <div id="desc-github" class="node-detail">Waiting...</div>
          </div>
          <!-- 5. Gemini AI -->
          <div id="node-ai_advisor" class="node-card state-idle">
            <div class="node-icon">🧠</div>
            <div class="node-name">Gemini AI</div>
            <div id="badge-ai_advisor" class="node-badge">Idle</div>
            <div id="desc-ai_advisor" class="node-detail">Waiting...</div>
          </div>
          <!-- 6. Notion -->
          <div id="node-notion" class="node-card state-idle">
            <div class="node-icon">📓</div>
            <div class="node-name">Notion</div>
            <div id="badge-notion" class="node-badge">Idle</div>
            <div id="desc-notion" class="node-detail">Waiting...</div>
          </div>
          <!-- 7. Slack -->
          <div id="node-slack" class="node-card state-idle">
            <div class="node-icon">📢</div>
            <div class="node-name">Slack</div>
            <div id="badge-slack" class="node-badge">Idle</div>
            <div id="desc-slack" class="node-detail">Waiting...</div>
          </div>
          <!-- 8. Resend -->
          <div id="node-resend" class="node-card state-idle">
            <div class="node-icon">📧</div>
            <div class="node-name">Resend</div>
            <div id="badge-resend" class="node-badge">Idle</div>
            <div id="desc-resend" class="node-detail">Waiting...</div>
          </div>
        </div>

        <div id="terminal" class="terminal">
          <div class="term-row"><span class="term-time">[Init]</span> WebSocket client ready. Listening for pipeline events on ws://localhost:8000/ws</div>
        </div>
      </div>

      <script>
        const STEPS = ['weather', 'gmail', 'jira', 'github', 'ai_advisor', 'notion', 'slack', 'resend'];
        const connBadge = document.getElementById('conn-badge');
        const term = document.getElementById('terminal');

        function appendLog(timeStr, stepStr, msgStr) {
          const row = document.createElement('div');
          row.className = 'term-row';
          row.innerHTML = `<span class="term-time">[${timeStr}]</span> <span class="term-step">${stepStr}</span>: <span class="term-ok">${msgStr}</span>`;
          term.appendChild(row);
          term.scrollTop = term.scrollHeight;
        }

        function resetPipeline() {
          STEPS.forEach(s => {
            const card = document.getElementById('node-' + s);
            const badge = document.getElementById('badge-' + s);
            const desc = document.getElementById('desc-' + s);
            if (card) card.className = 'node-card state-idle';
            if (badge) badge.innerText = 'Idle';
            if (desc) desc.innerText = 'Waiting...';
          });
        }

        function setupSocket() {
          const wsUrl = 'ws://localhost:8000/ws';
          let ws;
          try {
            ws = new WebSocket(wsUrl);
          } catch(e) {
            connBadge.className = 'badge badge-offline';
            connBadge.innerText = 'Offline';
            return;
          }

          ws.onopen = () => {
            connBadge.className = 'badge badge-connected';
            connBadge.innerText = '🟢 ws://localhost:8000/ws';
            appendLog(new Date().toLocaleTimeString(), 'SYSTEM', 'Connected to real-time agent feed');
          };

          ws.onmessage = (evt) => {
            try {
              const msg = JSON.parse(evt.data);
              const now = new Date().toLocaleTimeString();

              if (msg.type === 'step_complete') {
                const step = msg.step;
                const data = msg.data || {};

                // If starting over at weather, reset all subsequent nodes
                if (step === 'weather') resetPipeline();

                const card = document.getElementById('node-' + step);
                const badge = document.getElementById('badge-' + step);
                const desc = document.getElementById('desc-' + step);

                if (card) card.className = 'node-card state-completed';
                if (badge) badge.innerText = 'Done';

                let snippet = 'Completed';
                if (step === 'weather') snippet = `${data.condition || ''} ${data.temp != null ? data.temp + '°C' : ''}`;
                else if (step === 'gmail') snippet = `${data.events || 0} events`;
                else if (step === 'jira') snippet = `${data.tickets || 0} tix (~${data.hours || 0}h)`;
                else if (step === 'github') snippet = `${data.prs || 0} PRs, ${data.issues || 0} iss`;
                else if (step === 'ai_advisor') snippet = `${(data.go_to_office || '').toUpperCase()} (${data.score || 0}/100)`;
                else if (step === 'notion') snippet = data.logged ? 'Page Created' : 'Skipped';
                else if (step === 'slack') snippet = data.sent ? 'Alert Dispatched' : 'Routine';
                else if (step === 'resend') snippet = data.sent ? 'Email Sent' : 'Skipped';

                if (desc) desc.innerText = snippet;

                // Advance next node to running state
                const curIdx = STEPS.indexOf(step);
                if (curIdx >= 0 && curIdx < STEPS.length - 1) {
                  const nextStep = STEPS[curIdx + 1];
                  const nextCard = document.getElementById('node-' + nextStep);
                  const nextBadge = document.getElementById('badge-' + nextStep);
                  const nextDesc = document.getElementById('desc-' + nextStep);
                  if (nextCard && !nextCard.classList.contains('state-completed')) {
                    nextCard.className = 'node-card state-running';
                    if (nextBadge) nextBadge.innerText = 'Running';
                    if (nextDesc) nextDesc.innerText = 'Executing...';
                  }
                }

                appendLog(now, step.toUpperCase(), snippet);
              } else if (msg.type === 'agent_complete') {
                appendLog(now, 'PIPELINE', `🏁 Finished! Decision: ${msg.go_to_office?.toUpperCase()} · Weather Score: ${msg.score}/100`);
              }
            } catch(err) {
              console.error('WS Error:', err);
            }
          };

          ws.onclose = () => {
            connBadge.className = 'badge badge-connecting';
            connBadge.innerText = 'Reconnecting...';
            setTimeout(setupSocket, 3000);
          };

          ws.onerror = () => {
            ws.close();
          };
        }

        setupSocket();
      </script>
    </body>
    </html>
    """
    components.html(ws_component_code, height=230)


# ══════════════════════════════════════════════════════════════════════
#  SIDEBAR
# ══════════════════════════════════════════════════════════════════════

with st.sidebar:
    st.markdown("## 🌦️ WeatherWise v2.0")
    st.markdown("**SwytchAgent Day Planner**")
    st.markdown("---")

    # API Health & Status
    try:
        health = requests.get(f"{API_BASE}/health", timeout=3).json()
        st.markdown("### 🔗 Integration Status")
        integrations = health.get("integrations", {})
        int_names = {
            "openweather": "OpenWeather",
            "gmail": "Gmail",
            "jira": "Jira",
            "github": "GitHub",
            "notion": "Notion",
            "slack": "Slack",
            "resend": "Resend",
        }
        for key, name in int_names.items():
            status = integrations.get(key, False)
            icon = "🟢" if status else "🟡"
            cls = "int-ok" if status else "int-warn"
            st.markdown(f"{icon} <span class='{cls}'>{name}</span>", unsafe_allow_html=True)

        st.markdown("---")
        st.markdown(f"**Total Runs:** {health.get('history_count', 0)}")
        st.markdown(f"**Default City:** {health.get('default_city', 'N/A')}")
        server_ok = True
    except Exception:
        st.error("⚠️ Server offline\n\nRun: `python server.py`")
        server_ok = False

    st.markdown("---")
    st.markdown("### 📋 Demo Scenarios")
    scenario_choice = st.selectbox(
        "Pick a scenario",
        ["day_planner_office", "outdoor_picnic", "travel_day", "storm_warning", "clear_day", "work_from_home"],
        format_func=lambda x: {
            "day_planner_office": "🏢 Full Day Planner (Office vs WFH + Jira/GitHub)",
            "outdoor_picnic": "🧺 Outdoor Picnic & Sports",
            "travel_day": "✈️ Travel Day & Flights",
            "storm_warning": "⛈️ Severe Storm Warning",
            "clear_day": "☀️ Sunny Outdoor Day",
            "work_from_home": "🏠 Heavy Remote Work Day",
        }.get(x, x),
    )

    st.markdown("---")
    st.markdown("### ⚙️ Settings")
    city_override = st.text_input("City override", placeholder="Mumbai, Delhi, London...")
    user_email_input = st.text_input("Your email (for digest)", placeholder="you@example.com")

    st.markdown("---")
    st.markdown("""
    **Track 5 — AI Real World Agent**

    Architected with:
    - 🧠 LangGraph (8-Node Workflow)
    - ✨ Google Gemini AI Reasoning
    - 🔗 7 Real-World Integrations
    - ⚡ Real-Time WebSocket Telemetry
    """)


# ══════════════════════════════════════════════════════════════════════
#  MAIN CONTENT
# ══════════════════════════════════════════════════════════════════════

# ── Hero Header ────────────────────────────────────────────────────
st.markdown("""
<div class="hero-card">
  <div class="hero-title">📅 SwytchAgent Day Planner</div>
  <div class="hero-sub">
    Real-world autonomous AI that synthesizes live weather forecasts, Gmail calendar commitments,
    and Jira & GitHub engineering workloads to schedule your day hour-by-hour and dispatch actions to Notion, Slack & Resend.
  </div>
  <br>
  <div class="hero-flow" style="margin-top:16px;">
    <span>📝 User Request</span>
    <span style="opacity:0.6;">→</span>
    <span>🌦️ OpenWeather</span>
    <span style="opacity:0.6;">→</span>
    <span>📬 Gmail</span>
    <span style="opacity:0.6;">→</span>
    <span>🎫 Jira</span>
    <span style="opacity:0.6;">→</span>
    <span>🐙 GitHub</span>
    <span style="opacity:0.6;">→</span>
    <span>🧠 Gemini AI</span>
    <span style="opacity:0.6;">→</span>
    <span>📓 Notion</span>
    <span style="opacity:0.6;">→</span>
    <span>📢 Slack</span>
    <span style="opacity:0.6;">→</span>
    <span>📧 Resend</span>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Real-Time WebSocket Feed ───────────────────────────────────────
render_websocket_feed()

# ── Agent Input ────────────────────────────────────────────────────
st.markdown("## 💬 Talk to the Agent")

col_input, col_btn = st.columns([5, 1])
with col_input:
    user_request = st.text_area(
        "What are your plans today?",
        placeholder=(
            "e.g. 'I have an outdoor team picnic at 11 AM and a flight to Delhi at 6 PM. "
            "What's the weather like in Mumbai? Should I go to the office or work from home?'"
        ),
        height=90,
        key="user_request_input",
    )

tab1, tab2 = st.tabs(["🖊️ Custom Request", "🎭 Demo Scenario"])

with tab1:
    run_custom = st.button(
        "🚀 Run SwytchAgent Pipeline",
        type="primary",
        use_container_width=True,
        disabled=not server_ok,
    )

with tab2:
    st.info(f"**Selected Preset:** {scenario_choice.replace('_', ' ').title()}")
    run_demo_btn = st.button(
        f"▶️ Run Demo: {scenario_choice.replace('_', ' ').title()}",
        type="secondary",
        use_container_width=True,
        disabled=not server_ok,
    )

# ── API Execution Callers ──────────────────────────────────────────
def run_agent_request(request_text: str, city: str = None, email: str = None) -> dict | None:
    """Call the /run endpoint and return the response."""
    payload = {
        "user_request": request_text or "Give me today's weather briefing",
        "city": city or None,
        "user_email": email or None,
    }
    try:
        resp = requests.post(f"{API_BASE}/run", json=payload, timeout=90)
        if resp.status_code == 200:
            return resp.json()
        else:
            st.error(f"Agent error: {resp.status_code} — {resp.text[:300]}")
            return None
    except requests.exceptions.ConnectionError:
        st.error("❌ Cannot connect to backend. Run: `python server.py`")
        return None
    except requests.exceptions.Timeout:
        st.error("⏱️ Request timed out. The agent is still running — check server logs.")
        return None


def run_demo_request(scenario: str, city: str = None, email: str = None) -> dict | None:
    """Call the /demo endpoint."""
    payload = {"scenario": scenario, "city": city or None, "user_email": email or None}
    try:
        resp = requests.post(f"{API_BASE}/demo", json=payload, timeout=90)
        if resp.status_code == 200:
            return resp.json()
        else:
            st.error(f"Demo error: {resp.status_code} — {resp.text[:300]}")
            return None
    except Exception as e:
        st.error(f"❌ Error: {e}")
        return None


# ── Handle Button Clicks ───────────────────────────────────────────
if run_custom and user_request.strip():
    with st.spinner("🤖 SwytchAgent is executing across all 8 nodes..."):
        new_res = run_agent_request(
            user_request,
            city=city_override.strip() or None,
            email=user_email_input.strip() or None,
        )
    if new_res:
        st.session_state["last_result"] = new_res
        st.session_state["schedule_blocks"] = parse_timeline(new_res.get("day_plan_timeline", []))
        st.session_state["estimated_productive_hours"] = float(new_res.get("estimated_productive_hours") or 6.5)
        st.session_state["last_loaded_id"] = new_res.get("processed_at", str(datetime.now()))

if run_demo_btn:
    with st.spinner(f"🤖 Executing demo pipeline: {scenario_choice}..."):
        new_res = run_demo_request(
            scenario_choice,
            city=city_override.strip() or None,
            email=user_email_input.strip() or None,
        )
    if new_res:
        st.session_state["last_result"] = new_res
        st.session_state["schedule_blocks"] = parse_timeline(new_res.get("day_plan_timeline", []))
        st.session_state["estimated_productive_hours"] = float(new_res.get("estimated_productive_hours") or 6.5)
        st.session_state["last_loaded_id"] = new_res.get("processed_at", str(datetime.now()))

# ── Retrieve Persisted Result ──────────────────────────────────────
result = st.session_state.get("last_result", None)

# Initialize schedule blocks and productive hours in session state if not yet set
if result:
    res_id = result.get("processed_at", "") + "_" + result.get("city", "")
    if "schedule_blocks" not in st.session_state or st.session_state.get("last_loaded_id") != res_id:
        st.session_state["schedule_blocks"] = parse_timeline(result.get("day_plan_timeline", []))
        st.session_state["estimated_productive_hours"] = float(result.get("estimated_productive_hours") or 6.5)
        st.session_state["last_loaded_id"] = res_id


# ══════════════════════════════════════════════════════════════════════
#  DISPLAY AGENT RESULTS
# ══════════════════════════════════════════════════════════════════════

if result:
    st.markdown("---")
    st.markdown("## 📊 Synthesized Day Plan & Intelligence")

    # ── Top Metrics Row ────────────────────────────────────────────
    col1, col2, col3, col4, col5, col6 = st.columns(6)

    with col1:
        temp_c = result.get("temperature_c", 0.0)
        feels_c = result.get("feels_like_c") if result.get("feels_like_c") is not None else temp_c
        st.metric("🌡️ Temperature", f"{temp_c:.1f}°C", f"Feels {feels_c:.0f}°C")

    with col2:
        score = result.get("weather_score", 0)
        score_label = "Good" if score >= 70 else ("Moderate" if score >= 40 else "Poor")
        st.metric("📊 Weather Score", f"{score}/100", score_label)

    with col3:
        office_raw = str(result.get("go_to_office", "undecided")).lower().strip()
        if office_raw in ("office", "yes"):
            loc_label = "🏢 Office"
        elif office_raw in ("wfh", "no"):
            loc_label = "🏠 WFH"
        elif office_raw in ("hybrid",):
            loc_label = "🔀 Hybrid"
        else:
            loc_label = f"❓ {office_raw.title()}"
        st.metric("📍 Recommendation", loc_label, f"Mode: {office_raw.upper()}")

    with col4:
        tot_hrs = result.get("jira_estimated_hours", 0.0) + result.get("github_estimated_hours", 0.0)
        jira_count = len(result.get("jira_tickets", []))
        gh_prs_count = len(result.get("github_prs", []))
        st.metric("⏱️ Dev Workload", f"{tot_hrs:.1f} hrs", f"{jira_count} Jira · {gh_prs_count} PRs")

    with col5:
        events_len = len(result.get("gmail_events", []))
        comm_label = "🌿 Outdoor" if result.get("has_outdoor_plans") else ("✈️ Travel" if result.get("has_travel_plans") else "🏠 Regular")
        st.metric("📬 Gmail Events", events_len, comm_label)

    with col6:
        actions_taken = sum([
            bool(result.get("notion_logged", False)),
            bool(result.get("slack_message_sent", False)),
            bool(result.get("email_sent", False)),
        ])
        st.metric("✅ Actions Taken", f"{actions_taken}/3", "Notion · Slack · Resend")

    # ── Main Content Columns ───────────────────────────────────────
    col_left, col_right = st.columns([3, 2])

    with col_left:
        # Office Decision Highlight Banner
        office_raw = str(result.get("go_to_office", "undecided")).lower().strip()
        reason_txt = result.get("office_reason", "")
        if office_raw in ("office", "yes"):
            st.success(f"🏢 **AGENT RECOMMENDATION: WORK FROM THE OFFICE TODAY**\n\n{reason_txt or 'Weather conditions and collaboration requirements favor working from the office today.'}")
        elif office_raw in ("wfh", "no"):
            st.info(f"🏠 **AGENT RECOMMENDATION: WORK FROM HOME (REMOTE) TODAY**\n\n{reason_txt or 'Adverse weather conditions or high-focus engineering workloads make remote work optimal.'}")
        elif office_raw in ("hybrid",):
            st.warning(f"🔀 **AGENT RECOMMENDATION: HYBRID WORK TODAY**\n\n{reason_txt or 'Flexible split schedule: remote focus in the morning followed by afternoon on-site presence.'}")
        else:
            st.warning(f"⚠️ **AGENT RECOMMENDATION: {office_raw.upper()}**\n\n{reason_txt}")

        # AI Advisory Summary
        st.markdown("### 🧠 AI Day Planner Advisory")
        st.markdown(result.get("ai_summary", "No advisory generated"))

        # ── Interactive Schedule Editor ────────────────────────────
        st.markdown("---")
        st.markdown("### 📅 Interactive Schedule Editor")
        st.caption("Customize your day: edit time slots, reorder priorities, check off completed tasks, or append new focus blocks.")

        # Interactive Productive Hours Slider
        cur_prod = float(st.session_state.get("estimated_productive_hours", 6.5))
        new_prod = st.slider(
            "⏱️ Allocated Productive Hours",
            min_value=1.0,
            max_value=12.0,
            value=cur_prod,
            step=0.5,
            key="interactive_prod_slider",
            help="Fine-tune your daily focus capacity to rebalance meetings and deep work.",
        )
        st.session_state["estimated_productive_hours"] = new_prod

        # Schedule Blocks Manager
        schedule_blocks = st.session_state.get("schedule_blocks", [])

        # Progress tracking
        tot_blocks = len(schedule_blocks)
        done_blocks = sum(1 for b in schedule_blocks if b.get("completed", False))
        pct_done = (done_blocks / max(tot_blocks, 1))

        pcol1, pcol2 = st.columns([4, 1])
        with pcol1:
            st.progress(pct_done)
        with pcol2:
            st.markdown(f"**{done_blocks}/{tot_blocks} Done** ({pct_done * 100:.0f}%)")

        # Render Schedule Block Cards
        for i, block in enumerate(schedule_blocks):
            block_id = block.get("id", f"b_{i}")
            is_done = block.get("completed", False)

            card_cls = "step-card step-done" if is_done else "step-card step-active"
            loc_icon = "🏢" if "office" in block.get("location", "").lower() else ("🏠" if "home" in block.get("location", "").lower() else "📍")

            st_col_chk, st_col_main, st_col_up, st_col_down, st_col_del = st.columns([0.6, 5.0, 0.7, 0.7, 0.7])

            with st_col_chk:
                def on_toggle_done(bid=block_id):
                    for b in st.session_state["schedule_blocks"]:
                        if b["id"] == bid:
                            b["completed"] = st.session_state[f"chk_{bid}"]
                            break

                st.checkbox(
                    "Done",
                    value=is_done,
                    key=f"chk_{block_id}",
                    on_change=on_toggle_done,
                    label_visibility="collapsed",
                )

            with st_col_main:
                if is_done:
                    st.markdown(f"""
                    <div style="opacity:0.65; text-decoration: line-through;">
                      <strong style="color:#059669;">⏰ {block.get('time')}</strong> — <strong>{block.get('activity')}</strong>
                      <br>
                      <small style="color:var(--ww-text-muted,#6b7280);">{loc_icon} {block.get('location')} &nbsp;|&nbsp; 💡 {block.get('context')}</small>
                    </div>
                    """, unsafe_allow_html=True)
                else:
                    st.markdown(f"""
                    <div>
                      <strong style="color:var(--ww-primary,#4f46e5);">⏰ {block.get('time')}</strong> — <strong style="color:var(--ww-text-main,#111827);">{block.get('activity')}</strong>
                      <br>
                      <small style="color:var(--ww-text-muted,#6b7280);">{loc_icon} {block.get('location')} &nbsp;|&nbsp; 💡 {block.get('context')}</small>
                    </div>
                    """, unsafe_allow_html=True)

            with st_col_up:
                if st.button("🔼", key=f"up_{block_id}", help="Move block up", disabled=(i == 0)):
                    st.session_state["schedule_blocks"][i], st.session_state["schedule_blocks"][i - 1] = (
                        st.session_state["schedule_blocks"][i - 1],
                        st.session_state["schedule_blocks"][i],
                    )
                    st.rerun()

            with st_col_down:
                if st.button("🔽", key=f"down_{block_id}", help="Move block down", disabled=(i == len(schedule_blocks) - 1)):
                    st.session_state["schedule_blocks"][i], st.session_state["schedule_blocks"][i + 1] = (
                        st.session_state["schedule_blocks"][i + 1],
                        st.session_state["schedule_blocks"][i],
                    )
                    st.rerun()

            with st_col_del:
                if st.button("🗑️", key=f"del_{block_id}", help="Delete slot"):
                    st.session_state["schedule_blocks"].pop(i)
                    st.rerun()

            # Inline slot editor
            with st.expander(f"✏️ Edit Slot Details: {block.get('time')} — {block.get('activity')[:28]}...", expanded=False):
                ec1, ec2 = st.columns([1, 2])
                with ec1:
                    new_time = st.text_input("Time Range", value=block.get("time", ""), key=f"time_in_{block_id}")
                    new_loc = st.text_input("Location", value=block.get("location", ""), key=f"loc_in_{block_id}")
                with ec2:
                    new_act = st.text_input("Activity Title", value=block.get("activity", ""), key=f"act_in_{block_id}")
                    new_ctx = st.text_input("Context / Notes", value=block.get("context", ""), key=f"ctx_in_{block_id}")

                if st.button("💾 Save Slot", key=f"save_{block_id}"):
                    block["time"] = new_time.strip()
                    block["activity"] = new_act.strip()
                    block["location"] = new_loc.strip()
                    block["context"] = new_ctx.strip()
                    st.success("Slot updated!")
                    st.rerun()

        # Add New Schedule Block Expandable Form
        with st.expander("➕ Add New Schedule Block", expanded=False):
            with st.form("add_schedule_slot_form", clear_on_submit=True):
                fa1, fa2 = st.columns([1, 2])
                with fa1:
                    form_time = st.text_input("Time Range", placeholder="e.g. 15:00–16:30")
                    form_loc = st.selectbox("Location", ["Office", "Home / Remote", "Transit", "Outdoor", "Client Site", "Other"])
                with fa2:
                    form_act = st.text_input("Activity Name", placeholder="e.g. Sprint retrospective & architecture review")
                    form_ctx = st.text_input("Context / Notes", placeholder="e.g. Review PR #12 and sync with team")

                submit_slot = st.form_submit_button("➕ Add to Day Plan", type="primary")
                if submit_slot:
                    if form_act.strip():
                        new_slot_id = f"custom_{len(schedule_blocks)}_{int(datetime.now().timestamp())}"
                        st.session_state["schedule_blocks"].append({
                            "id": new_slot_id,
                            "time": form_time.strip() or "Flexible",
                            "activity": form_act.strip(),
                            "location": form_loc,
                            "context": form_ctx.strip(),
                            "completed": False,
                        })
                        st.success(f"Added '{form_act}' to schedule!")
                        st.rerun()
                    else:
                        st.warning("Please provide an activity name.")

        # Reset schedule button
        if st.button("🔄 Reset Schedule to Original AI Plan"):
            st.session_state["schedule_blocks"] = parse_timeline(result.get("day_plan_timeline", []))
            st.session_state["estimated_productive_hours"] = float(result.get("estimated_productive_hours") or 6.5)
            st.rerun()

        # ── Export Options ─────────────────────────────────────────
        st.markdown("---")
        st.markdown("### 💾 Export Day Plan")
        st.caption("Download your synthesized briefing to markdown, calendar events, or structured JSON.")

        today_slug = datetime.now().strftime("%Y%m%d")
        exp_col1, exp_col2, exp_col3 = st.columns(3)

        with exp_col1:
            md_payload = build_markdown_export(result, st.session_state["schedule_blocks"], st.session_state["estimated_productive_hours"])
            st.download_button(
                label="📥 Markdown (.md)",
                data=md_payload,
                file_name=f"day_plan_{today_slug}.md",
                mime="text/markdown",
                use_container_width=True,
            )

        with exp_col2:
            ics_payload = build_ics_export(result, st.session_state["schedule_blocks"])
            st.download_button(
                label="📅 iCalendar (.ics)",
                data=ics_payload,
                file_name=f"day_plan_{today_slug}.ics",
                mime="text/calendar",
                use_container_width=True,
            )

        with exp_col3:
            json_payload = build_json_export(result, st.session_state["schedule_blocks"], st.session_state["estimated_productive_hours"])
            st.download_button(
                label="📋 Summary (.json)",
                data=json_payload,
                file_name=f"day_plan_{today_slug}.json",
                mime="application/json",
                use_container_width=True,
            )

        # Smart Recommendations
        recs = result.get("recommendations", [])
        if recs:
            st.markdown("### 📋 Smart Recommendations")
            for rec in recs:
                st.markdown(f"""<div class="rec-chip">{rec}</div>""", unsafe_allow_html=True)

        # Outfit Suggestion
        outfit = result.get("outfit_suggestion", "")
        if outfit:
            st.markdown("### 👔 Outfit Suggestion")
            st.info(outfit)

        # Activity Adjustments
        adjustments = result.get("activity_adjustments", [])
        if adjustments:
            st.markdown("### 🔄 Plan Adjustments")
            for adj in adjustments:
                st.warning(adj)

        # Weather Alerts
        alerts = result.get("weather_alerts", [])
        if alerts:
            st.markdown("### ⚠️ Weather Alerts")
            for alert in alerts:
                st.markdown(f"""<div class="alert-box">{alert}</div>""", unsafe_allow_html=True)

    with col_right:
        # Weather Card
        condition = result.get("weather_condition", "Clear")
        cond_bg = {
            "Clear": "#f59e0b,#fbbf24", "Clouds": "#6b7280,#9ca3af",
            "Rain": "#3b82f6,#60a5fa", "Thunderstorm": "#1e3a5f,#3b82f6",
            "Snow": "#bae6fd,#7dd3fc", "Drizzle": "#6366f1,#818cf8",
        }.get(condition, "#667eea,#764ba2")
        g1, g2 = cond_bg.split(",")

        cond_icon = {
            "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️", "Drizzle": "🌦️",
            "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Fog": "🌁",
        }.get(condition, "🌡️")

        st.markdown(f"""
        <div class="weather-card" style="background: linear-gradient(135deg, {g1} 0%, {g2} 100%);">
          <div style="font-size:3rem;">{cond_icon}</div>
          <div class="weather-temp">{result.get('temperature_c', 0):.0f}°C</div>
          <div class="weather-cond">{condition} — {result.get('city', '')}</div>
          <br>
          <div style="font-size:13px;opacity:0.88;">
            💧 {result.get('humidity', 0)}% humidity &nbsp;|&nbsp; 💨 {result.get('wind_speed', 0):.1f} m/s wind
          </div>
          <div style="font-size:12px;opacity:0.80;margin-top:8px;">
            {result.get('forecast_summary', '')}
          </div>
        </div>
        """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)

        # Jira Workload Card
        jira_tickets = result.get("jira_tickets", [])
        if jira_tickets:
            st.markdown(f"### 🎫 Jira Workload ({result.get('jira_estimated_hours', 0):.1f}h est.)")
            for t in jira_tickets[:3]:
                prio = t.get("priority", "Medium")
                prio_color = "#dc2626" if prio == "High" else "#d97706"
                st.markdown(f"""
                <div class="step-card">
                  <strong style="color:var(--ww-primary,#4f46e5);"><code>{t.get('key')}</code></strong> <span style="color:var(--ww-text-main,#111827);">{t.get('summary', '')[:45]}...</span>
                  <br>
                  <small style="color:{prio_color}; font-weight:600;">● {prio} priority</small> &nbsp;|&nbsp;
                  <small style="color:var(--ww-text-muted,#6b7280);">⏱️ ~{t.get('estimated_hours', 2.0)}h · {t.get('status', 'Open')}</small>
                </div>
                """, unsafe_allow_html=True)

        # GitHub Workload Card (Canonical accessors: author/user, estimated_hours/est_hours/review_hours)
        gh_prs = result.get("github_prs", [])
        gh_issues = result.get("github_issues") or result.get("github_issues_open", [])
        if gh_prs or gh_issues:
            st.markdown(f"### 🐙 GitHub Workload ({result.get('github_estimated_hours', 0):.1f}h est.)")
            for pr in gh_prs[:2]:
                pr_author = pr.get("author") or pr.get("user") or "dev"
                pr_hours = pr.get("estimated_hours") or pr.get("est_hours") or pr.get("review_hours") or 1.0
                st.markdown(f"""
                <div class="step-card">
                  <strong style="color:var(--ww-text-main,#111827);">PR #{pr.get('number')}:</strong> <span style="color:var(--ww-text-sub,#374151);">{pr.get('title', '')[:45]}...</span>
                  <br>
                  <small style="color:#059669; font-weight:600;">{pr.get('state', 'open')} by @{pr_author}</small> &nbsp;|&nbsp;
                  <small style="color:var(--ww-text-muted,#6b7280);">⏱️ ~{pr_hours:.1f}h review</small>
                </div>
                """, unsafe_allow_html=True)
            for iss in gh_issues[:2]:
                st.markdown(f"""
                <div class="step-card">
                  <strong style="color:var(--ww-text-main,#111827);">Issue #{iss.get('number')}:</strong> <span style="color:var(--ww-text-sub,#374151);">{iss.get('title', '')[:45]}...</span>
                </div>
                """, unsafe_allow_html=True)

        # Gmail Events
        events = result.get("gmail_events", [])
        if events:
            st.markdown("### 📬 Your Gmail Events")
            for ev in events[:3]:
                event_class = ""
                icon = "📅"
                if ev.get("has_outdoor"):
                    event_class = "event-outdoor"
                    icon = "🌿"
                elif ev.get("has_travel"):
                    event_class = "event-travel"
                    icon = "✈️"
                st.markdown(f"""
                <div class="event-card {event_class}">
                  <strong style="color:var(--ww-text-main,#111827);">{icon} {ev.get('subject', 'Event')[:50]}</strong><br>
                  <small style="color:var(--ww-text-muted,#6b7280);">{ev.get('from', '')[:40]}</small>
                </div>
                """, unsafe_allow_html=True)

        # Integration Results (All 7 external services)
        st.markdown("### 🔗 7 Real-World Integrations")

        int_status = [
            ("☁️ OpenWeather", True, f"{result.get('weather_condition')} fetched ({result.get('temperature_c', 0):.1f}°C)"),
            ("📬 Gmail", True, f"{len(events)} commitments analyzed"),
            ("🎫 Jira", True, f"{len(jira_tickets)} tickets analyzed (~{result.get('jira_estimated_hours', 0):.1f}h)"),
            ("🐙 GitHub", True, f"{len(gh_prs)} PRs & {len(gh_issues)} issues"),
            ("📓 Notion", result.get("notion_logged", False),
             "Full Day Plan logged" if result.get("notion_logged") else "Not logged"),
            ("📢 Slack", result.get("slack_message_sent", False),
             "Day briefing sent" if result.get("slack_message_sent") else "No alert (routine)"),
            ("📧 Resend", result.get("email_sent", False),
             "Day Plan digest emailed" if result.get("email_sent") else "Not sent"),
        ]

        for api_name, ok, detail in int_status:
            icon = "✅" if ok else "⚪"
            color = "#059669" if ok else "#9ca3af"
            st.markdown(
                f"{icon} **{api_name}** — "
                f"<span style='color:{color};font-size:13px;font-weight:500;'>{detail}</span>",
                unsafe_allow_html=True,
            )

        if result.get("notion_page_url"):
            st.markdown(f"[📓 Open Notion Day Plan]({result.get('notion_page_url')})")

    # ── Agent Execution Log ────────────────────────────────────────
    with st.expander("🔍 View Full Agent Execution Log", expanded=False):
        for entry in result.get("execution_log", []):
            st.text(entry)

    # ── Processed At ───────────────────────────────────────────────
    st.markdown(
        f"<small style='color:var(--ww-text-muted,#9ca3af); font-style:italic;'>⏱ Agent completed at {result.get('processed_at', 'N/A')}</small>",
        unsafe_allow_html=True,
    )

# ── Quick Weather Lookup ───────────────────────────────────────────
st.markdown("---")
with st.expander("🔍 Quick Weather Lookup", expanded=False):
    qcol1, qcol2 = st.columns([3, 1])
    with qcol1:
        quick_city = st.text_input("City name", placeholder="London, Tokyo, New York...", key="quick_city")
    with qcol2:
        st.markdown("<br>", unsafe_allow_html=True)
        quick_btn = st.button("🌡️ Get Weather", disabled=not server_ok)

    if quick_btn and quick_city:
        try:
            qresp = requests.get(f"{API_BASE}/weather/{quick_city}", timeout=10)
            if qresp.status_code == 200:
                qdata = qresp.json()
                qc1, qc2, qc3 = st.columns(3)
                qc1.metric("Temperature", f"{qdata.get('temperature_c', 0):.1f}°C", f"Feels {qdata.get('feels_like_c', 0):.0f}°C")
                qc2.metric("Humidity", f"{qdata.get('humidity', 0)}%")
                qc3.metric("Condition", qdata.get("condition", "N/A"))
            elif qresp.status_code == 404:
                st.error(f"City '{quick_city}' not found. Try: Mumbai, London, Tokyo")
            else:
                st.error(f"Error: {qresp.status_code}")
        except Exception as e:
            st.error(f"Error: {e}")

# ── History Section ────────────────────────────────────────────────
st.markdown("---")
with st.expander("📜 Agent Run History", expanded=False):
    if server_ok:
        try:
            hist = requests.get(f"{API_BASE}/history?limit=10", timeout=5).json()
            items = hist.get("items", [])
            if items:
                for item in items:
                    risk_icons = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "⛔"}
                    ri = risk_icons.get(item.get("risk_level", "low"), "🟡")
                    st.markdown(
                        f"**{item.get('processed_at', '')[:16]}** — "
                        f"{item.get('city', 'N/A')} | "
                        f"{item.get('weather_condition', '')} {item.get('temperature_c', 0):.0f}°C | "
                        f"{ri} {item.get('risk_level', '').upper()} | "
                        f"Score: {item.get('weather_score', 0)}/100"
                    )
            else:
                st.info("No runs yet. Click 'Run SwytchAgent Pipeline' to start!")
        except Exception:
            st.warning("Could not load history")
    else:
        st.warning("Server offline — start with `python server.py`")

# ── Analytics ─────────────────────────────────────────────────────
st.markdown("---")
with st.expander("📊 Analytics Dashboard", expanded=False):
    if server_ok:
        try:
            analytics = requests.get(f"{API_BASE}/analytics", timeout=5).json()
            if analytics.get("total_runs", 0) > 0:
                ac1, ac2, ac3, ac4 = st.columns(4)
                ac1.metric("Total Runs", analytics["total_runs"])
                ac2.metric("Avg Weather Score", f"{analytics.get('avg_weather_score', 0):.0f}/100")
                ac3.metric("Emails Sent", analytics.get("emails_sent", 0))
                ac4.metric("Slack Alerts", analytics.get("slack_alerts", 0))

                if analytics.get("risk_distribution"):
                    st.markdown("**Risk Distribution:**")
                    st.json(analytics["risk_distribution"])
            else:
                st.info("Run the agent a few times to see analytics!")
        except Exception:
            st.warning("Could not load analytics")
    else:
        st.warning("Server offline — start with `python server.py`")

# ── Architecture Diagram (Complete 8-Node Workflow) ────────────────
st.markdown("---")
with st.expander("🏗️ Architecture Overview — 8-Node LangGraph Pipeline", expanded=False):
    st.markdown("""
    ```
    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                 SWYTCHAGENT DAY PLANNER (WEATHERWISE v2.0)                      │
    │                    Track 5 — AI Real World Agent                                │
    └─────────────────────────────────────────────────────────────────────────────────┘

    User Request (Natural Language / Preset Scenario)
          │
          ▼
    ┌──────────────────────┐
    │  [1] OPENWEATHER     │  → Current weather, feels-like, 24h forecast & alerts
    │  weather_fetcher     │    Direct REST: api.openweathermap.org (or mock)
    └──────────┬───────────┘
               │ Weather & forecast context
               ▼
    ┌──────────────────────┐
    │  [2] GMAIL           │  → Scan recent messages & calendar for commitments
    │  gmail_reader        │    Swytchcode / REST: gmail.messages.list + .get
    └──────────┬───────────┘
               │ Commitments & travel flags
               ▼
    ┌──────────────────────┐
    │  [3] JIRA WORKLOAD   │  → Pull assigned active sprint issues & hours
    │  jira_workload       │    Swytchcode / REST: jira.issues.list
    └──────────┬───────────┘
               │ Sprint issue count & estimated hours
               ▼
    ┌──────────────────────┐
    │  [4] GITHUB WORKLOAD │  → Pull open PRs requiring review & assigned issues
    │  github_workload     │    Swytchcode / REST: github.pullRequests.list
    └──────────┬───────────┘
               │ Engineering workload (Jira + GitHub)
               ▼
    ┌──────────────────────┐
    │  [5] GEMINI AI       │  → Multi-factor reasoning: weather + schedule + workload
    │  ai_advisor          │    LLM reasoning: Office vs WFH, hour-by-hour timeline
    └──────────┬───────────┘
               │ Synthesized Day Plan & recommendations
               ▼
    ┌──────────────────────┐
    │  [6] NOTION          │  → Publish complete Day Plan page to Notion database
    │  notion_logger       │    Swytchcode / REST: notion.pages.create
    └──────────┬───────────┘
               │ Logged page URL
               ▼
    ┌──────────────────────┐
    │  [7] SLACK           │  → Send Block Kit day briefing / risk alert
    │  slack_notifier      │    Swytchcode / REST: slack.messages.send
    └──────────┬───────────┘
               │ Notification sent status
               ▼
    ┌──────────────────────┐
    │  [8] RESEND          │  → Dispatch executive HTML email briefing
    │  email_sender        │    Swytchcode / REST: resend.email.create
    └──────────────────────┘
               │
               ▼
    Final Synthesized Day Plan (Dashboard + REST API + WebSocket Feed)

    Key Agentic Behaviors:
    ✅ 8-Node LangGraph State Graph with deterministic routing and robust service fallbacks.
    ✅ Intelligent Work Location: Balances weather commute risks against sprint coding velocity.
    ✅ Real-Time WebSocket Telemetry: Live node transitions broadcast over ws://localhost:8000/ws.
    ✅ One-Click Cross-Platform Exports: Markdown briefing, RFC 5545 iCalendar, and structured JSON.
    ✅ Multi-Channel Delivery: Coordinated logging to Notion, alerts to Slack, and digests to Resend.
    ```
    """)

# ── Footer ─────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<div class='app-footer'>"
    "🌦️ <strong>SwytchAgent Day Planner (WeatherWise v2.0)</strong> &nbsp;·&nbsp; "
    "Track 5: AI Real World Agent &nbsp;·&nbsp; "
    "Swytchcode Hackathon 2026 &nbsp;·&nbsp; "
    "LangGraph + Google Gemini + Swytchcode"
    "</div>",
    unsafe_allow_html=True,
)
