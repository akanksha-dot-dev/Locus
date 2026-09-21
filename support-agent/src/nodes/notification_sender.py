"""
Notification Sender Node — Resend Integration via Swytchcode.

Sends the drafted reply email to the customer using Resend.
Swytchcode's idempotency prevents duplicate emails on retries.
"""
from swytchcode_runtime import exec as swy_exec
from src.config import Config


def _format_html(body_text: str, state: dict) -> str:
    """Wrap the plain-text reply in a clean HTML email template."""
    # Convert newlines to <br> for HTML
    html_body = body_text.replace("\n", "<br>")

    ticket_badge = ""
    if state.get("jira_ticket_id"):
        ticket_badge = (
            f'<p style="margin-top:16px;padding:8px 12px;background:#f0f4ff;'
            f'border-radius:6px;font-size:13px;color:#555;">'
            f'🎫 Tracking ID: <strong>{state["jira_ticket_id"]}</strong></p>'
        )

    return f"""\
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 600px; margin: 0 auto; padding: 24px;
                color: #333; line-height: 1.6;">
        <div style="border-bottom: 3px solid #6366f1; padding-bottom: 16px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1a1a2e;">Support Team</h2>
        </div>
        <div style="font-size: 15px;">
            {html_body}
        </div>
        {ticket_badge}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="font-size: 12px; color: #9ca3af;">
            This is an automated response from our AI-powered support system.
            A human agent will follow up if needed.
        </p>
    </div>
    """


def run(state: dict) -> dict:
    """
    Send the drafted reply to the customer via Resend.

    Swytchcode tools used:
        - resend.emails.send  (write — idempotency enabled)

    Swytchcode features demonstrated:
        - Idempotency: prevents duplicate emails on retry
        - Policy engine: VIP domain blocking via policies.json
    """
    log = list(state.get("execution_log", []))
    recipient = state.get("email_from", "")
    subject = state.get("email_subject", "")

    if not recipient:
        log.append("⚠️  [Resend] No recipient email — skipping send")
        return {**state, "reply_sent": False, "execution_log": log}

    log.append(f"📤 [Resend] Sending reply to {recipient}...")

    try:
        html_content = _format_html(state.get("draft_reply", ""), state)

        result = swy_exec("resend.emails.send", {
            "body": {
                "from": Config.RESEND_FROM_EMAIL,
                "to": [recipient],
                "subject": f"Re: {subject}",
                "html": html_content,
            }
        })

        msg_id = result.get("id", "unknown")
        log.append(f"✅ [Resend] Reply sent (Message ID: {msg_id})")

        return {
            **state,
            "reply_sent": True,
            "resend_message_id": msg_id,
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Resend] Send error: {e}")
        return {
            **state,
            "reply_sent": False,
            "resend_message_id": None,
            "execution_log": log,
        }
