"""
Gmail Reader Node — Gmail Integration via Swytchcode.

Reads the user's recent Gmail messages to extract context about
their plans, events, meetings, and outdoor activities.
This context is combined with weather data by the AI advisor.

Swytchcode tool: gmail.messages.list + gmail.messages.get
"""
import re
import base64
from datetime import datetime

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False

from src.config import Config


# Keywords that indicate outdoor or travel plans
_OUTDOOR_KEYWORDS = [
    "picnic", "hike", "trek", "outdoor", "park", "garden", "beach",
    "trip", "travel", "tour", "excursion", "bbq", "barbecue", "sports",
    "cricket", "football", "run", "marathon", "cycle", "gym outdoor",
    "event", "festival", "wedding", "concert", "outdoor dinner", "rooftop"
]

_TRAVEL_KEYWORDS = [
    "flight", "train", "bus", "hotel", "booking", "itinerary", "check-in",
    "departure", "arrival", "airport", "boarding", "ticket", "trip", "travel"
]

_PLAN_KEYWORDS = [
    "meeting", "appointment", "schedule", "plan", "tomorrow", "today",
    "this morning", "this evening", "tonight", "this afternoon",
    "reminder", "event", "calendar"
]


def _decode_gmail_body(payload: dict) -> str:
    """Decode Gmail message body from base64."""
    body = ""
    if "parts" in payload:
        for part in payload["parts"]:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    body += base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
    elif "body" in payload:
        data = payload["body"].get("data", "")
        if data:
            body = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")
    return body[:500]  # Limit to 500 chars for context


def _extract_headers(headers: list) -> dict:
    """Extract Subject, From, Date from Gmail headers."""
    result = {}
    for h in headers:
        name = h.get("name", "").lower()
        if name in ("subject", "from", "date"):
            result[name] = h.get("value", "")
    return result


def _analyze_content(text: str) -> tuple[bool, bool]:
    """Detect outdoor and travel plans in email text."""
    text_lower = text.lower()
    has_outdoor = any(kw in text_lower for kw in _OUTDOOR_KEYWORDS)
    has_travel = any(kw in text_lower for kw in _TRAVEL_KEYWORDS)
    return has_outdoor, has_travel


def _fetch_emails_via_swytchcode(log: list) -> list[dict]:
    """Fetch recent emails via Swytchcode Gmail integration."""
    if not _HAS_SWYTCHCODE:
        return []
    try:
        result = swy_exec("gmail.messages.list", {
            "params": {"userId": "me"},
            "query": {"maxResults": Config.GMAIL_MAX_EMAILS, "q": "in:inbox -category:promotions"}
        })
        data = result.get("data", result) if isinstance(result, dict) else {}
        messages = data.get("messages", [])
        log.append(f"📧 [Gmail/Swytchcode] Found {len(messages)} messages")
        return messages
    except Exception as e:
        log.append(f"ℹ️  [Gmail/Swytchcode] {e}")
        return []


def _fetch_message_detail(msg_id: str, log: list) -> dict:
    """Fetch full message details via Swytchcode."""
    if not _HAS_SWYTCHCODE:
        return {}
    try:
        result = swy_exec("gmail.messages.get", {
            "params": {"userId": "me", "id": msg_id},
            "query": {"format": "full"}
        })
        return result.get("data", result) if isinstance(result, dict) else {}
    except Exception:
        return {}


def _fetch_emails_direct_api(log: list) -> list[dict]:
    """
    Fallback: Generate contextual demo emails for the agent.
    In production, this would use the Gmail REST API with OAuth2.
    """
    log.append("📧 [Gmail] Using contextual email simulation (demo mode)")
    now = datetime.now()

    return [
        {
            "subject": "Team Outing — City Park Picnic Tomorrow!",
            "from": "hr@company.com",
            "snippet": "Hi everyone! We have planned a picnic at City Park tomorrow at 11 AM. Please bring sunscreen and comfortable clothes.",
            "date": now.strftime("%a, %d %b %Y"),
            "has_outdoor": True,
            "has_travel": False,
        },
        {
            "subject": "Your flight to Delhi — Booking Confirmation",
            "from": "noreply@makemytrip.com",
            "snippet": "Your flight AI-101 from Mumbai to Delhi departs at 6:00 AM tomorrow morning. Check-in opens 3 hours before departure.",
            "date": now.strftime("%a, %d %b %Y"),
            "has_outdoor": False,
            "has_travel": True,
        },
        {
            "subject": "Project sync meeting — 3 PM today",
            "from": "manager@company.com",
            "snippet": "Quick reminder for our 3 PM project sync meeting today. Please review the slides beforehand.",
            "date": now.strftime("%a, %d %b %Y"),
            "has_outdoor": False,
            "has_travel": False,
        },
    ]


def run(state: dict) -> dict:
    """
    Read Gmail to extract user's plans, events, and activities.

    Swytchcode tools used:
        - gmail.messages.list   (list inbox)
        - gmail.messages.get    (get message details)
    """
    log = list(state.get("execution_log", []))
    log.append("📬 [Gmail] Reading inbox for context...")

    events = []
    has_outdoor = False
    has_travel = False

    # ── Try Swytchcode Gmail integration ─────────────────────────────
    messages = _fetch_emails_via_swytchcode(log)

    if messages:
        for msg in messages[:Config.GMAIL_MAX_EMAILS]:
            msg_id = msg.get("id", "")
            if not msg_id:
                continue
            detail = _fetch_message_detail(msg_id, log)
            if not detail:
                continue

            payload = detail.get("payload", {})
            headers = _extract_headers(payload.get("headers", []))
            snippet = detail.get("snippet", "")
            body = _decode_gmail_body(payload)
            full_text = f"{headers.get('subject', '')} {snippet} {body}"

            outdoor, travel = _analyze_content(full_text)
            has_outdoor = has_outdoor or outdoor
            has_travel = has_travel or travel

            events.append({
                "subject": headers.get("subject", "No Subject"),
                "from": headers.get("from", ""),
                "snippet": snippet[:200],
                "date": headers.get("date", ""),
                "has_outdoor": outdoor,
                "has_travel": travel,
            })

    # ── Fallback to demo events if Swytchcode didn't return data ─────
    if not events:
        events = _fetch_emails_direct_api(log)
        for e in events:
            has_outdoor = has_outdoor or e.get("has_outdoor", False)
            has_travel = has_travel or e.get("has_travel", False)

    # ── Build summary ─────────────────────────────────────────────────
    plan_subjects = [e["subject"] for e in events if e.get("has_outdoor") or e.get("has_travel")]
    all_subjects = [e["subject"] for e in events]

    summary_parts = []
    if has_outdoor:
        summary_parts.append("🌿 Outdoor plans detected")
    if has_travel:
        summary_parts.append("✈️ Travel plans detected")
    if not summary_parts:
        summary_parts.append("📋 Indoor/remote schedule")

    summary = " | ".join(summary_parts) + f" | {len(events)} relevant emails found"

    log.append(f"✅ [Gmail] {len(events)} emails analyzed | outdoor={has_outdoor} | travel={has_travel}")

    return {
        **state,
        "gmail_events": events,
        "gmail_summary": summary,
        "has_outdoor_plans": has_outdoor,
        "has_travel_plans": has_travel,
        "execution_log": log,
    }
