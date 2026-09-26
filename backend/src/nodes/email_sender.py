"""
Email Sender Node — Resend Integration via Swytchcode.

Sends a beautiful HTML daily weather briefing email to the user
with personalized recommendations, outfit suggestions, and plan alerts.

Swytchcode tools: resend.email.create
Fallback: Direct Resend REST API
"""
import os
import requests
from datetime import datetime
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False

_RESEND_SANDBOX_SENDER = "onboarding@resend.dev"


def _get_condition_color(condition: str) -> str:
    """Get gradient colors based on weather condition."""
    colors = {
        "Clear": ("#f59e0b", "#fbbf24"),
        "Clouds": ("#6b7280", "#9ca3af"),
        "Rain": ("#3b82f6", "#60a5fa"),
        "Drizzle": ("#6366f1", "#818cf8"),
        "Thunderstorm": ("#1e3a5f", "#3b82f6"),
        "Snow": ("#e0f2fe", "#bae6fd"),
        "Mist": ("#d1d5db", "#9ca3af"),
        "Fog": ("#d1d5db", "#9ca3af"),
    }
    return colors.get(condition, ("#667eea", "#764ba2"))


def _get_risk_badge(risk: str) -> str:
    """Get colored HTML badge for risk level."""
    badge_map = {
        "low":      ("#10b981", "🟢 LOW RISK"),
        "medium":   ("#f59e0b", "🟡 MODERATE"),
        "high":     ("#ef4444", "🔴 HIGH RISK"),
        "critical": ("#7c3aed", "⛔ CRITICAL"),
    }
    color, label = badge_map.get(risk, ("#6b7280", "UNKNOWN"))
    return f'<span style="background:{color};color:#fff;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">{label}</span>'


def _get_office_badge(go_to: str) -> tuple[str, str, str]:
    """Get stylized (bg_color, text_color, label) for Office vs WFH recommendation badge."""
    val = (go_to or "wfh").strip().upper()
    if val in ("OFFICE", "YES"):
        return ("#10b981", "#ffffff", "🏢 WORK FROM OFFICE")
    elif val in ("HYBRID", "FLEX"):
        return ("#f59e0b", "#ffffff", "🔀 HYBRID WORK")
    else:
        return ("#4f46e5", "#ffffff", "🏠 WORK FROM HOME")


def _build_html_email(state: dict) -> str:
    """Build a beautiful executive Day Planner HTML email template."""
    city = state.get("city", "Your City")
    condition = state.get("weather_condition", "Unknown")
    temp = state.get("temperature_c", 0)
    feels_like = state.get("feels_like_c", 0)
    humidity = state.get("humidity", 0)
    wind = state.get("wind_speed", 0)
    score = state.get("weather_score", 50)
    risk = state.get("risk_level", "low")
    summary = state.get("ai_summary", "")
    recommendations = state.get("recommendations", [])
    outfit = state.get("outfit_suggestion", "")
    alerts = state.get("weather_alerts", [])
    forecast = state.get("forecast_summary", "")
    notion_url = state.get("notion_page_url", "")
    if not notion_url and Config.NOTION_KB_DATABASE_ID:
        notion_url = f"https://notion.so/{Config.NOTION_KB_DATABASE_ID}"
    events = state.get("gmail_events", [])
    go_to = state.get("go_to_office", "wfh")
    office_reason = state.get("office_reason", "")
    prod_hours = state.get("estimated_productive_hours", 0)
    jira_summary = state.get("jira_summary", "")
    github_summary = state.get("github_summary", "")

    now = datetime.now()
    grad_start, grad_end = _get_condition_color(condition)
    risk_badge = _get_risk_badge(risk)
    office_bg, office_fg, office_badge_label = _get_office_badge(go_to)

    # Score bar
    filled = max(0, min(10, int(score / 10)))
    score_bar = "█" * filled + "░" * (10 - filled)

    # Recommendations HTML
    recs_html = "".join(
        f'<li style="margin-bottom:10px;padding:8px 12px;background:#f8fafc;border-radius:8px;'
        f'border-left:3px solid {grad_start};">{rec}</li>'
        for rec in recommendations
    )

    # Alerts HTML
    alerts_html = "".join(
        f'<div style="padding:10px 14px;background:#fef2f2;border-radius:8px;'
        f'border-left:3px solid #ef4444;margin-bottom:8px;color:#991b1b;">{alert}</div>'
        for alert in alerts
    ) if alerts else '<div style="color:#6b7280;">No severe weather alerts today ✅</div>'

    # Events HTML
    events_html = "".join(
        f'<li style="margin-bottom:6px;color:#374151;">'
        f'{"🌿 " if e.get("has_outdoor") else "✈️ " if e.get("has_travel") else "📅 "}'
        f'{e.get("subject", "Event")}</li>'
        for e in events[:4]
    ) or "<li style='color:#6b7280;'>No upcoming events found</li>"

    # Hourly Timeline Table
    timeline = state.get("day_plan_timeline", [])
    timeline_rows = []
    for item in timeline:
        if isinstance(item, dict):
            t_time = item.get("time", "")
            t_act = item.get("activity", "")
        else:
            item_str = str(item).strip()
            if ":" in item_str and any(sep in item_str.split(":", 1)[0] for sep in ("–", "-", "to")):
                parts = item_str.split(":", 1)
                t_time = parts[0].strip()
                t_act = parts[1].strip()
            else:
                t_time = "•"
                t_act = item_str
        timeline_rows.append(
            f'<tr style="border-bottom:1px solid #f1f5f9;">'
            f'<td style="padding:10px 8px;font-size:13px;font-weight:700;color:#4f46e5;white-space:nowrap;vertical-align:top;width:120px;">{t_time}</td>'
            f'<td style="padding:10px 8px;font-size:13px;color:#334155;line-height:1.5;">{t_act}</td>'
            f'</tr>'
        )
    timeline_table_html = (
        f'<table style="width:100%;border-collapse:collapse;margin-top:8px;">{"".join(timeline_rows)}</table>'
        if timeline_rows else '<p style="color:#6b7280;margin:0;">No schedule timeline generated</p>'
    )

    # Jira Workload Breakdown
    jira_tickets = state.get("jira_tickets") or state.get("jira_issues", [])
    jira_items_html = []
    for issue in jira_tickets[:6]:
        key = issue.get("key", "JIRA")
        summary_txt = issue.get("summary", "")
        prio = issue.get("priority", "Normal")
        est_h = issue.get("estimated_hours", 2)
        prio_color = "#ef4444" if prio.lower() in ("high", "highest", "critical") else ("#f59e0b" if prio.lower() in ("medium", "major") else "#10b981")
        jira_items_html.append(
            f'<li style="margin-bottom:8px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #0052cc;">'
            f'<div style="font-size:13px;font-weight:700;color:#0052cc;margin-bottom:3px;display:flex;justify-content:space-between;">'
            f'<span>{key} · <span style="color:{prio_color};font-weight:600;">{prio}</span></span>'
            f'<span style="color:#64748b;font-size:12px;">~{est_h}h</span>'
            f'</div>'
            f'<div style="font-size:13px;color:#334155;line-height:1.4;">{summary_txt}</div>'
            f'</li>'
        )
    jira_breakdown_html = (
        f'<ul style="margin:8px 0 0;padding:0;list-style:none;">{"".join(jira_items_html)}</ul>'
        if jira_items_html else '<p style="color:#6b7280;margin:0;">No open Jira tickets assigned today ✅</p>'
    )

    # GitHub PRs Breakdown
    prs = state.get("github_prs", [])
    pr_items_html = []
    for pr in prs[:6]:
        num = pr.get("number", 0)
        title = pr.get("title", "")
        author = pr.get("author") or pr.get("user", "")
        est_h = pr.get("estimated_hours") or pr.get("est_hours") or pr.get("review_hours", 1.5)
        days = pr.get("days_old", 0)
        stale_tag = ' <span style="background:#ef4444;color:#fff;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:bold;">STALE</span>' if days >= 3 else ''
        pr_items_html.append(
            f'<li style="margin-bottom:8px;padding:10px 14px;background:#f8fafc;border-radius:8px;border-left:3px solid #24292f;">'
            f'<div style="font-size:13px;font-weight:700;color:#24292f;margin-bottom:3px;display:flex;justify-content:space-between;">'
            f'<span>PR #{num}{stale_tag} · <span style="color:#64748b;font-weight:normal;">@{author}</span></span>'
            f'<span style="color:#64748b;font-size:12px;">~{est_h}h review</span>'
            f'</div>'
            f'<div style="font-size:13px;color:#334155;line-height:1.4;">{title}</div>'
            f'</li>'
        )
    github_breakdown_html = (
        f'<ul style="margin:8px 0 0;padding:0;list-style:none;">{"".join(pr_items_html)}</ul>'
        if pr_items_html else '<p style="color:#6b7280;margin:0;">No pull requests requiring review today ✅</p>'
    )

    notion_btn = (
        f'<a href="{notion_url}" style="display:inline-block;margin-top:16px;padding:10px 24px;'
        f'background:linear-gradient(135deg,{grad_start},{grad_end});color:#fff;text-decoration:none;'
        f'border-radius:8px;font-weight:600;font-size:14px;">📓 View Full Log in Notion</a>'
        if notion_url else ""
    )

    office_reason_display = office_reason or "Conditions and commitments are aligned for today's schedule."

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header Card -->
  <div style="background:linear-gradient(135deg,{grad_start},{grad_end});border-radius:16px;padding:32px 28px;color:#fff;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:13px;opacity:0.8;">{now.strftime('%A, %B %d, %Y')}</p>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;">⚡ Locus Day Planner</h1>
    <p style="margin:0 0 20px;font-size:16px;opacity:0.9;">Daily Executive Briefing for <strong>{city}</strong></p>

    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <div style="background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 16px;min-width:120px;">
        <div style="font-size:32px;font-weight:800;">{temp:.0f}°C</div>
        <div style="font-size:12px;opacity:0.85;">Feels {feels_like:.0f}°C</div>
      </div>
      <div style="background:rgba(255,255,255,0.2);border-radius:12px;padding:12px 16px;">
        <div style="font-size:18px;font-weight:700;">{condition}</div>
        <div style="font-size:12px;opacity:0.85;">💧 {humidity}% | 💨 {wind:.1f} m/s</div>
      </div>
    </div>
  </div>

  <!-- Office vs WFH Recommendation Card -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">🏢 Work Location Recommendation</h2>
    <div style="margin-bottom:12px;">
      <span style="background:{office_bg};color:{office_fg};padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;display:inline-block;">{office_badge_label}</span>
    </div>
    <p style="margin:0 0 14px;color:#4b5563;font-size:14px;line-height:1.6;"><em>{office_reason_display}</em></p>
    <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;border-left:4px solid {office_bg};">
      <span style="font-size:13px;color:#1e293b;"><strong>⚡ Estimated Productive Hours Today:</strong> ~{prod_hours}h focused work</span>
    </div>
  </div>

  <!-- Score + Risk -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">📊 Weather Assessment</h2>
    <div style="margin-bottom:12px;">
      <span style="font-size:13px;color:#6b7280;">Weather Score:</span>
      <code style="display:block;margin:4px 0;font-size:16px;color:#374151;letter-spacing:2px;">{score_bar} {score}/100</code>
    </div>
    <div>
      <span style="font-size:13px;color:#6b7280;">Risk Level: </span>
      {risk_badge}
    </div>
  </div>

  <!-- AI Summary -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">🧠 AI Executive Advisory</h2>
    <p style="margin:0;color:#374151;line-height:1.7;font-size:15px;">{summary}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="margin:0;color:#374151;font-size:14px;">👔 <strong>Outfit Suggestion:</strong> {outfit}</p>
  </div>

  <!-- Hourly Schedule Timeline -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">⏰ Personalised Day Plan Schedule</h2>
    <p style="margin:0 0 12px;font-size:12px;color:#6b7280;">Optimized around meetings, weather, and deep focus blocks</p>
    {timeline_table_html}
  </div>

  <!-- Jira Workload Breakdown -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">📋 Jira Workload Breakdown</h2>
    <p style="margin:0 0 12px;font-size:13px;color:#4b5563;">{jira_summary or 'Assigned tasks summary'}</p>
    {jira_breakdown_html}
  </div>

  <!-- GitHub Workload Breakdown -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">🐙 GitHub Pull Requests Breakdown</h2>
    <p style="margin:0 0 12px;font-size:13px;color:#4b5563;">{github_summary or 'Review queue summary'}</p>
    {github_breakdown_html}
  </div>

  <!-- Recommendations -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 16px;font-size:18px;color:#111827;">📋 Smart Recommendations</h2>
    <ul style="margin:0;padding:0 0 0 0;list-style:none;">{recs_html}</ul>
  </div>

  <!-- Alerts -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">⚠️ Weather Alerts</h2>
    {alerts_html}
  </div>

  <!-- Gmail Events -->
  <div style="background:#fff;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">📬 Today's Schedule Anchors (Gmail)</h2>
    <ul style="margin:0;padding-left:16px;line-height:1.8;">{events_html}</ul>
  </div>

  <!-- Forecast -->
  <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #e5e7eb;">
    <p style="margin:0;font-size:13px;color:#6b7280;">🔮 <strong>Forecast:</strong> {forecast}</p>
  </div>

  <!-- Notion CTA -->
  {notion_btn}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0 8px;color:#9ca3af;font-size:12px;">
    <p style="margin:0;">Powered by <strong style="color:#667eea;">Locus Day Planner v2.0</strong></p>
    <p style="margin:4px 0 0;">OpenWeather × Gmail × Jira × GitHub × Notion × Slack × Resend</p>
  </div>
</div>
</body>
</html>
""".strip()


def _send_via_swytchcode(recipient: str, subject: str, html: str, log: list) -> str | None:
    """Send email via Swytchcode Resend integration."""
    if not _HAS_SWYTCHCODE:
        return None
    try:
        from_email = Config.RESEND_FROM_EMAIL or _RESEND_SANDBOX_SENDER
        result = swy_exec("resend.email.create", {
            "body": {
                "from": from_email,
                "to": [recipient],
                "subject": subject,
                "html": html,
            }
        })
        data = result.get("data", result) if isinstance(result, dict) else {}
        msg_id = data.get("id") or result.get("id")
        if msg_id:
            log.append(f"✅ [Resend/Swytchcode] Email sent (ID: {msg_id})")
            return msg_id
    except Exception as e:
        log.append(f"ℹ️  [Resend/Swytchcode] {e}")
    return None


def _send_via_rest(recipient: str, subject: str, html: str, log: list) -> str | None:
    """Send email via direct Resend REST API."""
    api_key = Config.RESEND_API_KEY
    if not api_key:
        log.append("⚠️ [Resend] No API key configured")
        return None

    from_email = Config.RESEND_FROM_EMAIL or _RESEND_SANDBOX_SENDER

    # Sandbox routing: onboarding@resend.dev can only send to account owner
    is_sandbox = from_email == _RESEND_SANDBOX_SENDER
    actual_recipient = recipient

    if is_sandbox:
        owner_email = Config.JIRA_EMAIL or os.getenv("RESEND_ACCOUNT_EMAIL", "")
        if owner_email and owner_email != recipient:
            actual_recipient = owner_email
            log.append(f"⚠️ [Resend] Sandbox mode: routing to {owner_email}")

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": from_email,
                "to": [actual_recipient],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if resp.status_code in (200, 201):
            msg_id = resp.json().get("id", "unknown")
            log.append(f"✅ [Resend/REST] Email sent to {actual_recipient} (ID: {msg_id})")
            return msg_id
        else:
            log.append(f"⚠️ [Resend/REST] {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.append(f"❌ [Resend/REST] Error: {e}")
    return None


def run(state: dict) -> dict:
    """
    Send daily weather briefing email via Resend.

    Swytchcode tools used: resend.email.create
    Fallback: Direct Resend REST API
    """
    log = list(state.get("execution_log", []))

    recipient = state.get("user_email") or Config.RESEND_TO_EMAIL or Config.JIRA_EMAIL
    if not recipient:
        log.append("⚠️ [Resend] No recipient email — skipping send")
        return {**state, "email_sent": False, "execution_log": log}

    city = state.get("city", "Your City")
    risk = state.get("risk_level", "low").upper()
    condition = state.get("weather_condition", "")
    temp = state.get("temperature_c", 0)

    go_to = (state.get("go_to_office") or "wfh").upper()
    subject = f"⚡ Locus: {city} — {go_to} | {condition} {temp:.0f}°C | Risk: {risk} — {datetime.now().strftime('%b %d')}"
    log.append(f"📤 [Resend] Sending daily briefing to {recipient}...")

    html = _build_html_email(state)

    # ── Try Swytchcode ───────────────────────────────────────────────
    msg_id = _send_via_swytchcode(recipient, subject, html, log)

    # ── Fallback to REST ─────────────────────────────────────────────
    if not msg_id:
        msg_id = _send_via_rest(recipient, subject, html, log)

    return {
        **state,
        "resend_message_id": msg_id,
        "email_sent": bool(msg_id),
        "execution_log": log,
    }
