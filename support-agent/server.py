"""
AI Support Agent — FastAPI Backend Server.

This lightweight server exposes the LangGraph agent as a REST API,
allowing the Chrome Extension (and any other client) to process
support emails through the full Swytchcode pipeline.

Run with:
    uvicorn server:app --reload --port 8000

Or:
    python server.py
"""
import sys
import os
# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from collections import deque
from typing import Any

# ── In-memory history store (max 200 entries, server lifetime) ─
HISTORY: deque = deque(maxlen=200)

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from src.config import Config
from src.nodes import (
    issue_classifier,
    knowledge_search,
    github_escalation,
    ticket_creator,
    reply_drafter,
    notification_sender,
)

# ── FastAPI App ────────────────────────────────────────────────
app = FastAPI(
    title="AI Support Agent API",
    description="Process support emails through the Swytchcode + LangGraph pipeline",
    version="1.0.0",
)

# Allow Chrome Extension to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Chrome extensions use chrome-extension:// origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ──────────────────────────────────
class EmailRequest(BaseModel):
    email_from: str
    email_subject: str
    email_body: str


class ProcessResponse(BaseModel):
    email_from: str
    email_subject: str
    issue_category: str
    sentiment: str
    priority: str
    kb_match_found: bool
    jira_ticket_id: str | None = None
    jira_ticket_url: str | None = None
    github_issue_id: str | None = None
    github_issue_url: str | None = None
    draft_reply: str
    reply_sent: bool
    resend_message_id: str | None = None
    execution_log: list[str]


# ── Routes ─────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint for the Chrome Extension connection status."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "agent": "AI Support Agent",
        "integrations": ["gmail", "notion", "jira", "resend", "github"],
        "history_count": len(HISTORY),
    }


@app.get("/history")
async def get_history():
    """Return all processed email results (newest first)."""
    items = list(reversed(list(HISTORY)))
    return {"items": items, "count": len(items)}


@app.get("/analytics")
async def get_analytics():
    """Return aggregate metrics for the Analytics dashboard tab."""
    items = list(HISTORY)
    total = len(items)
    if total == 0:
        return {
            "total_processed": 0,
            "kb_hit_rate": 0,
            "tickets_created": 0,
            "replies_sent": 0,
            "categories": {},
            "sentiments": {},
            "priorities": {},
        }

    kb_hits = sum(1 for i in items if i.get("kb_match_found"))
    tickets  = sum(1 for i in items if i.get("jira_ticket_id"))
    replies  = sum(1 for i in items if i.get("reply_sent"))

    categories: dict[str, int] = {}
    sentiments: dict[str, int] = {}
    priorities: dict[str, int] = {}

    for item in items:
        cat  = item.get("issue_category", "unknown")
        sent = item.get("sentiment", "neutral")
        pri  = item.get("priority", "medium")
        categories[cat]  = categories.get(cat, 0)  + 1
        sentiments[sent] = sentiments.get(sent, 0) + 1
        priorities[pri]  = priorities.get(pri, 0)  + 1

    return {
        "total_processed": total,
        "kb_hit_rate": round(kb_hits / total * 100, 1),
        "tickets_created": tickets,
        "replies_sent": replies,
        "categories": categories,
        "sentiments": sentiments,
        "priorities": priorities,
    }


@app.get("/kb-gaps")
async def get_kb_gaps():
    """Return emails where KB had no answer and a GitHub issue was filed."""
    items = list(HISTORY)
    gaps = [
        {
            "issue_id": item["github_issue_id"],
            "issue_url": item.get("github_issue_url", "#"),
            "subject": item.get("email_subject", "Unknown issue"),
            "priority": item.get("priority", "medium"),
            "created_at": item.get("processed_at", ""),
            "keywords": item.get("keywords", []),
        }
        for item in items
        if item.get("github_issue_id") and not item.get("kb_match_found")
    ]
    return {"gaps": gaps, "count": len(gaps)}


@app.post("/process", response_model=ProcessResponse)
async def process_email(request: EmailRequest):
    """
    Process a support email through the full Swytchcode + LangGraph pipeline.

    Steps:
        1. Classify with Gemini (category, sentiment, priority)
        2. Search Notion KB for matching articles
        3. If no match → Create GitHub issue (KB gap detection)
        4. If escalated → Create Jira ticket
        5. Draft reply with Gemini
        6. Send reply via Resend

    All API calls flow through Swytchcode's execution pipeline.
    """
    try:
        # Build initial state
        state = {
            "email_id": f"ext-{datetime.now().strftime('%H%M%S')}",
            "email_from": request.email_from,
            "email_subject": request.email_subject,
            "email_body": request.email_body,
            "execution_log": [
                f"🔌 [Extension] Email received at {datetime.now().isoformat()}"
            ],
        }

        # Step 1: Classify
        state = issue_classifier.run(state)

        # Step 2: Route based on classification
        if state.get("issue_category") == "known":
            # Search KB
            state = knowledge_search.run(state)

            if not state.get("kb_match_found"):
                # KB miss → escalate
                state = github_escalation.run(state)
                state = ticket_creator.run(state)
        else:
            # Unknown/urgent → escalate directly
            state = github_escalation.run(state)
            state = ticket_creator.run(state)

        # Step 3: Draft reply
        state = reply_drafter.run(state)

        # Step 4: Send reply
        state = notification_sender.run(state)

        response_data = {
            "email_from": state.get("email_from", ""),
            "email_subject": state.get("email_subject", ""),
            "issue_category": state.get("issue_category", "unknown"),
            "sentiment": state.get("sentiment", "neutral"),
            "priority": state.get("priority", "medium"),
            "kb_match_found": state.get("kb_match_found", False),
            "jira_ticket_id": state.get("jira_ticket_id"),
            "jira_ticket_url": state.get("jira_ticket_url"),
            "github_issue_id": state.get("github_issue_id"),
            "github_issue_url": state.get("github_issue_url"),
            "draft_reply": state.get("draft_reply", ""),
            "reply_sent": state.get("reply_sent", False),
            "resend_message_id": state.get("resend_message_id"),
            "execution_log": state.get("execution_log", []),
            "keywords": state.get("keywords", []),
            "processed_at": datetime.now().isoformat(),
        }
        # Persist to in-memory history
        HISTORY.append(response_data)

        return ProcessResponse(**{k: v for k, v in response_data.items() if k in ProcessResponse.model_fields})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run ────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[AI Support Agent] API Server starting...")
    print("   Chrome Extension backend at http://localhost:8000")
    print("   Docs at http://localhost:8000/docs")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000)
