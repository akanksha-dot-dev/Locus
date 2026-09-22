"""
Knowledge Search Node — Notion Integration via Swytchcode.

Searches the company knowledge base (stored as a Notion database)
for articles matching the classified issue keywords/category.
"""
from swytchcode_runtime import exec as swy_exec
from src.config import Config


def _build_notion_filter(keywords: list[str], category: str) -> dict:
    """Build a Notion database query filter from keywords and category."""
    # Use a simple title search filter
    if keywords:
        return {
            "or": [
                {
                    "property": "Name",
                    "title": {"contains": kw}
                }
                for kw in keywords[:3]  # Limit to top 3 keywords
            ]
        }
    return {
        "property": "Name",
        "title": {"contains": category}
    }


def _extract_page_content(page: dict) -> dict:
    """Extract useful content from a Notion page result."""
    props = page.get("properties", {})
    title = ""
    # Extract title from the Name property
    name_prop = props.get("Name", {})
    title_parts = name_prop.get("title", [])
    if title_parts:
        title = title_parts[0].get("plain_text", "")

    return {
        "id": page.get("id", ""),
        "title": title,
        "url": page.get("url", ""),
        "last_edited": page.get("last_edited_time", ""),
    }


def run(state: dict) -> dict:
    """
    Search Notion knowledge base for articles relevant to the support issue.

    Swytchcode tools used:
        - notion.databases.query  (read)
    """
    log = list(state.get("execution_log", []))
    keywords = state.get("keywords", [])
    category = state.get("issue_category", "")

    log.append(f"📚 [Notion] Searching KB for: {keywords or category}...")

    try:
        query_filter = _build_notion_filter(keywords, category)

        results = swy_exec("notion.query.create", {
            "path": {"data_source_id": Config.NOTION_KB_DATABASE_ID},
            "body": {
                "filter": query_filter,
                "page_size": 5,
            }
        })

        pages = results.get("results", [])
        kb_articles = [_extract_page_content(p) for p in pages]
        found = len(kb_articles) > 0

        if found:
            titles = [a["title"] for a in kb_articles if a["title"]]
            summary = "Found relevant KB articles: " + "; ".join(titles)
            log.append(f"✅ [Notion] Found {len(kb_articles)} KB articles")
        else:
            summary = ""
            log.append("⚠️  [Notion] No matching KB articles found — will escalate")

        return {
            **state,
            "kb_results": kb_articles,
            "kb_match_found": found,
            "kb_answer_summary": summary,
            "execution_log": log,
        }

    except Exception as e:
        log.append(f"❌ [Notion] Search error: {e}")
        return {
            **state,
            "kb_results": [],
            "kb_match_found": False,
            "kb_answer_summary": "",
            "execution_log": log,
        }
