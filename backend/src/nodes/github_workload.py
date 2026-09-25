"""
GitHub Workload Node — GitHub Integration for Day Planning.

Fetches open Pull Requests and Issues assigned to (or authored by) the
current user from GitHub. Used by the Day Planner to estimate code-review
and development work needed today.

Swytchcode tools: github.pulls.list, github.issues.list
Fallback: Direct GitHub REST API v3

Track 5 — AI Real World Agent | Build with Swytchcode
"""
import os
import requests
from datetime import datetime, timezone
from src.config import Config

try:
    from swytchcode_runtime import exec as swy_exec
    _HAS_SWYTCHCODE = True
except Exception:
    _HAS_SWYTCHCODE = False

# Estimated hours per PR/Issue review
_PR_REVIEW_HOURS   = 1.5
_ISSUE_REPLY_HOURS = 0.5

_GH_API_BASE = "https://api.github.com"


def _gh_headers() -> dict:
    """Build GitHub API headers."""
    token = os.getenv("GITHUB_TOKEN", "")
    if not token:
        return {"Accept": "application/vnd.github+json"}
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _days_old(date_str: str) -> int:
    """Return how many days ago an ISO date string was."""
    if not date_str:
        return 0
    try:
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return (datetime.now(timezone.utc) - dt).days
    except Exception:
        return 0


def _fetch_my_prs_rest(log: list) -> list[dict]:
    """Fetch open PRs authored by the user via GitHub REST API."""
    owner = Config.GITHUB_OWNER
    repo  = Config.GITHUB_REPO
    if not owner or not repo:
        log.append("⚠️ [GitHub/PR] GITHUB_OWNER or GITHUB_REPO not configured")
        return []
    try:
        resp = requests.get(
            f"{_GH_API_BASE}/repos/{owner}/{repo}/pulls",
            headers=_gh_headers(),
            params={"state": "open", "per_page": 15},
            timeout=15,
        )
        if resp.status_code == 200:
            raw = resp.json()
            log.append(f"✅ [GitHub/PR] Found {len(raw)} open PRs in {owner}/{repo}")
            return raw
        else:
            log.append(f"⚠️ [GitHub/PR] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.append(f"❌ [GitHub/PR] Error: {e}")
    return []


def _fetch_my_issues_rest(log: list) -> list[dict]:
    """Fetch open issues assigned to the authenticated user via REST."""
    try:
        resp = requests.get(
            f"{_GH_API_BASE}/issues",
            headers=_gh_headers(),
            params={"state": "open", "filter": "assigned", "per_page": 15},
            timeout=15,
        )
        if resp.status_code == 200:
            raw = resp.json()
            # Exclude PRs (they appear in /issues too)
            issues_only = [i for i in raw if "pull_request" not in i]
            log.append(f"✅ [GitHub/Issues] Found {len(issues_only)} open assigned issues")
            return issues_only
        else:
            log.append(f"⚠️ [GitHub/Issues] HTTP {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log.append(f"❌ [GitHub/Issues] Error: {e}")
    return []


def _fetch_via_swytchcode_prs(log: list) -> list[dict]:
    """Fetch PRs via Swytchcode GitHub integration."""
    if not _HAS_SWYTCHCODE:
        return []
    try:
        result = swy_exec("github.pulls.list", {
            "params": {"owner": Config.GITHUB_OWNER, "repo": Config.GITHUB_REPO},
            "query":  {"state": "open", "per_page": 15},
        })
        data = result.get("data", result) if isinstance(result, dict) else {}
        prs = data if isinstance(data, list) else data.get("items", [])
        log.append(f"✅ [GitHub/Swytchcode] Found {len(prs)} open PRs")
        return prs
    except Exception as e:
        log.append(f"ℹ️  [GitHub/Swytchcode] {e}")
        return []


def _parse_pr(pr: dict) -> dict:
    """Parse a raw GitHub PR dict."""
    user_val = pr.get("user")
    if isinstance(user_val, dict):
        author = user_val.get("login", "")
    elif isinstance(user_val, str):
        author = user_val
    else:
        author = pr.get("author", "")

    est_h = pr.get("estimated_hours") or pr.get("est_hours") or pr.get("review_hours") or _PR_REVIEW_HOURS

    return {
        "type":            "PR",
        "number":          pr.get("number", 0),
        "title":           pr.get("title", "Untitled PR")[:80],
        "state":           pr.get("state", "open"),
        "draft":           pr.get("draft", False),
        "days_old":        _days_old(pr.get("created_at", "")),
        "url":             pr.get("html_url", ""),
        "author":          author,
        "user":            author,
        "est_hours":       est_h,
        "estimated_hours": est_h,
        "review_hours":    est_h,
    }


def _parse_issue(issue: dict) -> dict:
    """Parse a raw GitHub Issue dict."""
    user_val = issue.get("user")
    if isinstance(user_val, dict):
        author = user_val.get("login", "")
    elif isinstance(user_val, str):
        author = user_val
    else:
        author = issue.get("author", "")

    est_h = issue.get("estimated_hours") or issue.get("est_hours") or issue.get("review_hours") or _ISSUE_REPLY_HOURS

    return {
        "type":            "Issue",
        "number":          issue.get("number", 0),
        "title":           issue.get("title", "Untitled Issue")[:80],
        "state":           issue.get("state", "open"),
        "days_old":        _days_old(issue.get("created_at", "")),
        "url":             issue.get("html_url", ""),
        "author":          author,
        "user":            author,
        "est_hours":       est_h,
        "estimated_hours": est_h,
        "review_hours":    est_h,
    }


def _build_demo_github() -> tuple[list[dict], list[dict]]:
    """Return demo GitHub data when real API is not available."""
    prs = [
        {
            "type": "PR",
            "number": 42,
            "title": "Add dark mode support to dashboard",
            "state": "open",
            "draft": False,
            "days_old": 2,
            "url": "",
            "author": "iakankshaa",
            "user": "iakankshaa",
            "est_hours": 1.5,
            "estimated_hours": 1.5,
            "review_hours": 1.5,
        },
        {
            "type": "PR",
            "number": 43,
            "title": "Fix race condition in async email handler",
            "state": "open",
            "draft": True,
            "days_old": 0,
            "url": "",
            "author": "iakankshaa",
            "user": "iakankshaa",
            "est_hours": 1.5,
            "estimated_hours": 1.5,
            "review_hours": 1.5,
        },
    ]
    issues = [
        {
            "type": "Issue",
            "number": 99,
            "title": "Customer unable to reset password",
            "state": "open",
            "days_old": 1,
            "url": "",
            "author": "iakankshaa",
            "user": "iakankshaa",
            "est_hours": 0.5,
            "estimated_hours": 0.5,
            "review_hours": 0.5,
        },
        {
            "type": "Issue",
            "number": 100,
            "title": "Add export-to-CSV feature to reports",
            "state": "open",
            "days_old": 5,
            "url": "",
            "author": "iakankshaa",
            "user": "iakankshaa",
            "est_hours": 0.5,
            "estimated_hours": 0.5,
            "review_hours": 0.5,
        },
    ]
    return prs, issues


def run(state: dict) -> dict:
    """
    Fetch open GitHub PRs and Issues for Day Planning.

    Produces:
        - github_prs          : list of open pull request dicts
        - github_issues_open  : list of open issue dicts
        - github_total_hours  : estimated review/triage hours today
        - github_summary      : human-readable summary
        - github_stale_prs    : PRs older than 3 days (need attention)
    """
    log = list(state.get("execution_log", []))
    log.append("🐙 [GitHub] Fetching your open PRs and assigned issues...")

    has_token = bool(os.getenv("GITHUB_TOKEN", ""))

    # ── 1. Try Swytchcode ────────────────────────────────────────────
    raw_prs = _fetch_via_swytchcode_prs(log)
    raw_issues: list[dict] = []

    # ── 2. Fallback to REST ──────────────────────────────────────────
    if not raw_prs:
        raw_prs = _fetch_my_prs_rest(log)
    if has_token:
        raw_issues = _fetch_my_issues_rest(log)

    # ── 3. Parse ─────────────────────────────────────────────────────
    prs    = [_parse_pr(pr) for pr in raw_prs]
    issues = [_parse_issue(i) for i in raw_issues]

    # ── 4. Demo fallback ─────────────────────────────────────────────
    if not prs and not issues:
        log.append("ℹ️  [GitHub] No live data — using demo items for Day Planner")
        prs, issues = _build_demo_github()

    # ── 5. Compute metrics ───────────────────────────────────────────
    stale_prs = [pr for pr in prs if pr["days_old"] >= 3]
    total_hours = round(
        sum(pr.get("estimated_hours", pr.get("est_hours", _PR_REVIEW_HOURS)) for pr in prs) +
        sum(i.get("estimated_hours", i.get("est_hours", _ISSUE_REPLY_HOURS)) for i in issues), 1
    )

    # ── 6. Build summary ─────────────────────────────────────────────
    summary = (
        f"🐙 {len(prs)} open PRs ({len(stale_prs)} stale) · "
        f"{len(issues)} assigned issues · ~{total_hours}h code-review work"
    )
    log.append(f"✅ [GitHub] {summary}")

    return {
        **state,
        "github_prs":         prs,
        "github_issues_open": issues,
        "github_total_hours": total_hours,
        "github_summary":     summary,
        "github_stale_prs":   stale_prs,
        "execution_log":      log,
    }
