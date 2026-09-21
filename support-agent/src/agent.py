"""
AI Customer Support Knowledge Agent — LangGraph Workflow.

This is the core orchestration module. It wires together all 7 nodes
into a stateful LangGraph StateGraph with conditional routing:

    email_ingestion → issue_classifier ─┬─ known  → knowledge_search ─┬─ found     → draft_reply
                                        │                              └─ not_found → github_escalation
                                        └─ unknown → github_escalation ──→ ticket_creator → draft_reply
                                                                                                │
                                                                                      notification_sender → END
"""
from langgraph.graph import StateGraph, END
from src.state import SupportState
from src.nodes import (
    email_ingestion,
    issue_classifier,
    knowledge_search,
    ticket_creator,
    github_escalation,
    reply_drafter,
    notification_sender,
)


def _route_after_classification(state: SupportState) -> str:
    """Route based on issue category: known issues go to KB, others escalate."""
    category = state.get("issue_category", "unknown")
    if category == "known":
        return "search_kb"
    return "escalate_github"


def _route_after_kb_search(state: SupportState) -> str:
    """Route based on KB search results: found → reply, not found → escalate."""
    if state.get("kb_match_found", False):
        return "draft_reply"
    return "escalate_github"


def build_support_graph() -> StateGraph:
    """
    Build and compile the full support workflow graph.

    Graph structure:
        7 nodes, 2 conditional branches, ~5 Swytchcode integrations.
    """
    graph = StateGraph(SupportState)

    # ── Register all 7 nodes ───────────────────────────────────────
    graph.add_node("ingest_email", email_ingestion.run)
    graph.add_node("classify_issue", issue_classifier.run)
    graph.add_node("search_kb", knowledge_search.run)
    graph.add_node("create_ticket", ticket_creator.run)
    graph.add_node("escalate_github", github_escalation.run)
    graph.add_node("draft_reply", reply_drafter.run)
    graph.add_node("send_notification", notification_sender.run)

    # ── Set entry point ────────────────────────────────────────────
    graph.set_entry_point("ingest_email")

    # ── Linear edges ───────────────────────────────────────────────
    graph.add_edge("ingest_email", "classify_issue")

    # ── Conditional: after classification ──────────────────────────
    graph.add_conditional_edges(
        "classify_issue",
        _route_after_classification,
        {
            "search_kb": "search_kb",
            "escalate_github": "escalate_github",
        },
    )

    # ── Conditional: after KB search ───────────────────────────────
    graph.add_conditional_edges(
        "search_kb",
        _route_after_kb_search,
        {
            "draft_reply": "draft_reply",
            "escalate_github": "escalate_github",
        },
    )

    # ── Escalation path: GitHub → Jira → Draft Reply ──────────────
    graph.add_edge("escalate_github", "create_ticket")
    graph.add_edge("create_ticket", "draft_reply")

    # ── Final path: Draft → Send → END ────────────────────────────
    graph.add_edge("draft_reply", "send_notification")
    graph.add_edge("send_notification", END)

    return graph.compile()


# Pre-compiled graph instance for import
support_agent = build_support_graph()
