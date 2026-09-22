"""
Email Ingestion Node — Gmail Integration via Swytchcode.

Fetches unread support emails from Gmail using `gmail.messages.list`
and `gmail.messages.get` tools through the Swytchcode execution pipeline.
"""
import base64
import re
from swytchcode_runtime import exec as swy_exec
from src.config import Config


def _extract_header(headers: list[dict], name: str) -> str:
    """Extract a specific header value from Gmail message headers."""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return h.get("value", "")
    return ""


def _decode_body(payload: dict) -> str:
    """Decode the email body from Gmail's base64url format."""
    # Check for simple body
    if payload.get("body", {}).get("data"):
        data = payload["body"]["data"]
        return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    # Check multipart
    for part in payload.get("parts", []):
        mime = part.get("mimeType", "")
        if mime == "text/plain" and part.get("body", {}).get("data"):
            data = part["body"]["data"]
            return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")

    return "(unable to extract email body)"


def _clean_text(text: str) -> str:
    """Strip HTML tags and excessive whitespace."""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:3000]  # Limit to 3000 chars for LLM context


def run(state: dict) -> dict:
    """
    Fetch the latest unread support email from Gmail.

    Swytchcode tools used:
        - gmail.messages.list  (read)
        - gmail.messages.get   (read)
    """
    log = list(state.get("execution_log", []))
    log.append("📧 [Gmail] Fetching unread support emails...")

    try:
        # Step 1: List unread emails with the support label
        listing = swy_exec("gmail.user.messages.get", {
            "path": {"userId": "me"},
            "query": {
                "q": f"is:unread label:{Config.SUPPORT_LABEL}",
                "maxResults": 1,
            }
        })

        messages = listing.get("messages", [])
        if not messages:
            log.append("⚠️  No unread support emails found")
            return {**state, "execution_log": log, "email_id": "", "email_body": ""}

        msg_id = messages[0]["id"]

        # Step 2: Get full email details
        email = swy_exec("gmail.user.messages.get1", {
            "path": {"userId": "me", "id": msg_id},
            "query": {"format": "full"}
        })

        headers = email.get("payload", {}).get("headers", [])
        sender = _extract_header(headers, "From")
        subject = _extract_header(headers, "Subject")
        body_raw = _decode_body(email.get("payload", {}))
        body = _clean_text(body_raw)

        log.append(f"✅ [Gmail] Email ingested — From: {sender} | Subject: {subject}")

        return {
            **state,
            "email_id": msg_id,
            "email_from": sender,
            "email_subject": subject,
            "email_body": body,
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Gmail] Error: {e}")
        return {**state, "execution_log": log, "email_id": "", "email_body": ""}
