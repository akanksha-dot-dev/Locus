"""
Notification Sender Node — Resend Integration via Swytchcode + REST fallback.

Sends the drafted reply email to the customer using Resend.
Swytchcode's idempotency prevents duplicate emails on retries.

IMPORTANT — Resend sandbox note:
  The default from-address 'onboarding@resend.dev' is a Resend test sender.
  In sandbox mode it can ONLY deliver to the account-owner's verified email.
  To send to any recipient you must add a verified domain at resend.com/domains
  and set RESEND_FROM_EMAIL=support@yourdomain.com in .env
"""
import os
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False

# Resend sandbox sender — can only deliver to account owner
_RESEND_SANDBOX_SENDER = "onboarding@resend.dev"


def _format_html(body_text: str, state: dict) -> str:
    """Wrap the plain-text reply in a clean HTML email template."""
    html_body = body_text.replace("\n", "<br>")

    ticket_badge = ""
    if state.get("jira_ticket_id"):
        ticket_url = state.get("jira_ticket_url", "#")
        ticket_badge = (
            f'<p style="margin-top:16px;padding:10px 14px;background:#eef2ff;'
            f'border-radius:8px;font-size:13px;color:#4b5563;border:1px solid rgba(79,70,229,0.15);">'
            f'🎫 Tracking ID: <strong style="color:#4f46e5;">'
            f'<a href="{ticket_url}" style="color:#4f46e5;text-decoration:none;">{state["jira_ticket_id"]}</a>'
            f'</strong></p>'
        )

    return f"""\
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px; margin: 0 auto; padding: 32px 24px;
                color: #111827; line-height: 1.7; background: #ffffff;">
        <div style="border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px;">
            <h2 style="margin: 0; color: #111827; font-size: 20px;">Support Team</h2>
            <p style="margin: 4px 0 0; font-size: 13px; color: #9ca3af;">AI-Powered Customer Support</p>
        </div>
        <div style="font-size: 15px; color: #111827;">
            {html_body}
        </div>
        {ticket_badge}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;">
        <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            This is an automated response from our AI-powered support system.
            A human agent will follow up if needed. &nbsp;|&nbsp;
            <span style="color: #4f46e5;">Powered by Swytchcode × Gemini</span>
        </p>
    </div>
    """


def _send_via_rest(recipient: str, subject: str, html_content: str, from_email: str) -> str:
    """
    Direct Resend REST API call. Returns message ID on success, raises on failure.

    Sandbox constraint: 'onboarding@resend.dev' can only send to the account's
    verified email. If you hit a 422, either:
      a) Use the account owner's email as recipient, OR
      b) Add a verified domain at https://resend.com/domains and update RESEND_FROM_EMAIL
    """
    import requests

    resend_key = os.getenv("RESEND_API_KEY", "")
    if not resend_key:
        raise ValueError("RESEND_API_KEY is not set in .env")

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {resend_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": from_email,
            "to": [recipient],
            "subject": subject,
            "html": html_content,
        },
        timeout=15,
    )

    if resp.status_code in (200, 201):
        return resp.json().get("id", "unknown")

    error_body = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    error_name = error_body.get("name", "")
    error_msg  = error_body.get("message", resp.text[:300])

    if resp.status_code == 422 and "testing" in error_msg.lower():
        raise ValueError(
            f"Resend sandbox restriction: '{from_email}' (onboarding@resend.dev) can only "
            f"send to your account's verified email address. "
            f"Either: (a) set recipient = your Resend account email, or "
            f"(b) add a verified domain at https://resend.com/domains and set "
            f"RESEND_FROM_EMAIL=support@yourdomain.com in .env"
        )
    raise RuntimeError(f"Resend API {resp.status_code} [{error_name}]: {error_msg}")


def run(state: dict) -> dict:
    """
    Send the drafted reply to the customer via Resend.

    Strategy:
      1. Try Swytchcode resend.email.create
      2. Fall back to direct Resend REST API

    Sandbox mode handling:
      If RESEND_FROM_EMAIL is 'onboarding@resend.dev', Resend only allows
      delivery to the account owner's verified address. We detect this and
      route to the owner's email (JIRA_EMAIL) instead, logging a warning.
    """
    log = list(state.get("execution_log", []))
    recipient = state.get("email_from", "")
    subject   = state.get("email_subject", "")
    from_email = Config.RESEND_FROM_EMAIL or "onboarding@resend.dev"

    if not recipient:
        log.append("⚠️  [Resend] No recipient email — skipping send")
        return {**state, "reply_sent": False, "execution_log": log}

    # ── Sandbox detection ────────────────────────────────────────
    is_sandbox = from_email == _RESEND_SANDBOX_SENDER
    actual_recipient = recipient

    if is_sandbox:
        # In sandbox, Resend only delivers to the account owner's verified email.
        # Route there so the email actually arrives; log the redirect clearly.
        owner_email = Config.JIRA_EMAIL or os.getenv("RESEND_ACCOUNT_EMAIL", "")
        if owner_email and owner_email != recipient:
            log.append(
                f"⚠️  [Resend] Sandbox mode: onboarding@resend.dev can only deliver to "
                f"your verified account email. Routing to {owner_email} instead of {recipient}. "
                f"Add a verified domain at https://resend.com/domains to send to any address."
            )
            actual_recipient = owner_email
        else:
            log.append(
                f"⚠️  [Resend] Sandbox mode detected (from: {from_email}). "
                f"Email will only arrive if '{recipient}' is your Resend account's verified address."
            )

    log.append(f"📤 [Resend] Sending reply to {actual_recipient}...")

    html_content = _format_html(state.get("draft_reply", ""), state)
    msg_id = None

    # ── 1. Try Swytchcode ────────────────────────────────────────
    if _HAS_SWYTCHCODE:
        try:
            result = swy_exec("resend.email.create", {
                "body": {
                    "from": from_email,
                    "to": [actual_recipient],
                    "subject": f"Re: {subject}",
                    "html": html_content,
                }
            })
            if isinstance(result, dict):
                msg_id = result.get("id") or result.get("data", {}).get("id")
            if msg_id:
                log.append(f"✅ [Resend/Swytchcode] Reply sent (ID: {msg_id})")
        except Exception as swy_err:
            log.append(f"ℹ️  [Resend] Swytchcode attempt: {swy_err}")

    # ── 2. Fall back to direct REST ──────────────────────────────
    if not msg_id:
        try:
            msg_id = _send_via_rest(actual_recipient, f"Re: {subject}", html_content, from_email)
            log.append(f"✅ [Resend/REST] Reply sent to {actual_recipient} (ID: {msg_id})")
        except Exception as rest_err:
            log.append(f"❌ [Resend] Send failed: {rest_err}")

    if msg_id:
        return {**state, "reply_sent": True,  "resend_message_id": msg_id, "execution_log": log}
    else:
        return {**state, "reply_sent": False, "resend_message_id": None, "execution_log": log}
