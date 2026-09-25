"""
SwytchAgent Day Planner (WeatherWise v2.0) — Automated Test Suite
Requirement R4: Automated Testing and Verification Suite

Covers:
  1. TestIndividualNodes:
     - Tests all 8 nodes in isolation with and without credentials (verifying genuine fallback behavior)
     - weather_fetcher, gmail_reader, jira_workload, github_workload,
       ai_advisor, notion_logger, slack_notifier, email_sender
     - Asserts output keys, types, and fallback data structures
  2. TestLangGraphWorkflow:
     - Tests build_agent_graph() compilation
     - Runs the compiled graph end-to-end on initial state
     - Asserts all 8 nodes execute in sequence and state is fully populated
  3. TestFastAPIEndpoints:
     - Uses fastapi.testclient.TestClient(server.app)
     - Tests GET /health
     - Tests GET /weather/{city} (lookup and mock fallback)
     - Tests POST /demo (synthesized state fields)
     - Tests POST /run (complete response structure)
     - Tests GET /history (history list returned)
     - Tests GET /analytics (total_runs, office_distribution)
  4. TestCLIExecution:
     - Uses subprocess.run([sys.executable, "main.py", "--demo"])
     - Asserts exit code 0
     - Asserts 8 step indicators, Jira/GitHub tables, and Office/WFH badge

Run with:
  python test_day_planner.py
"""
import sys
import os
import unittest
from unittest.mock import patch, MagicMock
import subprocess

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.dirname(__file__))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from src.config import Config
from src.agent import build_agent_graph, preprocess_state, weather_agent
from src.nodes import (
    weather_fetcher,
    gmail_reader,
    jira_workload,
    github_workload,
    ai_advisor,
    notion_logger,
    slack_notifier,
    email_sender,
)
import server
from fastapi.testclient import TestClient


# ==============================================================================
# 1. INDIVIDUAL NODES & FALLBACKS
# ==============================================================================
class TestIndividualNodes(unittest.TestCase):
    """Unit tests for each of the 8 pipeline nodes in isolation."""

    # ── 1. Weather Fetcher ───────────────────────────────────────────────────
    def test_weather_fetcher_without_credentials(self):
        """Verifies weather_fetcher falls back to structured demo data when API key is missing."""
        state = {"city": "Mumbai", "execution_log": []}
        with patch.object(Config, "OPENWEATHER_API_KEY", ""):
            res = weather_fetcher.run(state)

        self.assertIsInstance(res, dict)
        self.assertEqual(res.get("temperature_c"), 28.0)
        self.assertEqual(res.get("feels_like_c"), 30.0)
        self.assertEqual(res.get("humidity"), 72)
        self.assertEqual(res.get("wind_speed"), 4.2)
        self.assertEqual(res.get("weather_condition"), "Clouds")
        self.assertIn("Demo weather for Mumbai", res.get("weather_summary", ""))
        self.assertIsInstance(res.get("weather_alerts"), list)
        self.assertIn("forecast_summary", res)
        self.assertTrue(any("API key not configured" in line for line in res.get("execution_log", [])))

    def test_weather_fetcher_with_credentials_mock(self):
        """Verifies weather_fetcher parses live OpenWeather API response accurately."""
        state = {"city": "Pune", "execution_log": []}
        mock_current = {
            "main": {"temp": 24.5, "feels_like": 25.0, "humidity": 68},
            "weather": [{"main": "Rain", "description": "moderate rain", "icon": "10d"}],
            "wind": {"speed": 5.2},
        }
        mock_forecast = {
            "list": [
                {"main": {"temp": 24.0}, "weather": [{"main": "Rain"}]},
                {"main": {"temp": 26.0}, "weather": [{"main": "Clouds"}]},
            ]
        }
        with patch.object(Config, "OPENWEATHER_API_KEY", "mock_ow_key_123"):
            with patch("src.nodes.weather_fetcher._get_current_weather", return_value=mock_current):
                with patch("src.nodes.weather_fetcher._get_forecast", return_value=mock_forecast):
                    res = weather_fetcher.run(state)

        self.assertEqual(res.get("temperature_c"), 24.5)
        self.assertEqual(res.get("feels_like_c"), 25.0)
        self.assertEqual(res.get("humidity"), 68)
        self.assertEqual(res.get("wind_speed"), 5.2)
        self.assertEqual(res.get("weather_condition"), "Rain")
        self.assertIn("Pune", res.get("weather_summary", ""))
        self.assertTrue(any("Severe weather: Rain" in alert for alert in res.get("weather_alerts", [])))
        self.assertTrue(any("✅ [OpenWeather]" in line for line in res.get("execution_log", [])))

    # ── 2. Gmail Reader ──────────────────────────────────────────────────────
    def test_gmail_reader_fallback_without_credentials(self):
        """Verifies gmail_reader falls back to simulated email context when Swytchcode is absent."""
        state = {"execution_log": []}
        with patch("src.nodes.gmail_reader._HAS_SWYTCHCODE", False):
            res = gmail_reader.run(state)

        self.assertIsInstance(res, dict)
        events = res.get("gmail_events", [])
        self.assertIsInstance(events, list)
        self.assertGreaterEqual(len(events), 3)
        self.assertTrue(res.get("has_outdoor_plans"))
        self.assertTrue(res.get("has_travel_plans"))
        self.assertIn("Outdoor plans detected", res.get("gmail_summary", ""))
        self.assertIn("Travel plans detected", res.get("gmail_summary", ""))
        for ev in events:
            self.assertIn("subject", ev)
            self.assertIn("from", ev)
            self.assertIn("snippet", ev)

    def test_gmail_reader_with_mocked_swytchcode(self):
        """Verifies gmail_reader processes incoming email items via Swytchcode."""
        state = {"execution_log": []}
        mock_list = {"data": {"messages": [{"id": "msg_001"}]}}
        mock_detail = {
            "data": {
                "payload": {
                    "headers": [
                        {"name": "Subject", "value": "Team Trekking Trip to Hills"},
                        {"name": "From", "value": "lead@org.com"},
                        {"name": "Date", "value": "Thu, 25 Sep 2026"},
                    ],
                    "body": {"data": ""},
                },
                "snippet": "Join us for an outdoor hike this weekend.",
            }
        }
        with patch("src.nodes.gmail_reader._HAS_SWYTCHCODE", True):
            with patch("src.nodes.gmail_reader.swy_exec", side_effect=[mock_list, mock_detail]):
                res = gmail_reader.run(state)

        events = res.get("gmail_events", [])
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["subject"], "Team Trekking Trip to Hills")
        self.assertTrue(res.get("has_outdoor_plans"))

    # ── 3. Jira Workload ─────────────────────────────────────────────────────
    def test_jira_workload_fallback_without_credentials(self):
        """Verifies jira_workload falls back to sprint demo tickets when credentials are not configured."""
        state = {"execution_log": []}
        with patch.object(Config, "JIRA_DOMAIN", ""):
            with patch.object(Config, "JIRA_EMAIL", ""):
                with patch.object(Config, "JIRA_API_TOKEN", ""):
                    with patch("src.nodes.jira_workload._HAS_SWYTCHCODE", False):
                        res = jira_workload.run(state)

        issues = res.get("jira_issues", [])
        self.assertEqual(len(issues), 4)
        self.assertEqual(res.get("jira_total_hours"), 8.0)
        self.assertEqual(res.get("jira_high_priority"), 2)
        self.assertEqual(res.get("jira_blocked_count"), 0)
        self.assertIn("4 open Jira tickets", res.get("jira_summary", ""))
        self.assertIsInstance(res.get("jira_issue_lines"), list)
        self.assertEqual(len(res.get("jira_issue_lines")), 4)
        for issue in issues:
            self.assertIn("key", issue)
            self.assertIn("summary", issue)
            self.assertIn("priority", issue)
            self.assertIn("estimated_hours", issue)

    def test_jira_workload_with_credentials_mock(self):
        """Verifies jira_workload parses REST response from Jira Cloud API."""
        state = {"execution_log": []}
        mock_jira_resp = MagicMock()
        mock_jira_resp.status_code = 200
        mock_jira_resp.json.return_value = {
            "issues": [
                {
                    "key": "DEV-204",
                    "fields": {
                        "summary": "Fix connection pool exhaustion in database",
                        "priority": {"name": "Highest"},
                        "status": {"name": "In Progress"},
                        "issuetype": {"name": "Bug"},
                        "timeestimate": 14400,  # 4 hours
                    },
                },
                {
                    "key": "DEV-205",
                    "fields": {
                        "summary": "Add OpenAPI schema tags",
                        "priority": {"name": "Low"},
                        "status": {"name": "To Do"},
                        "issuetype": {"name": "Task"},
                        "timeestimate": 3600,   # 1 hour
                    },
                },
            ]
        }
        with patch.object(Config, "JIRA_DOMAIN", "jira.example.com"):
            with patch.object(Config, "JIRA_EMAIL", "dev@example.com"):
                with patch.object(Config, "JIRA_API_TOKEN", "api_token_abc"):
                    with patch("src.nodes.jira_workload._HAS_SWYTCHCODE", False):
                        with patch("requests.post", return_value=mock_jira_resp), patch("requests.get", return_value=mock_jira_resp):
                            res = jira_workload.run(state)

        issues = res.get("jira_issues", [])
        self.assertEqual(len(issues), 2)
        self.assertEqual(issues[0]["key"], "DEV-204")
        self.assertEqual(issues[0]["estimated_hours"], 4.0)
        self.assertEqual(issues[1]["estimated_hours"], 1.0)
        self.assertEqual(res.get("jira_total_hours"), 5.0)
        self.assertEqual(res.get("jira_high_priority"), 1)

    # ── 4. GitHub Workload ───────────────────────────────────────────────────
    def test_github_workload_fallback_without_credentials(self):
        """Verifies github_workload provides demo PRs and issues when tokens are absent."""
        state = {"execution_log": []}
        with patch("src.nodes.github_workload._HAS_SWYTCHCODE", False):
            with patch("os.getenv", return_value=""):
                with patch.object(Config, "GITHUB_OWNER", ""):
                    with patch.object(Config, "GITHUB_REPO", ""):
                        res = github_workload.run(state)

        prs = res.get("github_prs", [])
        issues = res.get("github_issues_open", [])
        self.assertEqual(len(prs), 2)
        self.assertEqual(len(issues), 2)
        self.assertEqual(res.get("github_total_hours"), 4.0)
        self.assertIn("2 open PRs", res.get("github_summary", ""))
        self.assertEqual(prs[0]["number"], 42)
        self.assertEqual(prs[0]["author"], "iakankshaa")
        self.assertEqual(prs[0]["estimated_hours"], 1.5)
        self.assertEqual(issues[0]["number"], 99)
        self.assertEqual(issues[0]["estimated_hours"], 0.5)

    def test_github_workload_with_credentials_mock(self):
        """Verifies github_workload parses PRs from GitHub REST API."""
        state = {"execution_log": []}
        mock_prs_resp = MagicMock()
        mock_prs_resp.status_code = 200
        mock_prs_resp.json.return_value = [
            {
                "number": 88,
                "title": "Upgrade async client timeout",
                "state": "open",
                "draft": False,
                "created_at": "2026-09-20T10:00:00Z",
                "html_url": "https://github.com/org/repo/pull/88",
                "user": {"login": "octocat"},
            }
        ]
        with patch.object(Config, "GITHUB_OWNER", "test_owner"):
            with patch.object(Config, "GITHUB_REPO", "test_repo"):
                with patch("src.nodes.github_workload._HAS_SWYTCHCODE", False):
                    with patch("requests.get", return_value=mock_prs_resp):
                        res = github_workload.run(state)

        prs = res.get("github_prs", [])
        self.assertEqual(len(prs), 1)
        self.assertEqual(prs[0]["number"], 88)
        self.assertEqual(prs[0]["author"], "octocat")
        self.assertGreaterEqual(prs[0]["days_old"], 3)
        self.assertEqual(len(res.get("github_stale_prs", [])), 1)

    # ── 5. AI Advisor ────────────────────────────────────────────────────────
    def test_ai_advisor_heuristic_fallback_clear_weather(self):
        """Verifies ai_advisor heuristic fallback recommends office for favorable weather."""
        state = {
            "city": "Mumbai",
            "weather_condition": "Clear",
            "temperature_c": 26.0,
            "has_outdoor_plans": False,
            "has_travel_plans": False,
            "jira_total_hours": 3.0,
            "github_total_hours": 2.0,
            "jira_issues": [{"key": "PROJ-101", "summary": "Fix bug", "estimated_hours": 3.0}],
            "github_prs": [{"number": 42, "title": "Dark mode", "estimated_hours": 1.5}],
            "execution_log": [],
        }
        with patch.object(Config, "GOOGLE_API_KEY", ""):
            with patch("src.nodes.ai_advisor._get_client", side_effect=Exception("No API key")):
                res = ai_advisor.run(state)

        self.assertEqual(res.get("go_to_office"), "office")
        self.assertIn("Favorable weather", res.get("office_reason", ""))
        self.assertEqual(res.get("risk_level"), "low")
        self.assertEqual(res.get("weather_score"), 80)
        self.assertEqual(res.get("estimated_productive_hours"), 5.0)
        self.assertIsInstance(res.get("day_plan_timeline"), list)
        self.assertGreater(len(res.get("day_plan_timeline")), 0)
        self.assertIsInstance(res.get("recommendations"), list)
        self.assertIn("jira_tickets", res)

    def test_ai_advisor_heuristic_fallback_severe_weather(self):
        """Verifies ai_advisor heuristic fallback recommends WFH during severe storms and travel."""
        state = {
            "city": "Mumbai",
            "weather_condition": "Thunderstorm",
            "temperature_c": 22.0,
            "has_outdoor_plans": True,
            "has_travel_plans": True,
            "jira_total_hours": 4.0,
            "github_total_hours": 2.0,
            "execution_log": [],
        }
        with patch.object(Config, "GOOGLE_API_KEY", ""):
            with patch("src.nodes.ai_advisor._get_client", side_effect=Exception("No API key")):
                res = ai_advisor.run(state)

        self.assertEqual(res.get("go_to_office"), "wfh")
        self.assertIn("Thunderstorm", res.get("office_reason", ""))
        self.assertEqual(res.get("risk_level"), "high")
        self.assertTrue(res.get("should_alert"))

    def test_ai_advisor_with_mocked_gemini(self):
        """Verifies ai_advisor parses structured JSON response from Gemini model."""
        state = {
            "city": "Bengaluru",
            "weather_condition": "Clear",
            "temperature_c": 24.0,
            "jira_issues": [],
            "github_prs": [],
            "execution_log": [],
        }
        mock_response = MagicMock()
        mock_response.text = """
        {
            "weather_score": 92,
            "risk_level": "low",
            "go_to_office": "office",
            "office_reason": "Pleasant morning weather is ideal for commute and focused teamwork.",
            "estimated_productive_hours": 6.5,
            "day_plan_timeline": [
                "08:30-09:30: Morning commute",
                "09:30-12:30: Deep coding session",
                "12:30-13:30: Lunch",
                "13:30-17:00: PR reviews and standup"
            ],
            "recommendations": ["Pack water", "Take outer ring road"],
            "outfit_suggestion": "Breathable cotton shirt and jeans",
            "activity_adjustments": [],
            "ai_summary": "High productivity forecasted for Bengaluru today.",
            "should_alert": false
        }
        """
        with patch("src.nodes.ai_advisor._call_gemini_with_retry", return_value=mock_response):
            res = ai_advisor.run(state)

        self.assertEqual(res.get("weather_score"), 92)
        self.assertEqual(res.get("go_to_office"), "office")
        self.assertEqual(res.get("estimated_productive_hours"), 6.5)
        self.assertEqual(len(res.get("day_plan_timeline")), 4)
        self.assertFalse(res.get("should_alert"))
        self.assertIn("Pleasant morning", res.get("office_reason", ""))

    # ── 6. Notion Logger ─────────────────────────────────────────────────────
    def test_notion_logger_without_credentials(self):
        """Verifies notion_logger gracefully skips logging when database ID is not configured."""
        state = {"city": "Mumbai", "execution_log": []}
        with patch.object(Config, "NOTION_KB_DATABASE_ID", ""):
            with patch.object(Config, "NOTION_LOG_DATABASE_ID", ""):
                res = notion_logger.run(state)

        self.assertFalse(res.get("notion_logged"))
        self.assertTrue(any("No database ID configured" in line for line in res.get("execution_log", [])))

    def test_notion_logger_with_credentials_mock(self):
        """Verifies notion_logger creates page via Notion REST API."""
        state = {
            "city": "Mumbai",
            "weather_condition": "Clear",
            "temperature_c": 28.0,
            "weather_score": 85,
            "go_to_office": "office",
            "office_reason": "Good weather",
            "execution_log": [],
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "id": "notion_page_001",
            "url": "https://notion.so/day-plan-001",
        }
        with patch.object(Config, "NOTION_KB_DATABASE_ID", "mock_notion_db"):
            with patch.object(Config, "NOTION_API_KEY", "mock_notion_key"):
                with patch("src.nodes.notion_logger._HAS_SWYTCHCODE", False):
                    with patch("requests.post", return_value=mock_resp):
                        res = notion_logger.run(state)

        self.assertTrue(res.get("notion_logged"))
        self.assertEqual(res.get("notion_page_id"), "notion_page_001")
        self.assertEqual(res.get("notion_page_url"), "https://notion.so/day-plan-001")

    # ── 7. Slack Notifier ────────────────────────────────────────────────────
    def test_slack_notifier_no_alert_needed(self):
        """Verifies slack_notifier skips sending notification when risk is low and no alert is requested."""
        state = {"should_alert": False, "risk_level": "low", "execution_log": []}
        res = slack_notifier.run(state)
        self.assertFalse(res.get("slack_message_sent"))
        self.assertTrue(any("No alert conditions met" in line for line in res.get("execution_log", [])))

    def test_slack_notifier_alert_without_credentials(self):
        """Verifies slack_notifier handles missing webhook gracefully without crashing."""
        state = {"should_alert": True, "risk_level": "high", "city": "Mumbai", "execution_log": []}
        with patch.object(Config, "SLACK_WEBHOOK_URL", ""):
            with patch("src.nodes.slack_notifier._HAS_SWYTCHCODE", False):
                res = slack_notifier.run(state)

        self.assertFalse(res.get("slack_message_sent"))
        self.assertTrue(any("No webhook URL configured" in line for line in res.get("execution_log", [])))

    def test_slack_notifier_with_mocked_webhook(self):
        """Verifies slack_notifier formats Block Kit and sends webhook alert."""
        state = {
            "city": "Mumbai",
            "should_alert": True,
            "risk_level": "high",
            "weather_condition": "Thunderstorm",
            "temperature_c": 25.0,
            "go_to_office": "wfh",
            "office_reason": "Heavy storms",
            "estimated_productive_hours": 5.0,
            "execution_log": [],
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        with patch.object(Config, "SLACK_WEBHOOK_URL", "https://hooks.slack.com/services/mock"):
            with patch("src.nodes.slack_notifier._HAS_SWYTCHCODE", False):
                with patch("requests.post", return_value=mock_resp):
                    res = slack_notifier.run(state)

        self.assertTrue(res.get("slack_message_sent"))
        self.assertTrue(any("Message sent" in line for line in res.get("execution_log", [])))

    # ── 8. Email Sender ──────────────────────────────────────────────────────
    def test_email_sender_no_recipient(self):
        """Verifies email_sender skips execution when no user or fallback email is present."""
        state = {"user_email": "", "execution_log": []}
        with patch.object(Config, "RESEND_TO_EMAIL", ""):
            with patch.object(Config, "JIRA_EMAIL", ""):
                res = email_sender.run(state)

        self.assertFalse(res.get("email_sent"))
        self.assertTrue(any("No recipient email" in line for line in res.get("execution_log", [])))

    def test_email_sender_without_credentials(self):
        """Verifies email_sender handles absent API key without crashing."""
        state = {"user_email": "engineer@company.com", "execution_log": []}
        with patch.object(Config, "RESEND_API_KEY", ""):
            with patch("src.nodes.email_sender._HAS_SWYTCHCODE", False):
                res = email_sender.run(state)

        self.assertFalse(res.get("email_sent"))
        self.assertTrue(any("No API key configured" in line for line in res.get("execution_log", [])))

    def test_email_sender_with_mocked_rest(self):
        """Verifies email_sender constructs executive HTML template and delivers via Resend API."""
        state = {
            "city": "Mumbai",
            "user_email": "engineer@company.com",
            "weather_condition": "Clear",
            "temperature_c": 28.0,
            "go_to_office": "office",
            "office_reason": "Good weather for office commute",
            "day_plan_timeline": ["09:00-10:00: Standup"],
            "jira_tickets": [{"key": "DEV-101", "summary": "Fix bug", "priority": "High", "estimated_hours": 2.0}],
            "github_prs": [{"number": 1, "title": "Feature", "author": "dev", "estimated_hours": 1.5}],
            "execution_log": [],
        }
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"id": "resend_msg_001"}
        with patch.object(Config, "RESEND_API_KEY", "re_mock_api_key"):
            with patch("src.nodes.email_sender._HAS_SWYTCHCODE", False):
                with patch("requests.post", return_value=mock_resp):
                    res = email_sender.run(state)

        self.assertTrue(res.get("email_sent"))
        self.assertEqual(res.get("resend_message_id"), "resend_msg_001")


# ==============================================================================
# 2. LANGGRAPH WORKFLOW COMPILATION & EXECUTION
# ==============================================================================
class TestLangGraphWorkflow(unittest.TestCase):
    """Verifies LangGraph compilation, routing, and end-to-end execution across all 8 nodes."""

    def test_build_agent_graph_compilation(self):
        """Verifies build_agent_graph produces a compiled, executable LangGraph runnable."""
        graph = build_agent_graph()
        self.assertIsNotNone(graph)
        self.assertTrue(hasattr(graph, "invoke"), "Compiled graph must support invoke()")

    def test_langgraph_workflow_end_to_end(self):
        """Runs the compiled graph end-to-end and asserts state accumulation across all 8 nodes."""
        initial_state = {
            "user_request": "Plan my day in Mumbai with office recommendation and workload review",
            "city": "Mumbai",
            "user_email": "test_planner@example.com",
        }
        prepared = preprocess_state(initial_state)
        self.assertEqual(prepared.get("city"), "Mumbai")
        self.assertTrue(len(prepared.get("execution_log", [])) >= 2)

        # Invoke workflow
        final_state = weather_agent.invoke(prepared)

        # Assert weather node execution
        self.assertIn("weather_summary", final_state)
        self.assertIsInstance(final_state.get("temperature_c"), (int, float))
        self.assertIsInstance(final_state.get("humidity"), int)

        # Assert Gmail node execution
        self.assertIn("gmail_events", final_state)
        self.assertIsInstance(final_state.get("gmail_events"), list)
        self.assertIn("gmail_summary", final_state)

        # Assert Jira node execution
        self.assertTrue("jira_issues" in final_state or "jira_tickets" in final_state)
        self.assertIsInstance(final_state.get("jira_total_hours"), (int, float))

        # Assert GitHub node execution
        self.assertIn("github_prs", final_state)
        self.assertIsInstance(final_state.get("github_prs"), list)
        self.assertIsInstance(final_state.get("github_total_hours"), (int, float))

        # Assert AI advisor synthesis
        self.assertIn(final_state.get("go_to_office"), ("office", "wfh", "hybrid"))
        self.assertIsInstance(final_state.get("office_reason"), str)
        self.assertGreater(len(final_state.get("office_reason")), 0)
        self.assertIsInstance(final_state.get("day_plan_timeline"), list)
        self.assertGreater(len(final_state.get("day_plan_timeline")), 0)
        self.assertIsInstance(final_state.get("estimated_productive_hours"), (int, float))
        self.assertGreater(final_state.get("estimated_productive_hours"), 0)

        # Assert Notion, Slack, Resend outcomes
        self.assertIn("notion_logged", final_state)
        self.assertIn("slack_message_sent", final_state)
        self.assertIn("email_sent", final_state)

        # Assert execution log has entries from every stage
        log = final_state.get("execution_log", [])
        self.assertGreaterEqual(len(log), 8)


# ==============================================================================
# 3. FASTAPI REST ENDPOINTS
# ==============================================================================
class TestFastAPIEndpoints(unittest.TestCase):
    """Integration tests for all FastAPI REST endpoints using TestClient."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(server.app)

    def test_get_health(self):
        """Verifies GET /health returns status ok with integration map."""
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("agent"), "SwytchAgent Day Planner (WeatherWise v2.0)")
        self.assertEqual(data.get("version"), "2.0.0")
        self.assertIn("integrations", data)
        self.assertIsInstance(data.get("integrations"), dict)
        self.assertIn("openweather", data["integrations"])
        self.assertIn("jira", data["integrations"])
        self.assertIn("github", data["integrations"])

    def test_get_weather_city_lookup(self):
        """Verifies GET /weather/{city} retrieves weather for specified city."""
        resp = self.client.get("/weather/Mumbai")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("city").lower(), "mumbai")
        self.assertIn("temperature_c", data)
        self.assertIn("condition", data)
        self.assertIn("humidity", data)

    def test_get_weather_mock_fallback(self):
        """Verifies GET /weather/{city} falls back gracefully when API key is unconfigured."""
        with patch.object(Config, "OPENWEATHER_API_KEY", ""):
            resp = self.client.get("/weather/Bengaluru")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data.get("is_mock"))
            self.assertEqual(data.get("city"), "Bengaluru")
            self.assertIn("temperature_c", data)

    def test_post_demo(self):
        """Verifies POST /demo executes preset scenario and returns complete synthesized state."""
        payload = {"scenario": "day_planner_office", "city": "Mumbai"}
        resp = self.client.post("/demo", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Assert required fields
        self.assertEqual(data.get("city"), "Mumbai")
        self.assertIn(data.get("go_to_office"), ("office", "wfh", "hybrid"))
        self.assertIsInstance(data.get("office_reason"), str)
        self.assertGreater(len(data.get("office_reason")), 0)
        self.assertIn("feels_like_c", data)
        self.assertIsInstance(data.get("activity_adjustments"), list)
        self.assertIsInstance(data.get("jira_tickets"), list)
        self.assertIsInstance(data.get("github_prs"), list)
        self.assertIsInstance(data.get("day_plan_timeline"), list)
        self.assertGreater(len(data.get("day_plan_timeline")), 0)
        self.assertGreater(data.get("estimated_productive_hours", 0), 0)

    def test_post_run(self):
        """Verifies POST /run executes pipeline on custom user request."""
        payload = {
            "user_request": "Plan my schedule in Mumbai with 3 hours Jira focus and flight review",
            "city": "Mumbai",
            "user_email": "tester@example.com",
        }
        resp = self.client.post("/run", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get("city"), "Mumbai")
        self.assertIn(data.get("go_to_office"), ("office", "wfh", "hybrid"))
        self.assertIn("weather_summary", data)
        self.assertIn("ai_summary", data)
        self.assertIsInstance(data.get("day_plan_timeline"), list)

    def test_get_history(self):
        """Verifies GET /history returns past execution records."""
        resp = self.client.get("/history")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertIsInstance(data.get("items"), list)
        self.assertIn("total", data)
        self.assertGreaterEqual(data.get("total"), 0)

    def test_get_analytics(self):
        """Verifies GET /analytics returns aggregate metrics."""
        # Ensure at least 1 record in history for analytics calculation
        server.HISTORY.append({
            "processed_at": "2026-09-25T12:00:00",
            "city": "Mumbai",
            "weather_condition": "Clouds",
            "weather_score": 75,
            "risk_level": "low",
            "go_to_office": "office",
            "office_reason": "Pleasant day",
            "email_sent": True,
            "slack_message_sent": False,
            "notion_logged": True,
        })
        resp = self.client.get("/analytics")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("total_runs", data)
        self.assertGreaterEqual(data.get("total_runs"), 1)
        self.assertIn("office_distribution", data)
        self.assertIsInstance(data.get("office_distribution"), dict)


# ==============================================================================
# 4. CLI DEMO SUBPROCESS EXECUTION
# ==============================================================================
class TestCLIExecution(unittest.TestCase):
    """Verifies main.py CLI demo mode runs cleanly via subprocess."""

    def test_cli_demo_execution(self):
        """Runs python main.py --demo and asserts 0 exit code, 8 step indicators, tables, and badges."""
        cmd = [sys.executable, "main.py", "--demo"]
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=PROJECT_ROOT,
            timeout=120,
            encoding="utf-8",
            errors="replace",
        )

        self.assertEqual(
            proc.returncode, 0,
            f"CLI demo exited with non-zero status {proc.returncode}.\nSTDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}"
        )

        output = proc.stdout

        # Assert all 8 integration indicators are present
        node_indicators = {
            "OpenWeather": ["OpenWeather", "Weather Report", "Fetching weather data"],
            "Gmail": ["Gmail", "Reading Gmail context"],
            "Jira": ["Jira Workload Breakdown", "Jira", "Fetching Jira workload"],
            "GitHub": ["GitHub Workload Breakdown", "GitHub", "Fetching GitHub workload"],
            "Gemini / AI Advisor": ["AI Day Briefing", "Gemini", "Analyzing with Gemini AI"],
            "Notion": ["Notion", "Logging to Notion"],
            "Slack": ["Slack", "Sending Slack alert"],
            "Resend Email": ["Resend", "email digest", "Sending email digest"],
        }
        for node_name, patterns in node_indicators.items():
            self.assertTrue(
                any(p in output for p in patterns),
                f"Missing step indicator for '{node_name}' in CLI output."
            )

        # Assert Jira and GitHub breakdown tables
        self.assertIn("Jira Workload Breakdown", output, "CLI output must contain Jira Workload Breakdown table.")
        self.assertIn("GitHub Workload Breakdown", output, "CLI output must contain GitHub Workload Breakdown table.")

        # Assert Office / WFH decision badge
        self.assertIn("Office / WFH Decision", output, "CLI output must contain Office / WFH Decision panel.")
        has_badge = any(b in output for b in ["WORK FROM OFFICE", "WORK FROM HOME", "HYBRID WORK"])
        self.assertTrue(has_badge, "CLI output must contain an office recommendation badge.")


# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================
if __name__ == "__main__":
    unittest.main(verbosity=2)
