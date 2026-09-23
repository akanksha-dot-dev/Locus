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
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ── Custom CSS — Light Professional Theme ──────────────────────
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* ── Global Overrides ─────────────────────────── */
    html, body, [data-testid="stAppViewContainer"] {
        font-family: 'Inter', -apple-system, 'Segoe UI', system-ui, sans-serif !important;
        -webkit-font-smoothing: antialiased;
    }

    [data-testid="stAppViewContainer"] {
        background: #f8f9fc;
    }

    [data-testid="stSidebar"] {
        background: #ffffff;
        border-right: 1px solid #e2e6ef;
    }

    [data-testid="stHeader"] {
        background: transparent;
    }

    /* Remove Streamlit branding padding */
    .block-container {
        padding-top: 2rem;
    }

    /* ── Hero Header ──────────────────────────────── */
    .hero-header {
        background: linear-gradient(135deg, #4f46e5 0%, #6366f1 40%, #7c3aed 100%);
        padding: 2rem 2.5rem;
        border-radius: 16px;
        color: white;
        margin-bottom: 2rem;
        position: relative;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(79, 70, 229, 0.2);
    }

    .hero-header::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.06) 50%, transparent 70%);
        pointer-events: none;
    }

    .hero-header h1 {
        margin: 0;
        font-size: 1.65rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        position: relative;
        z-index: 1;
    }

    .hero-header p {
        margin: 0.5rem 0 0;
        opacity: 0.8;
        font-size: 0.95rem;
        font-weight: 500;
        position: relative;
        z-index: 1;
    }

    .hero-header .hero-version {
        position: absolute;
        right: 2.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255,255,255,0.15);
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255,255,255,0.1);
    }

    /* ── Metric Cards ─────────────────────────────── */
    [data-testid="stMetric"] {
        background: #ffffff;
        border: 1px solid #e2e6ef;
        border-radius: 12px;
        padding: 1rem 1.2rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }

    [data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    [data-testid="stMetricLabel"] p {
        font-size: 0.78rem !important;
        font-weight: 600;
        color: #9ca3af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    [data-testid="stMetricValue"] {
        font-size: 2rem !important;
        font-weight: 800 !important;
        color: #4f46e5 !important;
    }

    /* ── Sidebar Styles ───────────────────────────── */
    [data-testid="stSidebar"] h3 {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #9ca3af;
        margin-bottom: 0.5rem;
    }

    /* ── Integration Badges ───────────────────────── */
    .int-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 0.82rem;
        font-weight: 600;
        margin: 3px 2px;
        transition: transform 0.1s ease;
    }
    .int-badge:hover { transform: translateY(-1px); }

    .badge-gmail   { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .badge-notion  { background: #f1f3f8; color: #111827; border: 1px solid #e2e6ef; }
    .badge-jira    { background: #eef2ff; color: #4f46e5; border: 1px solid rgba(79,70,229,0.2); }
    .badge-resend  { background: #f5f3ff; color: #7c3aed; border: 1px solid rgba(124,58,237,0.2); }
    .badge-github  { background: #f1f3f8; color: #111827; border: 1px solid #e2e6ef; }

    /* ── Feature Checklist ────────────────────────── */
    .feature-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 0;
        font-size: 0.85rem;
        color: #4b5563;
    }

    .feature-check {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        flex-shrink: 0;
    }

    /* ── Config Items ─────────────────────────────── */
    .config-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #f1f3f8;
        font-size: 0.85rem;
    }
    .config-item:last-child { border-bottom: none; }

    .config-key { color: #9ca3af; font-weight: 500; }

    .config-val {
        font-weight: 600;
        color: #111827;
        background: #f1f3f8;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.82rem;
    }

    /* ── Log Entries ──────────────────────────────── */
    .log-entry {
        padding: 8px 12px;
        border-left: 3px solid #e2e6ef;
        background: #ffffff;
        margin-bottom: 6px;
        border-radius: 0 8px 8px 0;
        font-family: 'SF Mono', 'Courier New', monospace;
        font-size: 0.83rem;
        color: #4b5563;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        transition: border-color 0.15s;
    }

    .log-entry:hover { border-left-color: #4f46e5; }

    /* ── Tabs ─────────────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px;
        background: #ffffff;
        border-radius: 12px;
        padding: 4px;
        border: 1px solid #e2e6ef;
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.85rem;
        color: #9ca3af;
        padding: 8px 16px;
    }

    .stTabs [aria-selected="true"] {
        background: #eef2ff !important;
        color: #4f46e5 !important;
    }

    .stTabs [data-baseweb="tab-border"] { display: none; }
    .stTabs [data-baseweb="tab-highlight"] { display: none; }

    /* ── Buttons ──────────────────────────────────── */
    .stButton > button[kind="primary"],
    .stButton > button[data-testid="stBaseButton-primary"] {
        background: #4f46e5 !important;
        color: white !important;
        border: none !important;
        border-radius: 10px !important;
        font-weight: 700 !important;
        font-size: 0.95rem !important;
        padding: 0.6rem 1.5rem !important;
        box-shadow: 0 4px 14px rgba(79,70,229,0.2) !important;
        transition: all 0.15s ease !important;
    }

    .stButton > button[kind="primary"]:hover,
    .stButton > button[data-testid="stBaseButton-primary"]:hover {
        background: #4338ca !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 20px rgba(79,70,229,0.28) !important;
    }

    /* ── Progress Bar ─────────────────────────────── */
    .stProgress > div > div > div {
        background: linear-gradient(90deg, #4f46e5, #7c3aed) !important;
    }

    /* ── Text Input / Text Area ───────────────────── */
    .stTextInput input,
    .stTextArea textarea {
        border: 1px solid #e2e6ef !important;
        border-radius: 8px !important;
        font-family: 'Inter', sans-serif !important;
        transition: border-color 0.15s, box-shadow 0.15s !important;
    }

    .stTextInput input:focus,
    .stTextArea textarea:focus {
        border-color: #4f46e5 !important;
        box-shadow: 0 0 0 3px rgba(79,70,229,0.08) !important;
    }

    /* ── Result JSON ──────────────────────────────── */
    [data-testid="stJson"] {
        background: #f8f9fc !important;
        border: 1px solid #e2e6ef !important;
        border-radius: 10px !important;
    }

    /* ── Architecture Diagram ─────────────────────── */
    .arch-card {
        background: white;
        border: 1px solid #e2e6ef;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }

    .arch-card pre {
        color: #4b5563 !important;
        font-size: 0.9rem;
        line-height: 1.7;
    }

    /* ── Pipeline Steps ───────────────────────────── */
    .pipeline-step {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 16px;
        background: white;
        border: 1px solid #e2e6ef;
        border-radius: 10px;
        margin-bottom: 8px;
        transition: border-color 0.15s;
    }

    .pipeline-step:hover { border-color: #4f46e5; }

    .step-num {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        background: #eef2ff;
        color: #4f46e5;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.8rem;
        flex-shrink: 0;
    }

    .step-info h4 {
        margin: 0;
        font-size: 0.9rem;
        font-weight: 600;
        color: #111827;
    }

    .step-info p {
        margin: 2px 0 0;
        font-size: 0.82rem;
        color: #9ca3af;
    }

    /* ── Responsive ────────────────────────────────── */
    @media (max-width: 768px) {
        .hero-header { padding: 1.5rem; }
        .hero-header h1 { font-size: 1.3rem; }
        .hero-header .hero-version { display: none; }
    }
</style>
""", unsafe_allow_html=True)

# ── Header ─────────────────────────────────────────────────────
st.markdown("""
<div class="hero-header">
    <h1>⚡ AI Customer Support Agent</h1>
    <p>
        Powered by <strong>Swytchcode</strong> × LangGraph × Gemini
    </p>
    <span class="hero-version">v2.0</span>
</div>
""", unsafe_allow_html=True)

# ── Sidebar ────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### 🔌 Integrations")
    st.markdown("""
    <span class="int-badge badge-gmail">📧 Gmail</span>
    <span class="int-badge badge-notion">📚 Notion</span>
    <span class="int-badge badge-jira">🎫 Jira</span>
    <span class="int-badge badge-resend">📤 Resend</span>
    <span class="int-badge badge-github">🐛 GitHub</span>
    """, unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### ⚡ Swytchcode Features")
    features = [
        "Managed Authentication",
        "Policy Engine (5 rules)",
        "Idempotency",
        "Automatic Retries",
        "Audit Logging",
        "Execution Pipeline",
    ]
    for f in features:
        st.markdown(f"""
        <div class="feature-item">
            <div class="feature-check">✓</div>
            <span>{f}</span>
        </div>""", unsafe_allow_html=True)

    st.markdown("---")
    st.markdown("### 🧠 Agent Config")
    configs = [
        ("LLM", "Gemini Flash"),
        ("Framework", "LangGraph"),
        ("Nodes", "7"),
        ("Integrations", "5"),
    ]
    for key, val in configs:
        st.markdown(f"""
        <div class="config-item">
            <span class="config-key">{key}</span>
            <span class="config-val">{val}</span>
        </div>""", unsafe_allow_html=True)

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
    st.metric("Emails Processed", st.session_state.emails_processed)
with col2:
    st.metric("Jira Tickets", st.session_state.tickets_created)
with col3:
    st.metric("KB Resolved", st.session_state.kb_hits)
with col4:
    st.metric("KB Gaps", st.session_state.kb_misses)
with col5:
    st.metric("Replies Sent", st.session_state.replies_sent)

# ── Main Content ───────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🚀 Process Email", "📋 Execution Log", "📊 Architecture"])

with tab1:
    mode = st.radio(
        "Processing Mode",
        ["🔴 Live (real APIs — Jira, Resend, Gemini)", "🧪 Demo (simulated, no API calls)"],
        index=0,
        horizontal=True,
    )
    use_live = mode.startswith("🔴")

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
                import time, requests as req

                state = {
                    "email_id": f"run-{datetime.now().strftime('%H%M%S')}",
                    "email_from": demo_from,
                    "email_subject": demo_subject,
                    "email_body": demo_body,
                    "execution_log": [],
                }

                if use_live:
                    # ── LIVE MODE: Call the FastAPI backend ──
                    progress = st.progress(0, text="🧠 Sending to AI pipeline...")
                    progress.progress(10, text="🧠 Classifying with Gemini...")

                    try:
                        resp = req.post(
                            "http://localhost:8000/process",
                            json={
                                "email_from": demo_from,
                                "email_subject": demo_subject,
                                "email_body": demo_body,
                            },
                            timeout=90,
                        )

                        progress.progress(80, text="📡 Receiving results...")

                        if resp.status_code == 200:
                            result = resp.json()
                            state.update(result)
                            state["execution_log"] = result.get("execution_log", [])
                            progress.progress(100, text="✅ Complete!")
                        else:
                            st.warning(f"Backend returned {resp.status_code}. Falling back to demo mode.")
                            raise Exception(f"HTTP {resp.status_code}")

                    except req.exceptions.ConnectionError:
                        st.warning("⚠️ Backend not reachable at localhost:8000. Start with: `python server.py`. Falling back to demo.")
                        raise Exception("Backend offline")

                else:
                    raise Exception("Demo mode selected")

            except Exception as fallback_err:
                # ── DEMO SIMULATION ──
                import time, random

                progress = st.progress(0, text="🧪 Demo: Classifying issue...")
                time.sleep(0.8)

                email_body_lower = demo_body.lower()
                email_subject_lower = demo_subject.lower()

                is_frustrated = any(w in email_body_lower for w in ["frustrat", "ridiculous", "asap", "fix this"])
                is_known = any(w in email_subject_lower for w in ["password", "reset", "billing", "login"])

                category = "known" if is_known else "unknown"
                sentiment = "frustrated" if is_frustrated else "neutral"
                priority = "high" if is_frustrated else ("medium" if is_known else "high")

                state["issue_category"] = category
                state["sentiment"] = sentiment
                state["priority"] = priority
                state["keywords"] = ["password", "reset", "error"] if is_known else ["api", "server", "error"]
                state["execution_log"].append(f"🧪 Demo mode — {datetime.now().isoformat()}")
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

                sender_name = demo_from.split("@")[0].replace(".", " ").title()
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
                state["resend_message_id"] = f"demo_{datetime.now().strftime('%H%M%S')}"
                state["execution_log"].append(f"📤 [Resend] Reply sent (ID: {state['resend_message_id']})")

                progress.progress(100, text="✅ Demo complete!")

                # Update metrics
                st.session_state.emails_processed += 1
                if state.get("jira_ticket_id"):
                    st.session_state.tickets_created += 1
                if state.get("reply_sent"):
                    st.session_state.replies_sent += 1
                st.session_state.execution_logs.extend(state.get("execution_log", []))

                # Show results
                st.success("Email processed successfully!")

                # ── Store results in session state so they persist ──
                st.session_state.last_result = {
                    "issue_category": state.get("issue_category"),
                    "sentiment": state.get("sentiment"),
                    "priority": state.get("priority"),
                    "kb_match_found": state.get("kb_match_found"),
                    "jira_ticket_id": state.get("jira_ticket_id"),
                    "jira_ticket_url": state.get("jira_ticket_url"),
                    "github_issue_id": state.get("github_issue_id"),
                    "github_issue_url": state.get("github_issue_url"),
                    "draft_reply": state.get("draft_reply", ""),
                    "reply_sent": state.get("reply_sent"),
                    "resend_message_id": state.get("resend_message_id"),
                    "email_from": state.get("email_from"),
                    "email_subject": state.get("email_subject"),
                }

            except Exception as e:
                st.error(f"Error: {e}")

    # ── Persistent Results Display (survives Streamlit reruns) ──
    if "last_result" in st.session_state and st.session_state.last_result:
        result = st.session_state.last_result

        st.markdown("---")

        # Classification + Tickets row
        rcol1, rcol2 = st.columns(2)
        with rcol1:
            st.markdown("#### 📊 Classification")
            st.json({
                "category": result.get("issue_category"),
                "sentiment": result.get("sentiment"),
                "priority": result.get("priority"),
                "kb_match": result.get("kb_match_found"),
            })
        with rcol2:
            st.markdown("#### 🎫 Tickets Created")
            if result.get("jira_ticket_id"):
                st.markdown(f"**Jira:** [`{result['jira_ticket_id']}`]({result.get('jira_ticket_url', '#')})")
            if result.get("github_issue_id"):
                st.markdown(f"**GitHub:** [#{result['github_issue_id']}]({result.get('github_issue_url', '#')})")
            if not result.get("jira_ticket_id") and not result.get("github_issue_id"):
                st.markdown("_No tickets needed — resolved from KB_ ✅")

        # ── Draft Reply — prominent styled card ──
        st.markdown("#### 📧 Draft Reply")

        reply_text = result.get("draft_reply", "No reply generated")
        sent_badge = ""
        if result.get("reply_sent"):
            msg_id = result.get("resend_message_id", "")
            sent_badge = f"""
            <div style="
                display: inline-flex; align-items: center; gap: 6px;
                background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;
                padding: 4px 12px; border-radius: 20px; font-size: 0.82rem;
                font-weight: 600; margin-bottom: 10px;
            ">
                ✅ Reply sent via Resend{f' (ID: {msg_id})' if msg_id else ''}
            </div>
            """

        # Escape HTML in reply text for safe rendering
        import html as html_mod
        safe_reply = html_mod.escape(reply_text).replace("\\n", "<br>").replace("\n", "<br>")

        st.markdown(f"""
        {sent_badge}
        <div style="
            background: #ffffff;
            border: 1px solid #e2e6ef;
            border-left: 4px solid #4f46e5;
            border-radius: 0 12px 12px 0;
            padding: 20px 24px;
            font-size: 0.95rem;
            line-height: 1.75;
            color: #111827;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            margin-bottom: 1rem;
            white-space: pre-wrap;
            font-family: 'Inter', -apple-system, sans-serif;
        ">
            <div style="
                display: flex; align-items: center; gap: 8px;
                margin-bottom: 12px; padding-bottom: 10px;
                border-bottom: 1px solid #f1f3f8;
                font-size: 0.82rem; color: #9ca3af;
            ">
                <span>To: <strong style="color: #4b5563;">{html_mod.escape(str(result.get('email_from', '')))}</strong></span>
                <span style="margin-left: auto;">Re: {html_mod.escape(str(result.get('email_subject', '')))}</span>
            </div>
            {safe_reply}
        </div>
        """, unsafe_allow_html=True)

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
    <div class="arch-card">
    <pre>
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
    </pre>
    </div>
    """, unsafe_allow_html=True)

    st.markdown("### Swytchcode Execution Pipeline")

    pipeline_steps = [
        ("Resolve Tool", "tooling.json whitelist check"),
        ("Validate Inputs", "Schema validation"),
        ("Evaluate Policies", "policies.json guard rules"),
        ("Resolve Endpoint", "manifest.json URL resolution"),
        ("Resolve Credentials", "Managed auth (zero code)"),
        ("Apply Execution Policy", "Retries, timeouts, idempotency"),
        ("Execute HTTP Request", "Direct API call"),
        ("Normalize Response", "Consistent output format"),
    ]

    for i, (title, desc) in enumerate(pipeline_steps, 1):
        st.markdown(f"""
        <div class="pipeline-step">
            <div class="step-num">{i}</div>
            <div class="step-info">
                <h4>{title}</h4>
                <p>{desc}</p>
            </div>
        </div>""", unsafe_allow_html=True)
