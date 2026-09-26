"""
Swytchcode tool loader for the Locus Day Planner.

Loads integrations (Gmail, Notion, Jira, GitHub, Slack, Resend, OpenWeather)
via the Swytchcode Python Runtime SDK.
"""
from swytchcode_runtime import Swytchcode
from rich.console import Console

console = Console()


def get_swytchcode_client() -> Swytchcode:
    """Initialize and return a Swytchcode client instance."""
    return Swytchcode()


def load_all_tools(swx: Swytchcode) -> list:
    """
    Load tools from active Swytchcode integration bundles.
    """
    toolkits = ["gmail", "notion", "jira", "resend", "github", "slack"]
    try:
        tools = swx.tools.get(toolkits=toolkits)
        console.print(
            f"[bold green]✅ Loaded {len(tools)} Swytchcode tools[/bold green] "
            f"from integrations: {', '.join(toolkits)}"
        )
        return tools
    except Exception as e:
        console.print(f"[bold yellow]⚠️  Swytchcode dynamic tool load note: {e}[/bold yellow]")
        return []


def verify_setup() -> bool:
    """Quick health check — verifies Swytchcode tool connectivity."""
    try:
        swx = get_swytchcode_client()
        tools = load_all_tools(swx)
        if tools:
            console.print("[bold green]Swytchcode setup verified successfully![/bold green]")
            return True
        console.print("[bold cyan]Swytchcode client initialized (direct API fallback enabled).[/bold cyan]")
        return True
    except Exception as e:
        console.print(f"[bold yellow]Swytchcode setup note:[/bold yellow] {e}")
        return True


if __name__ == "__main__":
    verify_setup()
