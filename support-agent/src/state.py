"""
LangGraph state definition for the AI Customer Support Knowledge Agent.

This TypedDict flows through every node in the workflow graph,
accumulating data as the agent processes a support email.
"""
from __future__ import annotations
from typing import TypedDict, Optional


class SupportState(TypedDict, total=False):
    """State that flows through the LangGraph support workflow."""

    # ── Email data (populated by email_ingestion node) ──────────────
    email_id: str
    email_from: str
    email_subject: str
    email_body: str

    # ── Classification (populated by issue_classifier node) ─────────
    issue_category: str   # "known" | "unknown" | "urgent"
    sentiment: str        # "positive" | "neutral" | "negative" | "frustrated"
    priority: str         # "low" | "medium" | "high" | "critical"
    keywords: list[str]   # extracted topic keywords

    # ── Knowledge base (populated by knowledge_search node) ─────────
    kb_results: list[dict]
    kb_match_found: bool
    kb_answer_summary: str

    # ── Tickets (populated by ticket/escalation nodes) ──────────────
    jira_ticket_id: Optional[str]
    jira_ticket_url: Optional[str]
    github_issue_id: Optional[str]
    github_issue_url: Optional[str]

    # ── Reply (populated by reply_drafter & notification nodes) ──────
    draft_reply: str
    reply_sent: bool
    resend_message_id: Optional[str]

    # ── Audit trail ─────────────────────────────────────────────────
    execution_log: list[str]
