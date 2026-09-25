"""
WeatherWise AI Life Agent — Streamlit Dashboard

Interactive demo dashboard for the Swytchcode Hackathon.
Showcases the full agentic workflow with live visualization:
  - Natural language input
  - Step-by-step agent reasoning display
  - Weather visualization
  - Gmail events panel
  - AI recommendations
  - Multi-API integration status

Track 5 — AI Real World Agent
"""
import streamlit as st
import requests
import json
from datetime import datetime

# ── Page Config ────────────────────────────────────────────────────
st.set_page_config(
    page_title="WeatherWise AI Agent",
    page_icon="🌦️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── API Base URL ───────────────────────────────────────────────────
API_BASE = "http://localhost:8000"

# ── Custom CSS ─────────────────────────────────────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    .main { background: #0f1117; }

    /* Hero card */
    .hero-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 32px;
        color: white;
        margin-bottom: 24px;
    }
    .hero-title { font-size: 2.4rem; font-weight: 800; margin: 0; }
    .hero-sub { font-size: 1rem; opacity: 0.85; margin: 8px 0 0; }

    /* Weather card */
    .weather-card {
        background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        border-radius: 16px;
        padding: 24px;
        color: white;
        text-align: center;
    }
    .weather-temp { font-size: 3.5rem; font-weight: 800; }
    .weather-cond { font-size: 1.1rem; opacity: 0.9; }

    /* Score bar */
    .score-bar {
        background: #1e2329;
        border-radius: 12px;
        padding: 20px;
        border: 1px solid #2d3748;
    }

    /* Risk badge */
    .badge-low    { background: #10b981; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
    .badge-medium { background: #f59e0b; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
    .badge-high   { background: #ef4444; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }
    .badge-critical { background: #7c3aed; color: white; padding: 4px 14px; border-radius: 20px; font-weight: 700; font-size: 13px; }

    /* Step card */
    .step-card {
        background: #1a1f2e;
        border: 1px solid #2d3748;
        border-radius: 12px;
        padding: 14px 18px;
        margin-bottom: 10px;
    }
    .step-active { border-color: #667eea; }
    .step-done { border-color: #10b981; }

    /* Recommendation chip */
    .rec-chip {
        background: #1e2329;
        border: 1px solid #374151;
        border-radius: 10px;
        padding: 10px 14px;
        margin-bottom: 8px;
        font-size: 14px;
    }

    /* Alert box */
    .alert-box {
        background: #2d1b1b;
        border-left: 4px solid #ef4444;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 8px;
        color: #fca5a5;
    }

    /* Integration badge */
    .int-ok   { color: #10b981; font-weight: 600; }
    .int-warn { color: #f59e0b; font-weight: 600; }

    /* Workflow step */
    .flow-step {
        display: inline-block;
        background: #1e2329;
        border: 1px solid #4b5563;
        border-radius: 8px;
        padding: 6px 14px;
        font-size: 13px;
        margin: 4px;
        color: #d1d5db;
    }
    .flow-arrow { color: #6b7280; font-size: 16px; margin: 0 4px; }

    /* Event card */
    .event-card {
        background: #1a1f2e;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 8px;
        border-left: 3px solid #667eea;
    }
    .event-outdoor { border-left-color: #10b981; }
    .event-travel  { border-left-color: #f59e0b; }
</style>
""", unsafe_allow_html=True)

# ══════════════════════════════════════════════════════════════════════
#  SIDEBAR
# ══════════════════════════════════════════════════════════════════════

with st.sidebar:
    st.markdown("## 🌦️ WeatherWise")
    st.markdown("**AI Life Agent**")
    st.markdown("---")

    # API Health
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
        }.get(x, x)
    )

    st.markdown("---")
    st.markdown("### ⚙️ Settings")
    city_override = st.text_input("City override", placeholder="Mumbai, Delhi, London...")
    user_email_input = st.text_input("Your email (for digest)", placeholder="you@example.com")

    st.markdown("---")
    st.markdown("""
    **Track 5 — AI Real World Agent**

    Built with:
    - 🧠 LangGraph (8-Node Workflow)
    - ✨ Google Gemini AI
    - 🔗 7 Real-World Integrations
    """)


# ══════════════════════════════════════════════════════════════════════
#  MAIN CONTENT
# ══════════════════════════════════════════════════════════════════════

# ── Hero Header ────────────────────────────────────────────────────
st.markdown("""
<div class="hero-card">
  <div class="hero-title">📅 SwytchAgent Day Planner</div>
  <div class="hero-sub">
    Real-world AI that synthesizes live weather, Gmail commitments, and your dev workload from Jira & GitHub
    to optimize your office vs WFH decision, schedule your day hour-by-hour, and log to Notion, Slack & Resend.
  </div>
  <br>
  <div style="font-size:13px; font-weight:600; opacity:0.95;">
    <span>📝 Request</span>
    <span>→</span>
    <span>🌦️ OpenWeather</span>
    <span>→</span>
    <span>📬 Gmail</span>
    <span>→</span>
    <span>🎫 Jira</span>
    <span>→</span>
    <span>🐙 GitHub</span>
    <span>→</span>
    <span>🧠 Gemini AI</span>
    <span>→</span>
    <span>📓 Notion</span>
    <span>→</span>
    <span>📢 Slack</span>
    <span>→</span>
    <span>📧 Resend</span>
  </div>
</div>
""", unsafe_allow_html=True)

# ── Agent Input ────────────────────────────────────────────────────
st.markdown("## 💬 Talk to the Agent")

col_input, col_btn = st.columns([5, 1])
with col_input:
    user_request = st.text_area(
        "What are your plans today?",
        placeholder=(
            "e.g. 'I have an outdoor team picnic at 11 AM and a flight to Delhi at 6 PM. "
            "What's the weather like in Mumbai? Should I proceed with my outdoor plans?'"
        ),
        height=100,
        key="user_request_input",
    )

tab1, tab2 = st.tabs(["🖊️ Custom Request", "🎭 Demo Scenario"])

with tab1:
    run_custom = st.button(
        "🚀 Run WeatherWise Agent",
        type="primary",
        use_container_width=True,
        disabled=not server_ok,
    )

with tab2:
    st.info(f"**Selected:** {scenario_choice.replace('_', ' ').title()}")
    run_demo_btn = st.button(
        f"▶️ Run Demo: {scenario_choice.replace('_', ' ').title()}",
        type="secondary",
        use_container_width=True,
        disabled=not server_ok,
    )

# ── Result Display ─────────────────────────────────────────────────
result = st.session_state.get("last_result", None)


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


# ── Handle button clicks ───────────────────────────────────────────
if run_custom and user_request.strip():
    with st.spinner("🤖 WeatherWise Agent is working..."):
        result = run_agent_request(
            user_request,
            city=city_override.strip() or None,
            email=user_email_input.strip() or None,
        )
    if result:
        st.session_state["last_result"] = result

if run_demo_btn:
    with st.spinner(f"🤖 Running demo: {scenario_choice}..."):
        result = run_demo_request(
            scenario_choice,
            city=city_override.strip() or None,
            email=user_email_input.strip() or None,
        )
    if result:
        st.session_state["last_result"] = result

# ── Display Results ────────────────────────────────────────────────
if result:
    st.markdown("---")
    st.markdown("## 📊 Agent Results")

    # ── Top metrics row ────────────────────────────────────────────
    col1, col2, col3, col4, col5, col6 = st.columns(6)

    with col1:
        st.metric("🌡️ Temperature", f"{result.get('temperature_c', 0):.1f}°C",
                  f"Feels {result.get('feels_like_c', 0) if result.get('feels_like_c') else result.get('temperature_c', 0):.0f}°C")
    with col2:
        score = result.get("weather_score", 0)
        st.metric("📊 Weather Score", f"{score}/100",
                  "Good" if score >= 70 else "Moderate" if score >= 40 else "Poor")
    with col3:
        office_dec = result.get("go_to_office", "undecided")
        office_label = "🏢 Office" if office_dec == "office" else ("🏠 WFH" if office_dec == "wfh" else "⚠️ Hybrid")
        st.metric("📍 Work Location", office_label, f"Decision: {office_dec.upper()}")
    with col4:
        tot_hrs = result.get("jira_estimated_hours", 0.0) + result.get("github_estimated_hours", 0.0)
        st.metric("⏱️ Dev Workload", f"{tot_hrs:.1f} hrs",
                  f"{len(result.get('jira_tickets', []))} Jira · {len(result.get('github_prs', []))} PRs")
    with col5:
        st.metric("📬 Gmail Events", len(result.get("gmail_events", [])),
                  "🌿 Outdoor" if result.get("has_outdoor_plans") else "🏠 Indoor")
    with col6:
        actions_taken = sum([
            result.get("notion_logged", False),
            result.get("slack_message_sent", False),
            result.get("email_sent", False),
        ])
        st.metric("✅ Actions Taken", f"{actions_taken}/3", "Notion · Slack · Resend")

    # ── Main content cols ──────────────────────────────────────────
    col_left, col_right = st.columns([3, 2])

    with col_left:
        # Office Decision Highlight
        office_dec = result.get("go_to_office", "undecided")
        if office_dec == "office":
            st.success("🏢 **AGENT RECOMMENDATION: WORK FROM THE OFFICE TODAY**\n\nConditions are favorable for commute, and in-person collaboration aligns with your schedule.")
        elif office_dec == "wfh":
            st.info("🏠 **AGENT RECOMMENDATION: WORK FROM HOME (REMOTE) TODAY**\n\nWeather conditions or high-focus development workload make staying home optimal.")
        else:
            st.warning(f"⚠️ **AGENT RECOMMENDATION: {office_dec.upper()}**")

        # AI Advisory
        st.markdown("### 🧠 AI Day Planner Advisory")
        st.markdown(result.get("ai_summary", "No advisory generated"))

        # Day Plan Timeline
        timeline = result.get("day_plan_timeline", [])
        if timeline:
            st.markdown("### 📅 Hour-by-Hour Day Plan")
            for item in timeline:
                t_time = item.get("time", "")
                t_act = item.get("activity", "")
                t_loc = item.get("location", "")
                t_ctx = item.get("context", "")
                loc_icon = "🏢" if "office" in t_loc.lower() else ("🏠" if "home" in t_loc.lower() else "📍")
                st.markdown(f"""
                <div class="step-card" style="border-left: 4px solid #667eea; margin-bottom: 8px;">
                  <strong style="color: #60a5fa;">⏰ {t_time}</strong> — <strong>{t_act}</strong>
                  <br>
                  <small style="color: #9ca3af;">{loc_icon} {t_loc} &nbsp;|&nbsp; 💡 {t_ctx}</small>
                </div>
                """, unsafe_allow_html=True)

        # Recommendations
        recs = result.get("recommendations", [])
        if recs:
            st.markdown("### 📋 Smart Recommendations")
            for rec in recs:
                st.markdown(f"""<div class="rec-chip">{rec}</div>""", unsafe_allow_html=True)

        # Outfit
        outfit = result.get("outfit_suggestion", "")
        if outfit:
            st.markdown("### 👔 Outfit Suggestion")
            st.info(outfit)

        # Activity adjustments
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
        # Weather card
        condition = result.get("weather_condition", "Clear")
        cond_bg = {
            "Clear": "#f59e0b,#fbbf24", "Clouds": "#6b7280,#9ca3af",
            "Rain": "#3b82f6,#60a5fa", "Thunderstorm": "#1e3a5f,#3b82f6",
            "Snow": "#bae6fd,#7dd3fc", "Drizzle": "#6366f1,#818cf8",
        }.get(condition, "#667eea,#764ba2")
        g1, g2 = cond_bg.split(",")

        st.markdown(f"""
        <div class="weather-card" style="background: linear-gradient(135deg, {g1} 0%, {g2} 100%);">
          <div style="font-size:3rem;">{
              {"Clear":"☀️","Clouds":"☁️","Rain":"🌧️","Drizzle":"🌦️",
               "Thunderstorm":"⛈️","Snow":"❄️","Mist":"🌫️","Fog":"🌁"}.get(condition,"🌡️")
          }</div>
          <div class="weather-temp">{result.get('temperature_c', 0):.0f}°C</div>
          <div class="weather-cond">{condition} — {result.get('city', '')}</div>
          <br>
          <div style="font-size:13px;opacity:0.85;">
            💧 {result.get('humidity', 0)}% humidity &nbsp;|&nbsp; 💨 {result.get('wind_speed', 0):.1f} m/s wind
          </div>
          <div style="font-size:12px;opacity:0.75;margin-top:8px;">
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
                prio_color = "#ef4444" if prio == "High" else "#f59e0b"
                st.markdown(f"""
                <div class="step-card">
                  <strong><code>{t.get('key')}</code></strong> {t.get('summary', '')[:45]}...
                  <br>
                  <small style="color:{prio_color};">● {prio} priority</small> &nbsp;|&nbsp;
                  <small style="color:#9ca3af;">⏱️ ~{t.get('estimated_hours', 2.0)}h · {t.get('status', 'Open')}</small>
                </div>
                """, unsafe_allow_html=True)

        # GitHub Workload Card
        gh_prs = result.get("github_prs", [])
        gh_issues = result.get("github_issues", [])
        if gh_prs or gh_issues:
            st.markdown(f"### 🐙 GitHub Workload ({result.get('github_estimated_hours', 0):.1f}h est.)")
            for pr in gh_prs[:2]:
                st.markdown(f"""
                <div class="step-card">
                  <strong>PR #{pr.get('number')}:</strong> {pr.get('title', '')[:45]}...
                  <br>
                  <small style="color:#10b981;">{pr.get('state', 'open')} by @{pr.get('user', 'dev')}</small> &nbsp;|&nbsp;
                  <small style="color:#9ca3af;">⏱️ ~{pr.get('review_hours', 1.0)}h review</small>
                </div>
                """, unsafe_allow_html=True)
            for iss in gh_issues[:2]:
                st.markdown(f"""
                <div class="step-card">
                  <strong>Issue #{iss.get('number')}:</strong> {iss.get('title', '')[:45]}...
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
                  <strong>{icon} {ev.get('subject', 'Event')[:50]}</strong><br>
                  <small style="color:#9ca3af;">{ev.get('from', '')[:40]}</small>
                </div>
                """, unsafe_allow_html=True)

        # Integration Results (All 7)
        st.markdown("### 🔗 7 Real-World Integrations")

        int_status = [
            ("☁️ OpenWeather", True, f"{result.get('weather_condition')} fetched ({result.get('temperature_c', 0):.1f}°C)"),
            ("📬 Gmail", True, f"{len(events)} emails analyzed"),
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
            color = "#10b981" if ok else "#6b7280"
            st.markdown(
                f"{icon} **{api_name}** — "
                f"<span style='color:{color};font-size:13px;'>{detail}</span>",
                unsafe_allow_html=True
            )

        if result.get("notion_page_url"):
            st.markdown(f"[📓 Open Notion Day Plan]({result.get('notion_page_url')})")

    # ── Agent Execution Log ────────────────────────────────────────
    with st.expander("🔍 View Full Agent Execution Log", expanded=False):
        for entry in result.get("execution_log", []):
            st.text(entry)

    # ── Processed At ───────────────────────────────────────────────
    st.markdown(f"<small style='color:#6b7280;'>Agent completed at {result.get('processed_at', 'N/A')}</small>",
                unsafe_allow_html=True)

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
                st.info("No runs yet. Click 'Run Agent' to start!")
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

# ── Architecture Diagram ───────────────────────────────────────────
st.markdown("---")
with st.expander("🏗️ Architecture Overview", expanded=False):
    st.markdown("""
    ```
    ┌─────────────────────────────────────────────────────────────────┐
    │                   WEATHERWISE AI AGENT                          │
    │                  Track 5 — AI Real World Agent                  │
    └─────────────────────────────────────────────────────────────────┘

    User Request (Natural Language)
          │
          ▼
    ┌─────────────────┐
    │  [1] OPENWEATHER │  → Current conditions + 24h forecast + alerts
    │  weather_fetcher │    Direct API: api.openweathermap.org
    └────────┬────────┘
             │ Weather data
             ▼
    ┌─────────────────┐
    │  [2] GMAIL       │  → Read inbox → detect outdoor/travel plans
    │  gmail_reader    │    Swytchcode: gmail.messages.list + .get
    └────────┬────────┘
             │ Calendar context
             ▼
    ┌─────────────────┐
    │  [3] GEMINI AI   │  → Combine weather + calendar → recommendations
    │  ai_advisor      │    LLM reasoning: score, risk, outfit, alerts
    └────────┬────────┘
             │ Intelligence output
             ▼
    ┌─────────────────┐
    │  [4] NOTION      │  → Create daily intelligence log page
    │  notion_logger   │    Swytchcode: notion.pages.create
    └────────┬────────┘
             │ Logged + URL
             ▼
    ┌─────────────────┐
    │  [5] SLACK       │  → Alert if risk=high/critical or should_alert=True
    │  slack_notifier  │    Swytchcode: slack.messages.send
    └────────┬────────┘
             │ Notified
             ▼
    ┌─────────────────┐
    │  [6] RESEND      │  → Send beautiful HTML email digest
    │  email_sender    │    Swytchcode: resend.email.create
    └─────────────────┘
             │
             ▼
         Final Response (JSON + UI)

    Agentic Behavior:
    ✅ Agent DECIDES whether to send Slack (based on risk assessment)
    ✅ Agent CHOOSES what to include in email (based on outdoor/travel detection)
    ✅ Agent REASONS about plan feasibility (weather + calendar context)
    ✅ API outputs INFLUENCE subsequent actions
    ```
    """)

# ── Footer ─────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<div style='text-align:center;color:#6b7280;font-size:13px;padding:16px 0;'>"
    "🌦️ <strong>WeatherWise AI Life Agent</strong> · "
    "Track 5: AI Real World Agent · "
    "Build with Swytchcode Hackathon 2026 · "
    "LangGraph + Google Gemini + Swytchcode"
    "</div>",
    unsafe_allow_html=True
)
