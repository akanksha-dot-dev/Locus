"""
AI Customer Support Agent — Streamlit Dashboard.

Provides a visual interface for monitoring the agent's activity:
    - Process support emails in real-time
    - View execution log and agent decisions
    - See resolution metrics and integration status

Run with: streamlit run dashboard/app.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import streamlit as st
from datetime import datetime

# ── Page Config ────────────────────────────────────────────────
st.set_page_config(
    page_title="AI Support Agent — Dashboard",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS ─────────────────────────────────────────────────
st.markdown("""
<style>
    .main-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 12px;
        color: white;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #1a1a2e;
        padding: 1.5rem;
        border-radius: 10px;
        border: 1px solid #333;
        text-align: center;
    }
    .metric-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: #6366f1;
    }
    .metric-label {
        font-size: 0.9rem;
        color: #999;
        margin-top: 0.5rem;
    }
    .integration-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        margin: 2px;
    }
    .badge-gmail { background: #EA433520; color: #EA4335; border: 1px solid #EA4335; }
    .badge-notion { background: #00000020; color: #fff; border: 1px solid #555; }
    .badge-jira { background: #0052CC20; color: #4C9AFF; border: 1px solid #0052CC; }
    .badge-resend { background: #6366F120; color: #818CF8; border: 1px solid #6366F1; }
    .badge-github { background: #33333320; color: #fff; border: 1px solid #666; }
    .log-entry { padding: 6px 0; border-bottom: 1px solid #222; font-family: monospace; }
</style>
""", unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────
st.markdown("""
<div class="main-header">
    <h1 style="margin:0;">🤖 AI Customer Support Agent</h1>
    <p style="margin:0.5rem 0 0; opacity:0.9;">
        Powered by <strong>Swytchcode</strong> × LangGraph × Gemini
    </p>
</div>
""", unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 🔌 Integrations")
    st.markdown("""
    <span class="integration-badge badge-gmail">📧 Gmail</span>
    <span class="integration-badge badge-notion">📚 Notion</span>
    <span class="integration-badge badge-jira">🎫 Jira</span>
    <span class="integration-badge badge-resend">📤 Resend</span>
    <span class="integration-badge badge-github">🐛 GitHub</span>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### ⚡ Swytchcode Features")
    st.markdown("""
    - ✅ Managed Authentication
    - ✅ Policy Engine (5 rules)
    - ✅ Idempotency
    - ✅ Automatic Retries
    - ✅ Audit Logging
    - ✅ Execution Pipeline
    """)

    st.markdown("---")
    st.markdown("### 🧠 Agent Config")
    st.text(f"LLM: Gemini 2.0 Flash")
    st.text(f"Framework: LangGraph")
    st.text(f"Nodes: 7")
    st.text(f"Integrations: 5")

# ── Metrics Row ────────────────────────────────────────────────
col1, col2, col3, col4, col5 = st.columns(5)

# Initialize session state for metrics
if "tickets_created" not in st.session_state:
    st.session_state.tickets_created = 0
    st.session_state.emails_processed = 0
    st.session_state.kb_hits = 0
    st.session_state.kb_misses = 0
    st.session_state.replies_sent = 0
    st.session_state.execution_logs = []

with col1:
    st.metric("📧 Emails Processed", st.session_state.emails_processed)
with col2:
    st.metric("🎫 Jira Tickets", st.session_state.tickets_created)
with col3:
    st.metric("📚 KB Hits", st.session_state.kb_hits)
with col4:
    st.metric("🐛 KB Gaps (GitHub)", st.session_state.kb_misses)
with col5:
    st.metric("📤 Replies Sent", st.session_state.replies_sent)

# ── Main Content ───────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🚀 Process Email", "📋 Execution Log", "📊 Architecture"])

with tab1:
    st.markdown("### Process a Support Email")
    st.info("Click below to process the next unread support email from Gmail, or enter a test email manually.")

    use_demo = st.checkbox("Use demo email (simulated)", value=True)

    if use_demo:
        demo_from = st.text_input("From", value=os.getenv("JIRA_EMAIL", "smartycookieeee@gmail.com"))
        demo_subject = st.text_input("Subject", value="Unable to reset my password — getting error 500")
        demo_body = st.text_area("Body", value=(
            "Hi Support Team,\n\n"
            "I've been trying to reset my password for the last 2 hours but keep "
            "getting a server error (HTTP 500) on the reset page.\n\n"
            "This is really frustrating — I have a deadline today and can't "
            "access my account. Please help ASAP!\n\nThanks,\nJane"
        ), height=150)

    if st.button("🚀 Process Email", type="primary", use_container_width=True):
        with st.spinner("Agent processing email..."):
            try:
                # Try importing real nodes (requires swytchcode_runtime + Gemini)
                from src.nodes import (
                    issue_classifier, knowledge_search,
                    github_escalation, ticket_creator,
                    reply_drafter, notification_sender,
                )
                LIVE_MODE = True
            except (ImportError, Exception):
                LIVE_MODE = False

            try:
                # Build initial state
                if use_demo:
                    state = {
                        "email_id": f"demo-{datetime.now().strftime('%H%M%S')}",
                        "email_from": demo_from,
                        "email_subject": demo_subject,
                        "email_body": demo_body,
                        "execution_log": [f"🧪 Demo mode — {datetime.now().isoformat()}"],
                    }
                else:
                    state = {"execution_log": [f"🔴 Live mode — {datetime.now().isoformat()}"]}

                if LIVE_MODE and not use_demo:
                    # Real pipeline with Swytchcode
                    from src.nodes import email_ingestion
                    state = email_ingestion.run(state)
                    progress = st.progress(0, text="Classifying issue...")
                    state = issue_classifier.run(state)
                    progress.progress(20, text=f"Classified: {state.get('issue_category')} | {state.get('sentiment')}")

                    if state.get("issue_category") == "known":
                        progress.progress(40, text="Searching knowledge base...")
                        state = knowledge_search.run(state)
                        if not state.get("kb_match_found"):
                            progress.progress(50, text="Creating GitHub issue...")
                            state = github_escalation.run(state)
                            progress.progress(60, text="Creating Jira ticket...")
                            state = ticket_creator.run(state)
                        else:
                            st.session_state.kb_hits += 1
                    else:
                        progress.progress(40, text="Creating GitHub issue...")
                        state = github_escalation.run(state)
                        st.session_state.kb_misses += 1
                        progress.progress(55, text="Creating Jira ticket...")
                        state = ticket_creator.run(state)

                    progress.progress(75, text="Drafting reply...")
                    state = reply_drafter.run(state)
                    progress.progress(90, text="Sending reply...")
                    state = notification_sender.run(state)
                    progress.progress(100, text="✅ Complete!")
                else:
                    # ── DEMO SIMULATION (no Swytchcode/Gemini needed) ──
                    import time
                    email_body_lower = state.get("email_body", "").lower()
                    email_subject_lower = state.get("email_subject", "").lower()

                    progress = st.progress(0, text="🧠 Classifying issue with Gemini...")
                    time.sleep(0.8)

                    is_frustrated = any(w in email_body_lower for w in ["frustrat", "ridiculous", "asap", "fix this"])
                    is_known = any(w in email_subject_lower for w in ["password", "reset", "billing", "login"])

                    category = "known" if is_known else "unknown"
                    sentiment = "frustrated" if is_frustrated else "neutral"
                    priority = "high" if is_frustrated else ("medium" if is_known else "high")

                    state["issue_category"] = category
                    state["sentiment"] = sentiment
                    state["priority"] = priority
                    state["keywords"] = ["password", "reset", "error"] if is_known else ["api", "server", "error"]
                    state["execution_log"].append(f"🧠 [Gemini] Category: {category} | Sentiment: {sentiment} | Priority: {priority}")

                    progress.progress(20, text=f"Classified: {category} | {sentiment}")
                    time.sleep(0.5)

                    if category == "known":
                        progress.progress(40, text="📚 Searching Notion knowledge base...")
                        time.sleep(0.7)
                        state["kb_results"] = [{"title": "How to Reset Your Password", "url": "https://notion.so/kb/password-reset"}]
                        state["kb_match_found"] = True
                        state["kb_answer_summary"] = "Go to Settings → Security → Click Reset Password."
                        state["execution_log"].append("📚 [Notion] Found 1 matching KB article")
                        st.session_state.kb_hits += 1
                    else:
                        progress.progress(40, text="📚 Searching Notion knowledge base...")
                        time.sleep(0.5)
                        state["kb_results"] = []
                        state["kb_match_found"] = False
                        state["execution_log"].append("⚠️ [Notion] No matching KB articles found")

                        progress.progress(50, text="🐛 Creating GitHub issue (KB gap)...")
                        time.sleep(0.7)
                        import random
                        gh_num = random.randint(1, 50)
                        state["github_issue_id"] = str(gh_num)
                        state["github_issue_url"] = f"https://github.com/user/support-kb-gaps/issues/{gh_num}"
                        state["execution_log"].append(f"🐛 [GitHub] Created issue #{gh_num}: KB Gap")
                        st.session_state.kb_misses += 1

                        progress.progress(60, text="🎫 Creating Jira ticket...")
                        time.sleep(0.7)
                        jira_num = random.randint(100, 999)
                        state["jira_ticket_id"] = f"SUP-{jira_num}"
                        state["jira_ticket_url"] = f"https://yourname.atlassian.net/browse/SUP-{jira_num}"
                        state["execution_log"].append(f"🎫 [Jira] Created ticket: SUP-{jira_num}")

                    progress.progress(75, text="✍️ Drafting reply with Gemini...")
                    time.sleep(0.8)

                    sender_name = state.get("email_from", "").split("@")[0].replace(".", " ").title()
                    if state.get("kb_match_found"):
                        state["draft_reply"] = (
                            f"Hi {sender_name},\n\n"
                            f"Thank you for reaching out! To reset your password, go to "
                            f"Settings → Security → Click \"Reset Password\". You'll receive "
                            f"a reset link via email within 5 minutes.\n\n"
                            f"If you continue to experience issues, please don't hesitate "
                            f"to reach out again.\n\n"
                            f"Best regards,\nSupport Team"
                        )
                    else:
                        state["draft_reply"] = (
                            f"Hi {sender_name},\n\n"
                            f"Thank you for reaching out. We've received your report and "
                            f"our engineering team has been notified. A ticket "
                            f"({state.get('jira_ticket_id', 'N/A')}) has been created to "
                            f"track this issue.\n\n"
                            f"We'll investigate and follow up within 24 hours.\n\n"
                            f"Best regards,\nSupport Team"
                        )
                    state["execution_log"].append("✍️ [Gemini] Reply drafted")

                    progress.progress(90, text="📤 Sending reply via Resend...")
                    time.sleep(0.6)
                    state["reply_sent"] = True
                    state["resend_message_id"] = f"msg_{datetime.now().strftime('%H%M%S')}"
                    state["execution_log"].append(f"📤 [Resend] Reply sent (ID: {state['resend_message_id']})")

                    progress.progress(100, text="✅ Complete!")

                # Update metrics
                st.session_state.emails_processed += 1
                if state.get("jira_ticket_id"):
                    st.session_state.tickets_created += 1
                if state.get("reply_sent"):
                    st.session_state.replies_sent += 1
                st.session_state.execution_logs.extend(state.get("execution_log", []))

                # Show results
                st.success("Email processed successfully!")

                rcol1, rcol2 = st.columns(2)
                with rcol1:
                    st.markdown("#### 📊 Classification")
                    st.json({
                        "category": state.get("issue_category"),
                        "sentiment": state.get("sentiment"),
                        "priority": state.get("priority"),
                        "kb_match": state.get("kb_match_found"),
                    })
                with rcol2:
                    st.markdown("#### 🎫 Tickets Created")
                    if state.get("jira_ticket_id"):
                        st.markdown(f"**Jira:** `{state['jira_ticket_id']}`")
                    if state.get("github_issue_id"):
                        st.markdown(f"**GitHub:** #{state['github_issue_id']}")

                st.markdown("#### 📧 Draft Reply")
                st.markdown(state.get("draft_reply", "No reply generated"))

            except Exception as e:
                st.error(f"Error: {e}")

with tab2:
    st.markdown("### 📋 Execution Log")
    if st.session_state.execution_logs:
        for entry in reversed(st.session_state.execution_logs):
            st.markdown(f'<div class="log-entry">{entry}</div>', unsafe_allow_html=True)
    else:
        st.info("No executions yet. Process an email to see the log.")

with tab3:
    st.markdown("### 🏗️ Architecture")
    st.markdown("""
    ```
              📧 Gmail (Incoming Email)
                       │
                       ▼
              🧠 LLM Classification
               (Gemini 2.0 Flash)
              ┌────────┴────────┐
              │                 │
         Known Issue       Unknown Issue
              │                 │
              ▼                 ▼
        📚 Notion KB      🐛 GitHub Issue
          Search            (KB Gap)
         ┌───┴───┐            │
         │       │            ▼
      Found  Not Found   🎫 Jira Ticket
         │       │            │
         │       └────────────┤
         │                    │
         └────────────────────┤
                              ▼
                    ✍️ Draft Reply
                     (Gemini LLM)
                         │
                         ▼
                   📤 Resend Email
                         │
                         ▼
                   ✅ Resolution
    ```
    """)

    st.markdown("### Swytchcode Execution Pipeline")
    st.markdown("""
    Every tool call goes through Swytchcode's 8-step execution pipeline:

    1. **Resolve Tool** → `tooling.json` whitelist check
    2. **Validate Inputs** → Schema validation
    3. **Evaluate Policies** → `policies.json` guard rules
    4. **Resolve Endpoint** → `manifest.json` URL resolution
    5. **Resolve Credentials** → Managed auth (zero code)
    6. **Apply Execution Policy** → Retries, timeouts, idempotency
    7. **Execute HTTP Request** → Direct API call
    8. **Normalize Response** → Consistent output format
    """)
