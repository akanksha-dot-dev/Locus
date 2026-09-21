"""
Swytchcode tool loader for the AI Customer Support Knowledge Agent.

Loads all 5 integration toolkits (Gmail, Notion, Jira, Resend, GitHub)
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
    Load tools from all 5 integration bundles.

    Each bundle must have been fetched first with:
        swy get gmail && swy get notion && swy get jira && swy get resend && swy get github
    """
    toolkits = ["gmail", "notion", "jira", "resend", "github"]
    tools = swx.tools.get(toolkits=toolkits)
    console.print(
        f"[bold green]✅ Loaded {len(tools)} Swytchcode tools[/bold green] "
        f"from {len(toolkits)} integrations: {', '.join(toolkits)}"
    )
    return tools


def verify_setup() -> bool:
    """Quick health check — loads tools and prints a summary."""
    try:
        swx = get_swytchcode_client()
        tools = load_all_tools(swx)
        if tools:
            console.print("[bold green]Swytchcode setup verified successfully![/bold green]")
            return True
        console.print("[bold red]No tools loaded — run the setup script first.[/bold red]")
        return False
    except Exception as e:
        console.print(f"[bold red]Swytchcode setup error:[/bold red] {e}")
        return False


if __name__ == "__main__":
    verify_setup()
