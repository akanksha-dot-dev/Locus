"""
Reply Drafter Node — Gemini LLM-powered reply generation.

Uses Google Gemini to draft a professional customer support reply
based on the KB search results, ticket info, and email context.
"""
import json
from google import genai
from src.config import Config

_client = genai.Client(api_key=Config.GOOGLE_API_KEY)

REPLY_PROMPT_WITH_KB = """\
You are a friendly and professional customer support agent. Draft a reply to the customer's email using the knowledge base articles found below.

RULES:
- Be empathetic and helpful
- Reference the specific solution from the KB
- If a Jira ticket was created, mention that the engineering team is tracking it
- Keep the reply concise (under 200 words)
- Sign off as "Support Team"
- Return ONLY the email body text, no subject line

CUSTOMER EMAIL:
From: {sender}
Subject: {subject}
Body: {body}

KB ARTICLES FOUND:
{kb_summary}

{ticket_info}
"""

REPLY_PROMPT_NO_KB = """\
You are a friendly and professional customer support agent. The customer's issue is new and not in our knowledge base. Draft a reply that:

- Acknowledges the issue
- Assures them the engineering team has been notified (a ticket has been created)
- Provides an estimated follow-up timeline
- Keeps the reply concise (under 200 words)
- Signs off as "Support Team"
- Return ONLY the email body text, no subject line

CUSTOMER EMAIL:
From: {sender}
Subject: {subject}
Body: {body}

{ticket_info}
"""


def run(state: dict) -> dict:
    """
    Draft a professional reply using Gemini, tailored to whether
    the KB had a matching article or not.
    """
    log = list(state.get("execution_log", []))
    log.append("✍️  [Gemini] Drafting reply...")

    try:
        # Build ticket info string
        ticket_parts = []
        if state.get("jira_ticket_id"):
            ticket_parts.append(f"Jira Ticket: {state['jira_ticket_id']}")
        if state.get("github_issue_url"):
            ticket_parts.append(f"GitHub Issue: {state['github_issue_url']}")
        ticket_info = "TICKETS CREATED:\n" + "\n".join(ticket_parts) if ticket_parts else ""

        # Choose prompt based on KB results
        if state.get("kb_match_found"):
            kb_summary = state.get("kb_answer_summary", "")
            if state.get("kb_results"):
                titles = [a.get("title", "") for a in state["kb_results"] if a.get("title")]
                kb_summary += "\nArticle titles: " + ", ".join(titles)

            prompt = REPLY_PROMPT_WITH_KB.format(
                sender=state.get("email_from", ""),
                subject=state.get("email_subject", ""),
                body=state.get("email_body", "")[:1500],
                kb_summary=kb_summary,
                ticket_info=ticket_info,
            )
        else:
            prompt = REPLY_PROMPT_NO_KB.format(
                sender=state.get("email_from", ""),
                subject=state.get("email_subject", ""),
                body=state.get("email_body", "")[:1500],
                ticket_info=ticket_info,
            )

        import time
        response = None
        last_err = None
        for attempt in range(3):
            try:
                response = _client.models.generate_content(
                    model=Config.LLM_MODEL,
                    contents=prompt,
                )
                if response and response.text:
                    break
            except Exception as e:
                last_err = e
                time.sleep(1.5 * (attempt + 1))

        if not response or not response.text:
            raise last_err or Exception("Gemini returned empty response")

        draft = response.text.strip()

        log.append(f"✅ [Gemini] Reply drafted ({len(draft)} chars)")

        return {
            **state,
            "draft_reply": draft,
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Gemini] Reply drafting error: {e}")
        fallback = (
            "Thank you for reaching out. We've received your request and our "
            "team is looking into it. We'll follow up with you shortly.\n\n"
            "Best regards,\nSupport Team"
        )
        return {
            **state,
            "draft_reply": fallback,
            "execution_log": log,
        }
