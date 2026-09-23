"""
KB Article Generator — Gemini writes + Notion pushes a full KB article.

Called when a support agent clicks "Generate Article" on a KB gap.
Uses Google Gemini to write a structured knowledge base article,
then pushes it to Notion via the REST API.
"""
import json
import time
import requests
from google import genai
from src.config import Config

_client = genai.Client(api_key=Config.GOOGLE_API_KEY)

KB_ARTICLE_PROMPT = """\
You are a technical writer for a customer support knowledge base.

Write a comprehensive, well-structured KB article for the following support issue.

ISSUE SUBJECT: {subject}
KEYWORDS: {keywords}
DESCRIPTION: {description}

Format the article in Markdown with this EXACT structure:

# [Descriptive article title]

## Problem

[Clear description of what the customer experiences]

## Root Cause

[Why this happens - be technical but accessible]

## Solution

[Step-by-step resolution]

### Steps
1. Step one
2. Step two
3. Step three

## Prevention

[How customers can avoid this in future]

## Related Articles
- Related topic 1
- Related topic 2

---
*Last updated: {today}*

Write the complete article. Be specific, actionable, and clear. Return ONLY the Markdown text.
"""


def _push_to_notion(title: str, markdown_content: str) -> dict:
    """Push the generated article to Notion as a new page."""
    if not Config.NOTION_API_KEY or not Config.NOTION_KB_DATABASE_ID:
        return {"success": False, "error": "Notion credentials not configured"}

    headers = {
        "Authorization": f"Bearer {Config.NOTION_API_KEY}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

    # Convert markdown to Notion blocks (simplified)
    blocks = []
    for line in markdown_content.split("\n"):
        line = line.rstrip()
        if not line:
            continue
        if line.startswith("# "):
            blocks.append({
                "object": "block",
                "type": "heading_1",
                "heading_1": {"rich_text": [{"type": "text", "text": {"content": line[2:]}}]}
            })
        elif line.startswith("## "):
            blocks.append({
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": line[3:]}}]}
            })
        elif line.startswith("### "):
            blocks.append({
                "object": "block",
                "type": "heading_3",
                "heading_3": {"rich_text": [{"type": "text", "text": {"content": line[4:]}}]}
            })
        elif line.startswith(("- ", "* ")):
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": line[2:]}}]}
            })
        elif line[0].isdigit() and ". " in line:
            text = line.split(". ", 1)[1] if ". " in line else line
            blocks.append({
                "object": "block",
                "type": "numbered_list_item",
                "numbered_list_item": {"rich_text": [{"type": "text", "text": {"content": text}}]}
            })
        elif line.startswith("---"):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
        else:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {"rich_text": [{"type": "text", "text": {"content": line}}]}
            })

    # Notion API: create page in the KB database
    payload = {
        "parent": {"database_id": Config.NOTION_KB_DATABASE_ID},
        "properties": {
            "title": {
                "title": [{"type": "text", "text": {"content": title}}]
            }
        },
        "children": blocks[:100],  # Notion API limit per request
    }

    try:
        resp = requests.post(
            "https://api.notion.com/v1/pages",
            headers=headers,
            json=payload,
            timeout=15,
        )
        if resp.status_code == 200:
            page = resp.json()
            return {
                "success": True,
                "notion_page_id": page.get("id"),
                "notion_page_url": page.get("url"),
            }
        else:
            return {"success": False, "error": f"Notion API {resp.status_code}: {resp.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def run(params: dict) -> dict:
    """
    Generate a KB article from a gap issue and push it to Notion.

    Args:
        params: {subject, keywords, description, issue_id}

    Returns:
        {article_text, notion_url, notion_page_id, title, success}
    """
    subject     = params.get("subject", "Unknown Issue")
    keywords    = params.get("keywords", [])
    description = params.get("description", "")
    issue_id    = params.get("issue_id")

    from datetime import date
    today = date.today().strftime("%B %d, %Y")

    prompt = KB_ARTICLE_PROMPT.format(
        subject=subject,
        keywords=", ".join(keywords) if keywords else "support, issue",
        description=description or subject,
        today=today,
    )

    # ── Generate with Gemini ───────────────────────────────────
    article_text = None
    for attempt in range(3):
        try:
            chat = _client.chats.create(model=Config.LLM_MODEL)
            resp = chat.send_message(prompt)
            if resp and resp.text:
                article_text = resp.text.strip()
                break
        except Exception as e:
            time.sleep(1.5 * (attempt + 1))

    if not article_text:
        return {
            "success": False,
            "error": "Gemini failed to generate article",
            "article_text": None,
            "notion_url": None,
        }

    # Extract title from first H1 line
    title = subject
    for line in article_text.split("\n"):
        if line.startswith("# "):
            title = line[2:].strip()
            break

    # ── Push to Notion ─────────────────────────────────────────
    notion_result = _push_to_notion(title, article_text)

    return {
        "success": True,
        "title": title,
        "article_text": article_text,
        "notion_url": notion_result.get("notion_page_url"),
        "notion_page_id": notion_result.get("notion_page_id"),
        "notion_pushed": notion_result.get("success", False),
        "notion_error": notion_result.get("error"),
        "issue_id": issue_id,
        "word_count": len(article_text.split()),
    }
