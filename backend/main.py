"""
Locus — Autonomous Incident Command Center & Day Planner — Main Entry Point.

An intelligent AI agent that combines real-world weather data with personal
calendar and developer workload context to provide smart, actionable daily recommendations.

Track 5 — AI Real World Agent | Build with Swytchcode
Integrations: OpenWeather, Gmail, Notion, Slack, Resend, Jira, GitHub
Framework: LangGraph

Usage:
    python main.py                    # Run interactive agent
    python main.py --demo             # Demo mode with sample request
    python main.py --demo --city Mumbai  # Demo for specific city
    python main.py --verify           # Verify Swytchcode setup
"""
import sys
import os
from datetime import datetime

# Fix Windows console UTF-8 encoding for Rich/emojis
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.markdown import Markdown

from src.agent import weather_agent, preprocess_state
from src.config import Config

console = Console()


def print_banner():
    """Print a stylish startup banner."""
    console.print()
    console.print(Panel.fit(
        "[bold cyan]📅  Locus: Incident Command Center & Day Planner[/bold cyan]\n"
        "[dim]Your AI-powered full day plan using 7 real-world integrations[/dim]\n\n"
        "[bold]🔗 Integrations:[/bold] OpenWeather · Gmail · Jira · GitHub · Notion · Slack · Resend\n"
        "[bold]🤖 Framework:[/bold] LangGraph + Google Gemini\n"
        "[bold]🏆 Track:[/bold] AI Real World Agent — Build with Swytchcode",
        border_style="cyan",
        title="[bold magenta]Swytchcode Hackathon 2026[/bold magenta]",
    ))
    console.print()


def print_results(final_state: dict):
    """Print a beautifully formatted summary of the 7-integration Day Planner."""
    console.print()
    console.print(Panel("[bold green]✅ Locus Day Plan Complete[/bold green]", border_style="green"))

    # ── Weather ───────────────────────────────────────────────────
    console.print()
    console.print(Panel(
        f"[bold]{final_state.get('weather_summary', 'N/A')}[/bold]\n"
        f"[dim]{final_state.get('forecast_summary', '')}[/dim]",
        title="[bold cyan]🌤️ Weather Report[/bold cyan]",
        border_style="cyan",
    ))

    # ── Office Decision ───────────────────────────────────────────
    go_to = final_state.get("go_to_office", "?").upper()
    office_reason = final_state.get("office_reason", "")
    office_badge_map = {
        "OFFICE": ("🏢", "WORK FROM OFFICE", "green"),
        "WFH":    ("🏠", "WORK FROM HOME", "blue"),
        "HYBRID": ("🔀", "HYBRID WORK", "yellow"),
        "YES":    ("🏢", "WORK FROM OFFICE", "green"),
        "NO":     ("🏠", "WORK FROM HOME", "blue"),
    }
    o_icon, o_label, o_color = office_badge_map.get(
        go_to,
        ("🏢", f"WORK FROM {go_to}", "green") if "OFFICE" in go_to
        else (("🏠", f"WORK FROM {go_to}", "blue") if "WFH" in go_to
        else (("🔀", f"{go_to} WORK", "yellow") if "HYBRID" in go_to
        else ("❓", go_to, "white")))
    )
    prod_h = final_state.get("estimated_productive_hours", 0)
    console.print()
    console.print(Panel(
        f"[bold {o_color}]{o_icon} {o_label}[/bold {o_color}]\n"
        f"[dim]{office_reason}[/dim]\n"
        f"[bold]⚡ Productive hours today:[/bold] ~{prod_h}h",
        title="[bold magenta]🏢 Office / WFH Decision[/bold magenta]",
        border_style="magenta",
    ))

    # ── Main metrics table ─────────────────────────────────────────
    table = Table(title="Day Planner — Execution Summary", show_header=True, header_style="bold magenta")
    table.add_column("Integration", style="cyan", min_width=22)
    table.add_column("Result", style="white")

    score = final_state.get("weather_score", 0)
    score_bar = "█" * int(score / 10) + "░" * (10 - int(score / 10))
    risk = final_state.get("risk_level", "unknown").upper()
    risk_colors = {"LOW": "green", "MEDIUM": "yellow", "HIGH": "red", "CRITICAL": "magenta"}
    risk_color = risk_colors.get(risk, "white")

    table.add_row("🌤️ OpenWeather",   f"{final_state.get('weather_condition', 'N/A')} · {final_state.get('temperature_c', 0):.1f}°C · score: {score_bar} {score}/100")
    table.add_row("📬 Gmail",          f"{len(final_state.get('gmail_events', []))} emails · outdoor={final_state.get('has_outdoor_plans', False)} · travel={final_state.get('has_travel_plans', False)}")
    table.add_row("📋 Jira",           final_state.get('jira_summary', 'Not fetched')[:80])
    table.add_row("🐙 GitHub",         final_state.get('github_summary', 'Not fetched')[:80])
    table.add_row("Risk Level",        f"[{risk_color}]{risk}[/{risk_color}]")
    table.add_row("📓 Notion",         "✅ Logged" if final_state.get("notion_logged") else "❌ Not logged")
    table.add_row("💬 Slack",          "✅ Sent" if final_state.get("slack_message_sent") else "ℹ️ Skipped (low risk)")
    table.add_row("📧 Resend Email",   "✅ Sent" if final_state.get("email_sent") else "❌ Not sent")
    console.print(table)

    # ── AI Day Plan Briefing ──────────────────────────────────────
    ai_summary = final_state.get("ai_summary", "")
    if ai_summary:
        console.print()
        console.print(Panel(
            ai_summary,
            title="[bold yellow]🧠 AI Day Briefing[/bold yellow]",
            border_style="yellow",
        ))

    # ── Day Plan Timeline ─────────────────────────────────────────
    timeline = final_state.get("day_plan_timeline", [])
    if timeline:
        console.print()
        console.print("[bold]⏰ Your Personalised Day Plan:[/bold]")
        for slot in timeline:
            if isinstance(slot, dict):
                t_time = slot.get("time", "")
                t_act = slot.get("activity", "")
                console.print(f"  [cyan]▸[/cyan] [bold]{t_time}:[/bold] {t_act}")
            else:
                console.print(f"  [cyan]▸[/cyan] {slot}")

    # ── Workload Breakdown Tables (Jira & GitHub) ───────────────
    jira_tickets = final_state.get("jira_tickets") or final_state.get("jira_issues", [])
    if jira_tickets:
        console.print()
        j_table = Table(title="📋 Jira Workload Breakdown", show_header=True, header_style="bold blue")
        j_table.add_column("Key", style="bold cyan", width=12)
        j_table.add_column("Summary", style="white")
        j_table.add_column("Priority", style="yellow", width=10)
        j_table.add_column("Est. Hours", style="green", width=12)
        for t in jira_tickets[:6]:
            j_table.add_row(t.get("key", ""), t.get("summary", "")[:60], t.get("priority", "Normal"), f"~{t.get('estimated_hours', 2)}h")
        console.print(j_table)

    prs = final_state.get("github_prs", [])
    if prs:
        console.print()
        g_table = Table(title="🐙 GitHub Workload Breakdown", show_header=True, header_style="bold purple")
        g_table.add_column("PR #", style="bold cyan", width=8)
        g_table.add_column("Title", style="white")
        g_table.add_column("Author", style="magenta", width=14)
        g_table.add_column("Review Hours", style="green", width=14)
        for pr in prs[:6]:
            author = pr.get("author") or pr.get("user", "")
            hours = pr.get("estimated_hours") or pr.get("est_hours") or pr.get("review_hours", 1.5)
            g_table.add_row(f"#{pr.get('number', 0)}", pr.get("title", "")[:60], f"@{author}", f"~{hours}h")
        console.print(g_table)

    # ── Recommendations ───────────────────────────────────────────
    recs = final_state.get("recommendations", [])
    if recs:
        console.print()
        console.print("[bold]📋 Smart Recommendations:[/bold]")
        for rec in recs:
            console.print(f"  {rec}")

    # ── Weather Alerts ────────────────────────────────────────────
    alerts = final_state.get("weather_alerts", [])
    if alerts:
        console.print()
        console.print(Panel(
            "\n".join(alerts),
            title="[bold red]⚠️ Weather Alerts[/bold red]",
            border_style="red",
        ))

    # ── Outfit ────────────────────────────────────────────────────
    outfit = final_state.get("outfit_suggestion", "")
    if outfit:
        console.print()
        console.print(f"[bold]👔 Outfit Suggestion:[/bold] {outfit}")

    # ── Notion URL ────────────────────────────────────────────────
    notion_url = final_state.get("notion_page_url", "")
    if notion_url:
        console.print()
        console.print(f"[bold dim]📓 Full Day Plan in Notion:[/bold dim] [link={notion_url}]{notion_url}[/link]")

    # ── Execution Log ─────────────────────────────────────────────
    console.print()
    console.print("[bold]📋 Execution Log:[/bold]")
    for entry in final_state.get("execution_log", [])[-20:]:
        console.print(f"  {entry}")


def run_demo(city: str = None, email: str = None):
    """Run the agent with a sample day-planning request in demo mode."""
    console.print("[bold yellow]🧪 Running in DEMO mode...[/bold yellow]")

    city = city or Config.DEFAULT_CITY or "Mumbai"
    user_email = email or Config.JIRA_EMAIL or "demo@example.com"

    demo_request = (
        f"Plan my entire day in {city}. I have a team standup at 10 AM and a client call at 3 PM. "
        f"Also check my Jira tickets and GitHub PRs to estimate how much coding work I have. "
        f"Should I go to office today given the weather? Send me a full briefing with a timeline."
    )

    console.print(f"\n[bold dim]📝 Demo Request:[/bold dim] {demo_request}\n")

    initial_state = {
        "user_request": demo_request,
        "user_email": user_email,
        "city": city,
        "execution_log": [f"🧪 [Demo] Locus Day Planner started at {datetime.now().isoformat()}"],
    }

    state = preprocess_state(initial_state)

    # Run through all 8 nodes sequentially with progress display
    steps = [
        ("🌦️  Fetching weather data...", "weather_fetcher"),
        ("📬 Reading Gmail context...", "gmail_reader"),
        ("📋 Fetching Jira workload...", "jira_workload"),
        ("🐙 Fetching GitHub workload...", "github_workload"),
        ("🧠 Analyzing with Gemini AI...", "ai_advisor"),
        ("📓 Logging to Notion...", "notion_logger"),
        ("📢 Sending Slack alert...", "slack_notifier"),
        ("📤 Sending email digest...", "email_sender"),
    ]

    from src.nodes import (
        weather_fetcher, gmail_reader, jira_workload, github_workload,
        ai_advisor, notion_logger, slack_notifier, email_sender
    )
    node_fns = [
        weather_fetcher.run,
        gmail_reader.run,
        jira_workload.run,
        github_workload.run,
        ai_advisor.run,
        notion_logger.run,
        slack_notifier.run,
        email_sender.run,
    ]

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        for i, ((desc, _), fn) in enumerate(zip(steps, node_fns)):
            task = progress.add_task(desc, total=None)
            state = fn(state)
            progress.update(task, completed=True, description=f"✅ {desc[3:]}")

    print_results(state)


def run_interactive(city: str = None, email: str = None):
    """Run the agent interactively with user input."""
    console.print("[bold green]🔴 Interactive Mode — Locus AI Agent[/bold green]")
    console.print("[dim]Tell me about your plans and I'll give you a weather-aware briefing.[/dim]\n")

    default_city = city or Config.DEFAULT_CITY
    user_request = console.input(f"[bold cyan]📝 Your request[/bold cyan] [dim](default city: {default_city})[/dim]: ").strip()
    if not user_request:
        user_request = f"Give me a weather briefing for {default_city} today."

    user_email = email or Config.RESEND_TO_EMAIL or Config.JIRA_EMAIL or ""
    if not user_email:
        user_email = console.input("[bold cyan]📧 Your email (for digest):[/bold cyan] ").strip()

    console.print()
    console.print("[bold yellow]⚙️  Agent is working...[/bold yellow]")
    console.print()

    initial_state = {
        "user_request": user_request,
        "user_email": user_email,
        "city": default_city,
        "execution_log": [f"🚀 Locus Agent started at {datetime.now().isoformat()}"],
    }

    state = preprocess_state(initial_state)
    final_state = weather_agent.invoke(state)
    print_results(final_state)


def verify_setup():
    """Verify Swytchcode and API connectivity."""
    console.print("[bold]🔍 Verifying Locus Agent Setup...[/bold]\n")

    checks = [
        ("Google Gemini API Key", bool(Config.GOOGLE_API_KEY), "GOOGLE_API_KEY"),
        ("OpenWeather API Key", bool(Config.OPENWEATHER_API_KEY), "OPENWEATHER_API_KEY"),
        ("Notion Database ID", bool(Config.NOTION_KB_DATABASE_ID), "NOTION_KB_DATABASE_ID"),
        ("Notion API Key", bool(Config.NOTION_API_KEY), "NOTION_API_KEY"),
        ("Resend API Key", bool(Config.RESEND_API_KEY), "RESEND_API_KEY"),
        ("Slack Webhook/Token", bool(Config.SLACK_WEBHOOK_URL or Config.SLACK_BOT_TOKEN), "SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN"),
    ]

    table = Table(title="Configuration Status", show_header=True, header_style="bold magenta")
    table.add_column("Integration", style="cyan")
    table.add_column("Status", style="white")
    table.add_column("Env Var", style="dim")

    for name, ok, env_var in checks:
        status = "[green]✅ Configured[/green]" if ok else "[red]❌ Missing[/red]"
        table.add_row(name, status, env_var)

    console.print(table)

    # Test OpenWeather connectivity
    if Config.OPENWEATHER_API_KEY:
        import requests
        try:
            resp = requests.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"q": Config.DEFAULT_CITY, "appid": Config.OPENWEATHER_API_KEY, "units": "metric"},
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                temp = data["main"]["temp"]
                cond = data["weather"][0]["description"]
                console.print(f"\n[green]✅ OpenWeather API works! {Config.DEFAULT_CITY}: {cond} at {temp:.1f}°C[/green]")
            else:
                console.print(f"\n[red]❌ OpenWeather API error: {resp.status_code}[/red]")
        except Exception as e:
            console.print(f"\n[red]❌ OpenWeather connectivity failed: {e}[/red]")


def main():
    print_banner()

    # Parse --city and --email CLI arguments globally
    city = None
    email = None
    if "--city" in sys.argv:
        idx = sys.argv.index("--city")
        if idx + 1 < len(sys.argv):
            city = sys.argv[idx + 1]
    if "--email" in sys.argv:
        idx = sys.argv.index("--email")
        if idx + 1 < len(sys.argv):
            email = sys.argv[idx + 1]

    if "--verify" in sys.argv:
        verify_setup()
        return

    if "--demo" in sys.argv:
        run_demo(city=city, email=email)
        return

    # Validate critical config
    missing = Config.validate()
    if missing:
        console.print(f"[bold red]❌ Missing required config:[/bold red] {', '.join(missing)}")
        console.print("[dim]Copy .env.example to .env and fill in the values.[/dim]")
        console.print("[dim]Run `python main.py --verify` to see full setup status.[/dim]")
        return

    run_interactive(city=city, email=email)


if __name__ == "__main__":
    main()
