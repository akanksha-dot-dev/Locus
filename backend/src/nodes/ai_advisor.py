"""
AI Advisor Node — Gemini-powered Full Day Planner.

Synthesizes ALL 7 data sources into an intelligent, personalized day plan:
  - OpenWeather: current & forecast weather → office/outdoor decision
  - Gmail:       meetings, events, commitments → schedule anchors
  - Jira:        open tickets + priorities → focused work blocks
  - GitHub:      open PRs + assigned issues → code-review windows

Produces:
  - A structured hourly day plan
  - Weather-adjusted office/WFH recommendation
  - Smart scheduling that avoids bad weather for outdoor/commute tasks
  - Risk & alert signals for Slack/email delivery

LLM: Google Gemini via google-genai SDK
Track 5 — AI Real World Agent | Build with Swytchcode
"""
import json
import time
import re
from datetime import datetime
from src.config import Config

# Lazy-load genai client to avoid SSL DLL issues at import time
_client = None


def _get_client():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=Config.GOOGLE_API_KEY)
    return _client


# ─── Master Day-Planner Prompt ──────────────────────────────────────────────
DAY_PLANNER_PROMPT = """\
You are Locus, an elite AI life assistant that plans your user's entire day \
using real-world data from 7 integrated sources. Be actionable, specific, and smart.

=== 1. WEATHER DATA (OpenWeather) ===
City: {city}
Right Now: {weather_summary}
Temperature: {temp}°C (feels like {feels_like}°C) | Humidity: {humidity}% | Wind: {wind_speed} m/s
Condition: {condition}
24h Forecast: {forecast}
Weather Alerts: {alerts}

=== 2. GMAIL INBOX CONTEXT ===
{gmail_summary}
Today's emails/events:
{gmail_events}
Has outdoor plans: {has_outdoor}
Has travel plans: {has_travel}

=== 3. JIRA WORKLOAD ===
{jira_summary}
Open tickets:
{jira_issues}

=== 4. GITHUB WORKLOAD ===
{github_summary}
Open PRs and issues:
{github_prs}
{github_issues}
Stale PRs needing urgent review: {stale_pr_count}

=== 5. USER REQUEST ===
{user_request}

Today's date/time: {now}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTRUCTIONS:
1. Analyze ALL 4 data sources holistically.
2. Decide whether the user should go to office, work from home, or hybrid \
   based on weather + commute risk + meeting nature.
3. Build a realistic hourly day plan that:
   - Schedules Jira tasks by priority (High/Highest first)
   - Slots in GitHub PR reviews in focused windows
   - Respects Gmail meetings/events as hard anchors
   - Adjusts outdoor/commute time based on weather
   - Considers human factors: breaks, energy levels, focus time
4. Flag any weather/work conflicts (e.g., outdoor meeting + rain, stale PRs, blocked tickets)

Respond with ONLY a JSON object — no extra text:
{{
  "weather_score": <integer 0-100, 100=perfect day>,
  "risk_level": "<low|medium|high|critical>",
  "go_to_office": "<office|wfh|hybrid>",
  "office_reason": "<1-sentence reason for office decision>",
  "estimated_productive_hours": <float, total focused work hours available>,
  "day_plan_timeline": [
    "<HH:MM–HH:MM: Activity description>",
    "..."
  ],
  "recommendations": [<3-6 specific, actionable tips as strings>],
  "outfit_suggestion": "<specific clothing for today's weather>",
  "activity_adjustments": [<1-4 suggested changes to existing plans>],
  "ai_summary": "<3-4 sentence intelligent briefing combining weather+work+plans>",
  "should_alert": <true if weather is bad OR stale PRs OR blocked tickets OR conflicts>
}}

Be specific. Reference actual Jira tickets, PR numbers, Gmail events by name. \
RETURN ONLY VALID JSON.
"""


def _call_gemini_with_retry(prompt: str, log: list) -> dict:
    """Call Gemini with exponential backoff retry logic."""
    client = _get_client()
    last_err = None
    for attempt in range(4):
        try:
            chat = client.chats.create(model=Config.LLM_MODEL)
            response = chat.send_message(prompt)
            if response and response.text:
                return response
        except Exception as e:
            last_err = e
            err_str = str(e)
            retry_after = None
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                m = re.search(r"retryDelay['\"]?\s*[:\s]+['\"]?(\d+(?:\.\d+)?)s", err_str)
                if m:
                    retry_after = min(float(m.group(1)) + 2, 90)

            if retry_after and attempt < 3:
                log.append(f"⏳ [Gemini] Rate limited — waiting {int(retry_after)}s...")
                time.sleep(retry_after)
            elif attempt < 3:
                time.sleep(2 ** attempt)

    raise last_err or Exception("Gemini returned empty response")


def _parse_json_response(text: str) -> dict:
    """Parse JSON from Gemini response, handling markdown fences."""
    text = text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _heuristic_fallback(state: dict, log: list) -> dict:
    """Generate smart day plan using heuristics when LLM is unavailable."""
    condition = state.get("weather_condition", "Clear")
    temp = state.get("temperature_c", 25)
    has_outdoor = state.get("has_outdoor_plans", False)
    has_travel = state.get("has_travel_plans", False)
    jira_hours = state.get("jira_total_hours", 0.0)
    github_hours = state.get("github_total_hours", 0.0)
    jira_high = state.get("jira_high_priority", 0)
    stale_prs = state.get("github_stale_prs", [])
    blocked = state.get("jira_blocked_count", 0)

    bad_conditions = {"Thunderstorm", "Rain", "Snow", "Tornado"}
    is_bad_weather = condition in bad_conditions or temp > 40 or temp < 5

    # Office/WFH decision — canonical values: "office", "wfh", "hybrid"
    if is_bad_weather and has_travel:
        go_office = "wfh"
        office_reason = f"Severe {condition} weather — work from home strongly advised"
    elif is_bad_weather:
        go_office = "hybrid"
        office_reason = f"{condition} today — consider going in after weather improves"
    else:
        go_office = "office"
        office_reason = "Favorable weather and commute conditions for working from office"

    total_hours = min(8.0, jira_hours + github_hours)
    score = 20 if is_bad_weather else (40 if condition in {"Mist", "Haze"} else 80)

    # Build a simple timeline
    timeline = [
        "07:00–08:00: Morning routine + review today's weather briefing",
        "08:00–09:00: Commute / WFH setup",
    ]
    cur_hour = 9
    for issue in state.get("jira_issues", [])[:3]:
        h = issue.get("estimated_hours", 2)
        end_h = min(cur_hour + int(h), 12)
        timeline.append(f"{cur_hour:02d}:00–{end_h:02d}:00: [Jira {issue['key']}] {issue['summary']}")
        cur_hour = end_h
    if cur_hour <= 12:
        timeline.append("12:00–13:00: Lunch break")
        cur_hour = 13
    for pr in state.get("github_prs", [])[:2]:
        timeline.append(f"{cur_hour:02d}:00–{cur_hour + 1:02d}:00: [GitHub PR #{pr['number']}] Review: {pr['title']}")
        cur_hour += 1
    timeline.append("17:00–17:30: End-of-day standup / wrap-up")
    timeline.append("17:30–18:00: Log progress in Notion + plan tomorrow")

    recs = ["🗓️ Prioritize your High-priority Jira tickets first thing in the morning"]
    if stale_prs:
        recs.append(f"🐙 Review {len(stale_prs)} stale PR(s) today — they're overdue")
    if blocked:
        recs.append(f"🚫 {blocked} Jira ticket(s) are blocked — escalate before EOD")
    if is_bad_weather:
        recs.append("🌂 Bad weather — keep umbrella handy for any outdoor trips")
    recs.append("⚡ Use morning focus time for deep Jira work, afternoons for PR reviews")
    recs.append("📧 Check Gmail at 9 AM and 3 PM to stay on top of communications")

    summary = (
        f"Today in {state.get('city', 'your city')}: {condition} at {temp:.0f}°C. "
        f"You have ~{total_hours:.0f}h of work across {len(state.get('jira_issues',[]))} Jira tickets "
        f"and {len(state.get('github_prs', []))} GitHub PRs. "
        f"Office recommendation: {go_office.upper()} ({office_reason})."
    )

    should_alert = is_bad_weather or bool(stale_prs) or blocked > 0

    log.append(f"🧠 [Heuristic] Day plan generated (score={score}, office={go_office})")

    return {
        "jira_tickets": state.get("jira_tickets") or state.get("jira_issues", []),
        "weather_score": score,
        "risk_level": "high" if is_bad_weather else "low",
        "go_to_office": go_office,
        "office_reason": office_reason,
        "estimated_productive_hours": total_hours,
        "day_plan_timeline": timeline,
        "recommendations": recs,
        "outfit_suggestion": (
            "Waterproof jacket and boots" if is_bad_weather
            else "Smart casual — light jacket for evenings"
        ),
        "activity_adjustments": [],
        "ai_summary": summary,
        "should_alert": should_alert,
    }


def run(state: dict) -> dict:
    """
    Generate a full AI-powered Day Plan using all 7 data sources.

    Inputs from state:
        weather_fetcher  → weather_summary, condition, temp, forecast, alerts
        gmail_reader     → gmail_events, has_outdoor_plans, has_travel_plans
        jira_workload    → jira_issues, jira_summary, jira_total_hours
        github_workload  → github_prs, github_issues_open, github_summary

    Outputs to state:
        weather_score, risk_level, go_to_office, day_plan_timeline,
        recommendations, outfit_suggestion, ai_summary, should_alert,
        estimated_productive_hours
    """
    log = list(state.get("execution_log", []))
    log.append("🧠 [Gemini] Synthesizing weather + Gmail + Jira + GitHub → full day plan...")

    # ── Format Jira issues for prompt ──────────────────────────────
    jira_issues_text = "\n".join(
        state.get("jira_issue_lines", [])
    ) or "No Jira issues found"

    # ── Format GitHub PRs for prompt ───────────────────────────────
    prs = state.get("github_prs", [])
    pr_text = "\n".join(
        f"  PR #{pr.get('number')} [{pr.get('days_old', 0)}d old]: {pr.get('title', '')}"
        for pr in prs[:8]
    ) or "No open PRs"

    gh_issues = state.get("github_issues_open", [])
    gh_issue_text = "\n".join(
        f"  Issue #{i.get('number')}: {i.get('title', '')}"
        for i in gh_issues[:5]
    ) or "No assigned issues"

    # ── Format Gmail events for prompt ─────────────────────────────
    events = state.get("gmail_events", [])
    events_text = "\n".join(
        f"  - {e.get('subject', 'No subject')} (from: {e.get('from', '')})"
        for e in events[:6]
    ) or "No specific events found"

    alerts_text = "\n".join(state.get("weather_alerts", [])) or "None"
    now_str = datetime.now().strftime("%A, %d %B %Y %I:%M %p")

    prompt = DAY_PLANNER_PROMPT.format(
        city=state.get("city", Config.DEFAULT_CITY),
        weather_summary=state.get("weather_summary", "Weather data unavailable"),
        temp=state.get("temperature_c", 25),
        feels_like=state.get("feels_like_c", 25),
        humidity=state.get("humidity", 60),
        wind_speed=state.get("wind_speed", 5),
        condition=state.get("weather_condition", "Clear"),
        forecast=state.get("forecast_summary", "N/A"),
        alerts=alerts_text,
        gmail_summary=state.get("gmail_summary", "No Gmail context"),
        gmail_events=events_text,
        has_outdoor=state.get("has_outdoor_plans", False),
        has_travel=state.get("has_travel_plans", False),
        jira_summary=state.get("jira_summary", "No Jira data"),
        jira_issues=jira_issues_text,
        github_summary=state.get("github_summary", "No GitHub data"),
        github_prs=pr_text,
        github_issues=gh_issue_text,
        stale_pr_count=len(state.get("github_stale_prs", [])),
        user_request=state.get("user_request", "Plan my day"),
        now=now_str,
    )

    try:
        response = _call_gemini_with_retry(prompt, log)
        result = _parse_json_response(response.text)

        score    = int(result.get("weather_score", 70))
        risk     = result.get("risk_level", "low")
        prod_h   = float(result.get("estimated_productive_hours", 6.0))
        timeline = result.get("day_plan_timeline", [])
        recs     = result.get("recommendations", [])
        outfit   = result.get("outfit_suggestion", "Comfortable attire")
        adjusts  = result.get("activity_adjustments", [])
        summary  = result.get("ai_summary", "")
        alert    = bool(result.get("should_alert", False))

        # Normalize go_to_office — Gemini may return yes/no/office/wfh/hybrid
        raw_office = str(result.get("go_to_office", "wfh")).lower().strip()
        if raw_office in ("yes", "office", "go", "commute", "true"):
            go_to = "office"
        elif raw_office in ("hybrid", "partial", "flex"):
            go_to = "hybrid"
        else:
            go_to = "wfh"

        reason = (result.get("office_reason") or "").strip()
        if not reason:
            if go_to == "office":
                reason = "Weather and schedule are favorable for commuting to office."
            elif go_to == "hybrid":
                reason = "Weather or schedule suggests flexible / hybrid commute hours."
            else:
                reason = "Weather conditions or focused workload make working from home optimal."

        log.append(
            f"✅ [Gemini] Day plan complete — score={score}/100, office={go_to}, "
            f"~{prod_h}h productive, {len(timeline)} timeline blocks"
        )

        return {
            **state,
            "jira_tickets":               state.get("jira_tickets") or state.get("jira_issues", []),
            "weather_score":              score,
            "risk_level":                 risk,
            "go_to_office":               go_to,
            "office_reason":              reason,
            "estimated_productive_hours": prod_h,
            "day_plan_timeline":          timeline,
            "recommendations":            recs,
            "outfit_suggestion":          outfit,
            "activity_adjustments":       adjusts,
            "ai_summary":                 summary,
            "should_alert":               alert,
            "execution_log":              log,
        }

    except Exception as e:
        log.append(f"⚠️ [Gemini] LLM error ({e}) — using heuristic day planner")
        fallback = _heuristic_fallback(state, log)
        return {**state, **fallback, "execution_log": log}
