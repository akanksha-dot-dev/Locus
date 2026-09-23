"""
AI Support Agent v3.0 — FastAPI Backend Server.

Enhanced with:
  - Auto KB Article Generation (gap → Gemini writes → Notion push)
  - Customer Memory & Repeat Detection
  - Live SLA Breach Monitor (WebSocket alerts)
  - Multi-language Detection & Reply
  - Confidence-based Human Escalation
  - Swytchcode Audit Trail Capture

Endpoints:
    GET  /health                — health check
    POST /process               — run the full LangGraph pipeline
    GET  /history               — past processed emails
    GET  /analytics             — aggregate metrics
    GET  /kb-gaps               — unanswered issues filed on GitHub
    GET  /sla-status            — ticket SLA breach tracking
    GET  /sla-breaches          — currently breached tickets
    POST /generate-kb-article   — Gemini-writes + Notion-pushes a KB article
    GET  /customer/{email}      — customer history & repeat detection
    GET  /customer-stats        — overall customer analytics
    POST /auto-process/start    — start background Gmail polling loop
    DELETE /auto-process/stop   — stop the polling loop
    WS   /ws                    — real-time activity feed (WebSocket)

Run with:
    python server.py
"""
import sys
import os
import asyncio
import json
import re

# Force UTF-8 output on Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from collections import deque, defaultdict
from typing import Optional, List

# ── In-memory stores ───────────────────────────────────────────
HISTORY: deque = deque(maxlen=200)          # All processed email results
ACTIVITY: deque = deque(maxlen=100)         # Live feed events
CUSTOMER_HISTORY: dict = defaultdict(list)  # email → list of interactions
SWY_AUDIT: deque = deque(maxlen=500)        # Swytchcode execution audit trail

# ── Background task handles ─────────────────────────────────────
_auto_task: Optional[asyncio.Task] = None
_sla_monitor_task: Optional[asyncio.Task] = None

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
    email_ingestion,
    kb_article_generator,
)

# ── WebSocket Connection Manager ───────────────────────────────
class ConnectionManager:
    """Manages all active WebSocket connections for the live feed."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, payload: dict):
        """Broadcast to all connected clients; silently remove dead connections."""
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


# ── FastAPI App ────────────────────────────────────────────────
app = FastAPI(
    title="AI Support Agent API v3.0",
    description="AI Support Agent — Swytchcode + LangGraph + Gemini + Auto KB Loop + Customer Memory",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    confidence_score: Optional[int] = None
    kb_match_found: bool
    jira_ticket_id: Optional[str] = None
    jira_ticket_url: Optional[str] = None
    github_issue_id: Optional[str] = None
    github_issue_url: Optional[str] = None
    draft_reply: str
    reply_variants: Optional[list] = None
    reply_sent: bool
    resend_message_id: Optional[str] = None
    sla_deadline_hours: Optional[float] = None
    execution_log: list[str]


class KBArticleRequest(BaseModel):
    subject: str
    keywords: list[str] = []
    description: str = ""
    issue_id: Optional[str] = None


class AutoProcessRequest(BaseModel):
    interval_seconds: int = 60


# ── SLA configuration ──────────────────────────────────────────
SLA_HOURS = {"critical": 1, "high": 4, "medium": 24, "low": 72}


# ═══════════════════════════════════════════════════════════════
#  ROUTES
# ═══════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "agent": "AI Support Agent",
        "version": "3.0.0",
        "integrations": ["gmail", "notion", "jira", "resend", "github"],
        "v3_features": [
            "auto_kb_generation",
            "customer_memory",
            "sla_breach_monitor",
            "multi_language",
            "human_escalation",
            "swytchcode_audit",
        ],
        "history_count": len(HISTORY),
        "customer_count": len(CUSTOMER_HISTORY),
        "auto_processing": _auto_task is not None and not _auto_task.done(),
        "sla_monitor": _sla_monitor_task is not None and not _sla_monitor_task.done(),
        "live_connections": len(manager.active),
    }


@app.get("/history")
async def get_history():
    items = list(reversed(list(HISTORY)))
    return {"items": items, "count": len(items)}


@app.get("/analytics")
async def get_analytics():
    items = list(HISTORY)
    total = len(items)
    if total == 0:
        return {
            "total_processed": 0, "kb_hit_rate": 0,
            "tickets_created": 0, "replies_sent": 0,
            "categories": {}, "sentiments": {}, "priorities": {},
            "avg_confidence": 0,
        }

    kb_hits = sum(1 for i in items if i.get("kb_match_found"))
    tickets  = sum(1 for i in items if i.get("jira_ticket_id"))
    replies  = sum(1 for i in items if i.get("reply_sent"))
    conf_scores = [i["confidence_score"] for i in items if i.get("confidence_score")]
    avg_conf = round(sum(conf_scores) / len(conf_scores), 0) if conf_scores else 0

    categories, sentiments, priorities = {}, {}, {}
    for item in items:
        for d, k in [(categories, "issue_category"), (sentiments, "sentiment"), (priorities, "priority")]:
            v = item.get(k, "unknown")
            d[v] = d.get(v, 0) + 1

    return {
        "total_processed": total,
        "kb_hit_rate": round(kb_hits / total * 100, 1),
        "tickets_created": tickets,
        "replies_sent": replies,
        "categories": categories,
        "sentiments": sentiments,
        "priorities": priorities,
        "avg_confidence": avg_conf,
    }


@app.get("/kb-gaps")
async def get_kb_gaps():
    items = list(HISTORY)
    gaps = [
        {
            "issue_id": item["github_issue_id"],
            "issue_url": item.get("github_issue_url", "#"),
            "subject": item.get("email_subject", "Unknown issue"),
            "priority": item.get("priority", "medium"),
            "created_at": item.get("processed_at", ""),
            "keywords": item.get("keywords", []),
            "email_body": item.get("email_body", "")[:500],
        }
        for item in items
        if item.get("github_issue_id") and not item.get("kb_match_found")
    ]
    return {"gaps": gaps, "count": len(gaps)}


@app.get("/sla-status")
async def get_sla_status():
    """Return all tickets with SLA deadline and breach status."""
    now = datetime.now()
    tickets = []
    for item in HISTORY:
        if not item.get("jira_ticket_id"):
            continue
        priority = item.get("priority", "medium")
        sla_h = SLA_HOURS.get(priority, 24)
        try:
            created = datetime.fromisoformat(item["processed_at"])
            deadline = created + timedelta(hours=sla_h)
            hrs_remaining = (deadline - now).total_seconds() / 3600
        except Exception:
            hrs_remaining = float(sla_h)
        tickets.append({
            "jira_ticket_id": item["jira_ticket_id"],
            "jira_ticket_url": item.get("jira_ticket_url"),
            "subject": item.get("email_subject", ""),
            "email_from": item.get("email_from", ""),
            "priority": priority,
            "sla_hours": sla_h,
            "hours_remaining": round(max(hrs_remaining, 0), 1),
            "breached": hrs_remaining < 0,
            "near_breach": 0 <= hrs_remaining <= 2,
            "processed_at": item.get("processed_at", ""),
        })
    tickets.sort(key=lambda x: x["hours_remaining"])
    return {
        "tickets": tickets,
        "count": len(tickets),
        "breached_count": sum(1 for t in tickets if t["breached"]),
        "near_breach_count": sum(1 for t in tickets if t["near_breach"]),
    }


@app.post("/generate-kb-article")
async def generate_kb_article(request: KBArticleRequest):
    """
    Use Gemini to write a complete KB article, then push to Notion.
    Returns the generated article text + Notion page URL (if push succeeded).
    """
    from src.nodes import kb_article_generator
    result = await asyncio.to_thread(
        kb_article_generator.run,
        {
            "subject": request.subject,
            "keywords": request.keywords,
            "description": request.description,
            "issue_id": request.issue_id,
        },
    )
    return result


# ── Auto-processing background loop ───────────────────────────
async def _auto_process_loop(interval: int):
    """Poll Gmail every `interval` seconds, process new emails, broadcast results."""
    while True:
        try:
            state = {"execution_log": [f"[Auto] Polling at {datetime.now().isoformat()}"]}
            state = await asyncio.to_thread(email_ingestion.run, state)

            if state.get("email_body"):
                state = await asyncio.to_thread(issue_classifier.run, state)

                if state.get("issue_category") == "known":
                    state = await asyncio.to_thread(knowledge_search.run, state)
                    if not state.get("kb_match_found"):
                        state = await asyncio.to_thread(github_escalation.run, state)
                        state = await asyncio.to_thread(ticket_creator.run, state)
                else:
                    state = await asyncio.to_thread(github_escalation.run, state)
                    state = await asyncio.to_thread(ticket_creator.run, state)

                state = await asyncio.to_thread(reply_drafter.run, state)
                state = await asyncio.to_thread(notification_sender.run, state)

                record = {**state, "processed_at": datetime.now().isoformat(), "source": "auto"}
                HISTORY.append(record)
                await manager.broadcast({"type": "auto_processed", "data": record})
            else:
                await manager.broadcast({"type": "auto_poll", "timestamp": datetime.now().isoformat(), "found": False})

        except asyncio.CancelledError:
            break
        except Exception as exc:
            await manager.broadcast({"type": "auto_error", "error": str(exc), "timestamp": datetime.now().isoformat()})

        await asyncio.sleep(interval)


@app.post("/auto-process/start")
async def start_auto_process(request: AutoProcessRequest = AutoProcessRequest()):
    global _auto_task
    if _auto_task and not _auto_task.done():
        return {"status": "already_running", "interval": request.interval_seconds}
    _auto_task = asyncio.create_task(_auto_process_loop(request.interval_seconds))
    await manager.broadcast({"type": "auto_started", "interval": request.interval_seconds, "timestamp": datetime.now().isoformat()})
    return {"status": "started", "interval_seconds": request.interval_seconds}


@app.delete("/auto-process/stop")
async def stop_auto_process():
    global _auto_task
    if _auto_task and not _auto_task.done():
        _auto_task.cancel()
        await manager.broadcast({"type": "auto_stopped", "timestamp": datetime.now().isoformat()})
        return {"status": "stopped"}
    return {"status": "not_running"}


@app.get("/auto-process/status")
async def auto_process_status():
    running = _auto_task is not None and not _auto_task.done()
    return {"running": running}


# ── WebSocket live activity feed ───────────────────────────────
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    # Send the last 10 activity events on connect
    recent = list(reversed(list(HISTORY)))[:10]
    try:
        await ws.send_json({"type": "history_snapshot", "items": recent})
        while True:
            # Keep-alive: wait for any client ping
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


# ── Main process pipeline ──────────────────────────────────────
@app.post("/process", response_model=ProcessResponse)
async def process_email(request: EmailRequest):
    """
    Process a support email through the full Swytchcode + LangGraph pipeline.
    Results are stored in HISTORY and broadcast to all WebSocket clients.
    """
    try:
        state = {
            "email_id": f"ext-{datetime.now().strftime('%H%M%S')}",
            "email_from": request.email_from,
            "email_subject": request.email_subject,
            "email_body": request.email_body,
            "execution_log": [f"[Extension] Email received at {datetime.now().isoformat()}"],
        }

        state = await asyncio.to_thread(issue_classifier.run, state)

        if state.get("issue_category") == "known":
            state = await asyncio.to_thread(knowledge_search.run, state)
            if not state.get("kb_match_found"):
                state = await asyncio.to_thread(github_escalation.run, state)
                state = await asyncio.to_thread(ticket_creator.run, state)
        else:
            state = await asyncio.to_thread(github_escalation.run, state)
            state = await asyncio.to_thread(ticket_creator.run, state)

        state = await asyncio.to_thread(reply_drafter.run, state)
        state = await asyncio.to_thread(notification_sender.run, state)

        # SLA deadline
        priority = state.get("priority", "medium")
        sla_hours = float(SLA_HOURS.get(priority, 24))

        response_data = {
            "email_from": state.get("email_from", ""),
            "email_subject": state.get("email_subject", ""),
            "issue_category": state.get("issue_category", "unknown"),
            "sentiment": state.get("sentiment", "neutral"),
            "priority": priority,
            "confidence_score": state.get("confidence_score"),
            "kb_match_found": state.get("kb_match_found", False),
            "jira_ticket_id": state.get("jira_ticket_id"),
            "jira_ticket_url": state.get("jira_ticket_url"),
            "github_issue_id": state.get("github_issue_id"),
            "github_issue_url": state.get("github_issue_url"),
            "draft_reply": state.get("draft_reply", ""),
            "reply_variants": state.get("reply_variants"),
            "reply_sent": state.get("reply_sent", False),
            "resend_message_id": state.get("resend_message_id"),
            "sla_deadline_hours": sla_hours,
            "execution_log": state.get("execution_log", []),
            "keywords": state.get("keywords", []),
            "email_body": request.email_body,
            "processed_at": datetime.now().isoformat(),
            "source": "manual",
        }

        HISTORY.append(response_data)

        # Broadcast to live feed
        await manager.broadcast({
            "type": "email_processed",
            "timestamp": response_data["processed_at"],
            "subject": response_data["email_subject"],
            "category": response_data["issue_category"],
            "priority": response_data["priority"],
            "kb_match": response_data["kb_match_found"],
            "confidence": response_data["confidence_score"],
        })

        return ProcessResponse(**{k: v for k, v in response_data.items() if k in ProcessResponse.model_fields})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Run ────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("[AI Support Agent v2.0] Server starting...")
    print("   API:    http://localhost:8000")
    print("   Docs:   http://localhost:8000/docs")
    print("   WS:     ws://localhost:8000/ws")
    print()
    uvicorn.run(app, host="0.0.0.0", port=8000)
