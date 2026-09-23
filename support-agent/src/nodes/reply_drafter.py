"""
Reply Drafter Node — Gemini LLM-powered reply generation with 3 tone variants.

Generates three simultaneous reply variants (formal, empathetic, concise)
in a single Gemini call so support agents can choose the right tone.
"""
import json
import time
from google import genai
from src.config import Config

_client = genai.Client(api_key=Config.GOOGLE_API_KEY)

# ── Tone-variant prompt (returns JSON with 3 variants) ────────
VARIANTS_PROMPT = """\
You are a customer support AI. Generate 3 different reply variants for the email below.

Return a JSON object with EXACTLY this structure — no extra keys, no markdown:
{{
  "formal": "...",
  "empathetic": "...",
  "concise": "..."
}}

TONE GUIDELINES:
- formal: Professional, structured, business language. Maintains distance.
- empathetic: Warm, understanding, acknowledges the customer's emotion first.
- concise: Direct and brief. Just the solution / next steps in 2-3 sentences.

ALL variants must:
- Address the specific issue
- Reference KB solution or ticket number if provided
- Sign off as "Support Team"
- Be under 200 words

CUSTOMER EMAIL:
From: {sender}
Subject: {subject}
Body: {body}

CONTEXT:
{context}
"""

# ── Fallback single-reply prompts (used when variants call fails) ─
REPLY_PROMPT_WITH_KB = """\
You are a friendly and professional customer support agent. Draft an empathetic reply using the KB articles below.
RULES: Be empathetic, reference the KB solution, keep under 200 words, sign off as "Support Team".
Return ONLY the email body text.

From: {sender} | Subject: {subject}
Body: {body}
KB ARTICLES: {kb_summary}
{ticket_info}
"""

REPLY_PROMPT_NO_KB = """\
You are a friendly customer support agent. The customer's issue is new — not in the KB.
Draft a reply that: acknowledges the issue, confirms the engineering team has been notified,
gives a follow-up timeline (24h), keeps under 200 words, signs off as "Support Team".
Return ONLY the email body text.

From: {sender} | Subject: {subject}
Body: {body}
{ticket_info}
"""


def _build_context(state: dict) -> str:
    """Build context string from KB results and ticket info."""
    parts = []
    if state.get("kb_match_found"):
        kb_sum = state.get("kb_answer_summary", "")
        if state.get("kb_results"):
            titles = [a.get("title", "") for a in state["kb_results"] if a.get("title")]
            kb_sum += " | Articles: " + ", ".join(titles)
        if kb_sum:
            parts.append(f"KB SOLUTION: {kb_sum}")
    if state.get("jira_ticket_id"):
        parts.append(f"Jira Ticket: {state['jira_ticket_id']} ({state.get('jira_ticket_url', '')})")
    if state.get("github_issue_url"):
        parts.append(f"GitHub Issue: {state['github_issue_url']}")
    return "\n".join(parts) if parts else "No additional context."


def run(state: dict) -> dict:
    """
    Draft reply variants using Gemini.

    Returns:
        reply_variants: list of {tone, text} dicts
        draft_reply: the empathetic variant (best general-purpose pick)
    """
    log = list(state.get("execution_log", []))
    log.append("[Gemini] Drafting 3-tone reply variants...")

    context = _build_context(state)
    prompt = VARIANTS_PROMPT.format(
        sender=state.get("email_from", ""),
        subject=state.get("email_subject", ""),
        body=state.get("email_body", "")[:1500],
        context=context,
    )

    # ── Try variants call (with 429 retry) ──────────────────────
    import re as _re
    variants_result = None
    last_err = None
    for attempt in range(4):
        try:
            chat = _client.chats.create(model=Config.LLM_MODEL)
            resp = chat.send_message(prompt)
            if resp and resp.text:
                text = resp.text.strip()
                # Strip markdown fences
                if text.startswith("```"):
                    lines = text.split("\n")
                    text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                variants_result = json.loads(text)
                break
        except Exception as e:
            last_err = e
            err_str = str(e)
            m = _re.search(r"retryDelay['\"]?\s*[:\s]+['\"]?(\d+(?:\.\d+)?)s", err_str)
            if m and attempt < 3:
                wait = min(float(m.group(1)) + 2, 90)
                log.append(f"⏳ [Gemini/Reply] Rate limited — waiting {int(wait)}s...")
                time.sleep(wait)
            elif attempt < 3:
                time.sleep(2 ** attempt)

    if variants_result and all(k in variants_result for k in ("formal", "empathetic", "concise")):
        reply_variants = [
            {"tone": "empathetic", "label": "Empathetic", "icon": "💬", "text": variants_result["empathetic"]},
            {"tone": "formal",     "label": "Formal",     "icon": "🎩", "text": variants_result["formal"]},
            {"tone": "concise",    "label": "Concise",    "icon": "⚡", "text": variants_result["concise"]},
        ]
        # Best general-purpose pick is empathetic
        draft_reply = variants_result["empathetic"]
        log.append(f"[Gemini] 3 reply variants drafted successfully")
    else:
        # ── Fallback: generate a single reply ─────────────────
        log.append(f"[Gemini] Variants parse failed ({last_err}) — generating single reply")
        draft_reply = _generate_single_reply(state, context, log)
        reply_variants = [
            {"tone": "empathetic", "label": "Empathetic", "icon": "💬", "text": draft_reply},
        ]

    log.append(f"[Gemini] Draft reply: {len(draft_reply)} chars")

    return {
        **state,
        "draft_reply": draft_reply,
        "reply_variants": reply_variants,
        "execution_log": log,
    }


def _generate_single_reply(state: dict, context: str, log: list) -> str:
    """Fallback: generate one reply when the variants call fails."""
    ticket_parts = []
    if state.get("jira_ticket_id"):
        ticket_parts.append(f"Jira: {state['jira_ticket_id']}")
    ticket_info = "TICKETS: " + ", ".join(ticket_parts) if ticket_parts else ""

    if state.get("kb_match_found"):
        kb_summary = state.get("kb_answer_summary", "")
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

    import re as _re
    for attempt in range(4):
        try:
            chat = _client.chats.create(model=Config.LLM_MODEL)
            resp = chat.send_message(prompt)
            if resp and resp.text:
                return resp.text.strip()
        except Exception as e:
            err_str = str(e)
            m = _re.search(r"retryDelay['\"]?\s*[:\s]+['\"]?(\d+(?:\.\d+)?)s", err_str)
            if m and attempt < 3:
                time.sleep(min(float(m.group(1)) + 2, 90))
            elif attempt < 3:
                time.sleep(2 ** attempt)

    # Last-resort template
    ticket_msg = f" (Ticket: {state.get('jira_ticket_id')})" if state.get("jira_ticket_id") else ""
    return (
        f"Hello,\n\nThank you for reaching out. We have received your request{ticket_msg} "
        f"and our team is actively reviewing it. We will follow up within 24 hours.\n\n"
        f"Best regards,\nSupport Team"
    )
