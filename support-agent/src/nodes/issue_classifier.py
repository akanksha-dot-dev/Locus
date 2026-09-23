"""
Issue Classifier Node — Gemini LLM-powered classification & sentiment analysis.

Uses Google Gemini to classify the support email into categories,
detect customer sentiment, and assign priority. This is the brain
of the agent — it drives the conditional routing in the LangGraph.
"""
import json
from google import genai
from src.config import Config

# Configure Gemini client
_client = genai.Client(api_key=Config.GOOGLE_API_KEY)

CLASSIFICATION_PROMPT = """\
You are a customer support AI classifier. Analyze the following support email and return a JSON object with these fields:

1. "issue_category": one of "known" (common/documented issue), "unknown" (new/undocumented issue), or "urgent" (critical/time-sensitive)
2. "sentiment": one of "positive", "neutral", "negative", or "frustrated"
3. "priority": one of "low", "medium", "high", or "critical"
4. "keywords": a list of 3-5 topic keywords extracted from the email

IMPORTANT: Return ONLY valid JSON, no markdown, no explanation.

--- EMAIL ---
From: {sender}
Subject: {subject}

{body}
--- END ---
"""


def run(state: dict) -> dict:
    """
    Classify the support email using Google Gemini.

    Determines:
        - issue_category: drives conditional routing (known → KB search, unknown → escalate)
        - sentiment: used for priority escalation (frustrated → bump priority)
        - priority: mapped to Jira priority field
        - keywords: used for Notion KB search filters
    """
    log = list(state.get("execution_log", []))
    log.append("🧠 [Gemini] Classifying email...")

    if not state.get("email_body"):
        log.append("⚠️  No email body to classify — skipping")
        return {
            **state,
            "issue_category": "unknown",
            "sentiment": "neutral",
            "priority": "medium",
            "keywords": [],
            "execution_log": log,
        }

    try:
        prompt = CLASSIFICATION_PROMPT.format(
            sender=state.get("email_from", ""),
            subject=state.get("email_subject", ""),
            body=state.get("email_body", ""),
        )

        import time
        response = None
        last_err = None
        for attempt in range(3):
            try:
                chat = _client.chats.create(model=Config.LLM_MODEL)
                response = chat.send_message(prompt)
                if response and response.text:
                    break
            except Exception as e:
                last_err = e
                time.sleep(1.5 * (attempt + 1))

        if not response or not response.text:
            raise last_err or Exception("Gemini returned empty response")

        text = response.text.strip()

        # Parse JSON from response (handle markdown fences)
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        result = json.loads(text)

        # Sentiment-aware priority escalation
        category = result.get("issue_category", "unknown")
        sentiment = result.get("sentiment", "neutral")
        priority = result.get("priority", "medium")

        if sentiment == "frustrated" and priority in ("low", "medium"):
            priority = "high"
            log.append("⬆️  [Gemini] Priority escalated due to frustrated sentiment")

        if category == "urgent":
            priority = "critical"

        log.append(
            f"✅ [Gemini] Classification: category={category} | "
            f"sentiment={sentiment} | priority={priority}"
        )

        return {
            **state,
            "issue_category": category,
            "sentiment": sentiment,
            "priority": priority,
            "keywords": result.get("keywords", []),
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Gemini] Classification error: {e} — defaulting to unknown/medium")
        return {
            **state,
            "issue_category": "unknown",
            "sentiment": "neutral",
            "priority": "medium",
            "keywords": [],
            "execution_log": log,
        }
