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


def _build_html_email(state: dict) -> str:
    """Build a beautiful HTML email template."""
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
    events = state.get("gmail_events", [])

    now = datetime.now()
    grad_start, grad_end = _get_condition_color(condition)
    risk_badge = _get_risk_badge(risk)

    # Score bar
    filled = int(score / 10)
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

    notion_btn = (
        f'<a href="{notion_url}" style="display:inline-block;margin-top:16px;padding:10px 24px;'
        f'background:linear-gradient(135deg,{grad_start},{grad_end});color:#fff;text-decoration:none;'
        f'border-radius:8px;font-weight:600;font-size:14px;">📓 View Full Log in Notion</a>'
        if notion_url else ""
    )

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header Card -->
  <div style="background:linear-gradient(135deg,{grad_start},{grad_end});border-radius:16px;padding:32px 28px;color:#fff;margin-bottom:20px;">
    <p style="margin:0 0 4px;font-size:13px;opacity:0.8;">{now.strftime('%A, %B %d, %Y')}</p>
    <h1 style="margin:0 0 8px;font-size:28px;font-weight:800;">🌦️ WeatherWise</h1>
    <p style="margin:0 0 20px;font-size:16px;opacity:0.9;">Daily Intelligence Briefing for <strong>{city}</strong></p>

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
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">🧠 AI Advisory</h2>
    <p style="margin:0;color:#374151;line-height:1.7;font-size:15px;">{summary}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;">
    <p style="margin:0;color:#374151;font-size:14px;">👔 <strong>Outfit Suggestion:</strong> {outfit}</p>
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
    <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">📬 Your Plans Today</h2>
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
    <p style="margin:0;">Powered by <strong style="color:#667eea;">WeatherWise AI Agent</strong></p>
    <p style="margin:4px 0 0;">Swytchcode × LangGraph × Google Gemini × OpenWeather</p>
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

    subject = f"🌦️ WeatherWise: {city} — {condition} {temp:.0f}°C | Risk: {risk} — {datetime.now().strftime('%b %d')}"
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
