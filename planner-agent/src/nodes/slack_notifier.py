"""
Slack Notifier Node — Slack Integration via Swytchcode + Webhook.

Sends weather alerts and intelligent briefings to a Slack channel
when the AI advisor determines conditions warrant a notification
(bad weather, plan conflicts, severe alerts).

Swytchcode tools: slack.messages.send
Fallback: Slack Incoming Webhook
"""
import requests
from datetime import datetime
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False


def _build_slack_blocks(state: dict) -> list[dict]:
    """Build rich Slack Block Kit message blocks for the full Day Plan."""
    city = state.get("city", "Unknown City")
    condition = state.get("weather_condition", "Unknown")
    temp = state.get("temperature_c", 0)
    feels_like = state.get("feels_like_c", 0)
    humidity = state.get("humidity", 0)
    wind = state.get("wind_speed", 0)
    score = state.get("weather_score", 50)
    risk = state.get("risk_level", "medium").upper()
    summary = state.get("ai_summary", "")
    recommendations = state.get("recommendations", [])
    alerts = state.get("weather_alerts", [])
    outfit = state.get("outfit_suggestion", "")
    notion_url = state.get("notion_page_url", "")
    go_to = state.get("go_to_office", "?").upper()
    office_reason = state.get("office_reason", "")
    prod_hours = state.get("estimated_productive_hours", 0)
    jira_summary = state.get("jira_summary", "")
    github_summary = state.get("github_summary", "")
    timeline = state.get("day_plan_timeline", [])

    # Risk color & emoji
    risk_map = {
        "LOW":      ("🟢", "Good"),
        "MEDIUM":   ("🟡", "Moderate"),
        "HIGH":     ("🔴", "High Risk"),
        "CRITICAL": ("⛔", "Critical"),
    }
    risk_emoji, risk_label = risk_map.get(risk, ("🟡", "Moderate"))

    # Office emoji
    office_map = {"YES": "🏢 Go to Office", "NO": "🏠 Work From Home", "HYBRID": "🔀 Hybrid"}
    office_label = office_map.get(go_to, f"❓ {go_to}")

    # Score bar
    filled = int(score / 10)
    bar = "█" * filled + "░" * (10 - filled)

    recs_text = "\n".join(f"• {r}" for r in recommendations[:4])
    alerts_text = "\n".join(f":warning: {a}" for a in alerts) if alerts else ""
    timeline_preview = "\n".join(f"> {t}" for t in timeline[:5])

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"📅 SwytchAgent Day Plan — {city}",
                "emoji": True
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*🌤️ Weather*\n{condition} · {temp:.1f}°C (feels {feels_like:.1f}°C)\n💧 {humidity}% · 💨 {wind:.1f} m/s"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*{office_label}*\n_{office_reason}_\n\n*⚡ Productive Hours*\n~{prod_hours}h available today"
                },
            ]
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Weather Score*\n`{bar}` {score}/100"
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Risk Level*\n{risk_emoji} {risk_label}"
                }
            ]
        },
        {"type": "divider"},
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*🧠 AI Advisory*\n{summary}"
            }
        },
    ]

    # Day plan preview
    if timeline_preview:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*⏰ Day Plan (first 5 blocks)*\n{timeline_preview}"
            }
        })

    blocks.append({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": f"*📋 Jira*\n{jira_summary or 'No data'}"
            },
            {
                "type": "mrkdwn",
                "text": f"*🐙 GitHub*\n{github_summary or 'No data'}"
            },
        ]
    })

    blocks.append({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": f"*📋 Recommendations*\n{recs_text}"
        }
    })

    blocks.append({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": f"*👔 Outfit*\n{outfit}"
        }
    })

    if alerts_text:
        blocks.append({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": f"*⚠️ Weather Alerts*\n{alerts_text}"
            }
        })

    if notion_url:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {"type": "plain_text", "text": "📓 View Full Day Plan in Notion"},
                    "url": notion_url,
                    "style": "primary"
                }
            ]
        })

    blocks.append({
        "type": "context",
        "elements": [
            {
                "type": "mrkdwn",
                "text": f"SwytchAgent Day Planner | {datetime.now().strftime('%d %b %Y, %I:%M %p')} | OpenWeather × Gmail × Jira × GitHub × Notion × Slack × Resend"
            }
        ]
    })

    return blocks


def _send_via_swytchcode(blocks: list, text: str, log: list) -> bool:
    """Send Slack message via Swytchcode."""
    if not _HAS_SWYTCHCODE:
        return False
    try:
        result = swy_exec("slack.messages.send", {
            "body": {
                "channel": Config.SLACK_CHANNEL,
                "text": text,
                "blocks": blocks,
            }
        })
        data = result.get("data", result) if isinstance(result, dict) else {}
        if data.get("ok") or result.get("ok"):
            log.append(f"✅ [Slack/Swytchcode] Message sent to {Config.SLACK_CHANNEL}")
            return True
    except Exception as e:
        log.append(f"ℹ️  [Slack/Swytchcode] {e}")
    return False


def _send_via_webhook(blocks: list, text: str, log: list) -> bool:
    """Send Slack message via Incoming Webhook."""
    webhook_url = Config.SLACK_WEBHOOK_URL
    if not webhook_url:
        log.append("⚠️ [Slack] No webhook URL configured — skipping Slack send")
        return False

    try:
        resp = requests.post(
            webhook_url,
            json={"text": text, "blocks": blocks},
            timeout=10,
        )
        if resp.status_code == 200:
            log.append(f"✅ [Slack/Webhook] Message sent to {Config.SLACK_CHANNEL}")
            return True
        else:
            log.append(f"⚠️ [Slack/Webhook] {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.append(f"❌ [Slack/Webhook] Error: {e}")
    return False


def run(state: dict) -> dict:
    """
    Send weather briefing and alerts to Slack.

    This node only sends if should_alert=True OR risk_level is high/critical.
    Swytchcode tools used: slack.messages.send
    Fallback: Slack Incoming Webhook
    """
    log = list(state.get("execution_log", []))

    should_alert = state.get("should_alert", False)
    risk = state.get("risk_level", "low")

    # Send if: explicit alert needed, or high/critical risk
    should_send = should_alert or risk in ("high", "critical")

    if not should_send:
        log.append("ℹ️  [Slack] No alert conditions met — skipping Slack notification")
        return {
            **state,
            "slack_message_sent": False,
            "slack_channel": Config.SLACK_CHANNEL,
            "execution_log": log,
        }

    log.append(f"📢 [Slack] Sending weather alert to {Config.SLACK_CHANNEL}...")

    city = state.get("city", "Unknown City")
    condition = state.get("weather_condition", "Unknown")
    temp = state.get("temperature_c", 0)
    risk_label = risk.upper()
    fallback_text = f"🌦️ WeatherWise Alert: {city} — {condition} at {temp:.1f}°C | Risk: {risk_label}"

    blocks = _build_slack_blocks(state)

    # ── Try Swytchcode ───────────────────────────────────────────────
    sent = _send_via_swytchcode(blocks, fallback_text, log)

    # ── Fallback to Webhook ──────────────────────────────────────────
    if not sent:
        sent = _send_via_webhook(blocks, fallback_text, log)

    if not sent:
        log.append("⚠️ [Slack] Message not sent — configure SLACK_WEBHOOK_URL or Swytchcode Slack integration")

    return {
        **state,
        "slack_message_sent": sent,
        "slack_channel": Config.SLACK_CHANNEL,
        "execution_log": log,
    }
