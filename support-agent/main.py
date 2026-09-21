"""
AI Customer Support Knowledge Agent — Main Entry Point.

Usage:
    python main.py              # Process one support email
    python main.py --demo       # Run with a simulated test email
    python main.py --verify     # Verify Swytchcode setup

Built with:
    - LangGraph for workflow orchestration
    - Swytchcode for production API execution (Gmail, Notion, Jira, Resend, GitHub)
    - Google Gemini for LLM classification and reply drafting

Hackathon: Build with Swytchcode
Track 1: AI Customer Support Knowledge Agent
"""
import sys
import json
from datetime import datetime
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.markdown import Markdown

from src.agent import support_agent
from src.config import Config
from src.tools import verify_setup

console = Console()


def print_banner():
    """Print a stylish startup banner."""
    console.print(Panel.fit(
        "[bold cyan]🤖 AI Customer Support Knowledge Agent[/bold cyan]\n"
        "[dim]Powered by Swytchcode × LangGraph × Gemini[/dim]",
        border_style="cyan",
    ))


def print_results(final_state: dict):
    """Print a formatted summary of the agent's execution."""
    console.print()
    console.print(Panel("[bold green]✅ Agent Execution Complete[/bold green]", border_style="green"))

    # Summary table
    table = Table(title="Execution Summary", show_header=True, header_style="bold magenta")
    table.add_column("Field", style="cyan")
    table.add_column("Value", style="white")

    table.add_row("Email From", final_state.get("email_from", "N/A"))
    table.add_row("Subject", final_state.get("email_subject", "N/A"))
    table.add_row("Category", final_state.get("issue_category", "N/A"))
    table.add_row("Sentiment", final_state.get("sentiment", "N/A"))
    table.add_row("Priority", final_state.get("priority", "N/A"))
    table.add_row("KB Match", "✅ Yes" if final_state.get("kb_match_found") else "❌ No")
    table.add_row("Jira Ticket", final_state.get("jira_ticket_id", "N/A"))
    table.add_row("GitHub Issue", final_state.get("github_issue_id", "N/A"))
    table.add_row("Reply Sent", "✅ Yes" if final_state.get("reply_sent") else "❌ No")
    console.print(table)

    # Execution log
    console.print()
    console.print("[bold]📋 Execution Log:[/bold]")
    for entry in final_state.get("execution_log", []):
        console.print(f"  {entry}")

    # Draft reply preview
    if final_state.get("draft_reply"):
        console.print()
        console.print(Panel(
            final_state["draft_reply"],
            title="[bold]📧 Draft Reply[/bold]",
            border_style="blue",
        ))


def run_demo():
    """Run the agent with a simulated test email (skips Gmail fetch)."""
    console.print("[bold yellow]🧪 Running in DEMO mode with simulated email...[/bold yellow]")

    demo_state = {
        "email_id": "demo-001",
        "email_from": "jane.doe@customer.com",
        "email_subject": "Unable to reset my password — getting error 500",
        "email_body": (
            "Hi Support Team,\n\n"
            "I've been trying to reset my password for the last 2 hours but keep "
            "getting a server error (HTTP 500) on the reset page. I've tried "
            "multiple browsers and clearing my cache but nothing works.\n\n"
            "This is really frustrating — I have a deadline today and can't "
            "access my account. Please help ASAP!\n\n"
            "Thanks,\nJane"
        ),
        "execution_log": ["🧪 [Demo] Using simulated email data"],
    }

    # Skip the email ingestion node, start from classification
    from src.nodes import (
        issue_classifier, knowledge_search,
        github_escalation, ticket_creator,
        reply_drafter, notification_sender,
    )

    console.print("[dim]Step 1/6: Classifying issue...[/dim]")
    state = issue_classifier.run(demo_state)

    if state.get("issue_category") == "known":
        console.print("[dim]Step 2/6: Searching knowledge base...[/dim]")
        state = knowledge_search.run(state)
        if not state.get("kb_match_found"):
            console.print("[dim]Step 3/6: Creating GitHub issue (KB gap)...[/dim]")
            state = github_escalation.run(state)
            console.print("[dim]Step 4/6: Creating Jira ticket...[/dim]")
            state = ticket_creator.run(state)
    else:
        console.print("[dim]Step 2/6: Creating GitHub issue (KB gap)...[/dim]")
        state = github_escalation.run(state)
        console.print("[dim]Step 3/6: Creating Jira ticket...[/dim]")
        state = ticket_creator.run(state)

    console.print("[dim]Step 5/6: Drafting reply...[/dim]")
    state = reply_drafter.run(state)

    console.print("[dim]Step 6/6: Sending notification...[/dim]")
    state = notification_sender.run(state)

    print_results(state)


def run_live():
    """Run the full agent graph against live Gmail."""
    console.print("[bold green]🔴 Running LIVE against Gmail...[/bold green]")

    initial_state = {
        "execution_log": [f"🚀 Agent started at {datetime.now().isoformat()}"],
    }

    final_state = support_agent.invoke(initial_state)
    print_results(final_state)


def main():
    print_banner()

    # Check CLI args
    if "--verify" in sys.argv:
        verify_setup()
        return

    if "--demo" in sys.argv:
        run_demo()
        return

    # Validate config
    missing = Config.validate()
    if missing:
        console.print(f"[bold red]❌ Missing config:[/bold red] {', '.join(missing)}")
        console.print("[dim]Copy .env.example to .env and fill in the values.[/dim]")
        return

    run_live()


if __name__ == "__main__":
    main()
