# 🤖 AI Customer Support Knowledge Agent

> **Hackathon:** Build with Swytchcode | **Track 1:** AI Customer Support Knowledge Agent
>
> An AI agent that automates the complete customer support lifecycle — from email ingestion to resolution — using **Swytchcode** for production-ready API execution across 5 integrations.

---

## 🎯 What It Does

This agent processes incoming support emails and **autonomously**:

1. 📧 **Reads support emails** from Gmail
2. 🧠 **Classifies issues** using Gemini LLM (category, sentiment, priority)
3. 📚 **Searches the knowledge base** in Notion for solutions
4. 🐛 **Detects KB gaps** and creates GitHub issues for the docs team
5. 🎫 **Creates Jira tickets** for engineering tracking
6. ✍️ **Drafts professional replies** tailored to KB results
7. 📤 **Sends replies** via Resend with tracking IDs

All API calls flow through **Swytchcode's execution pipeline** — with managed auth, policy enforcement, idempotency, retries, and audit logging.

---

## 🏗️ Architecture

```
        📧 Gmail (Incoming Email)
                 │
                 ▼
        🧠 Gemini Classification
         ┌───────┴────────┐
         │                │
    Known Issue      Unknown Issue
         │                │
         ▼                ▼
   📚 Notion KB     🐛 GitHub Issue
     Search           (KB Gap)
    ┌──┴──┐              │
    │     │              ▼
 Found  Not Found   🎫 Jira Ticket
    │     │              │
    │     └──────────────┤
    └────────────────────┤
                         ▼
               ✍️ Draft Reply (Gemini)
                         │
                         ▼
                  📤 Resend Email
                         │
                         ▼
                  ✅ Resolution
```

**Tech Stack:** LangGraph (Python) + Swytchcode Runtime SDK + Google Gemini + Streamlit

---

## ⚡ Swytchcode Integration (Deep)

| Feature | How We Use It |
|---------|--------------|
| **5 Integration Bundles** | Gmail, Notion, Jira, Resend, GitHub — all via `swy get` |
| **Python Runtime SDK** | `swytchcode_runtime.exec()` in all 5 integration nodes |
| **Policy Engine** | Rate-limiting (Jira: 10/hr, Resend: 20/hr), input validation (require body on GitHub issues) |
| **Idempotency** | Prevents duplicate Jira tickets and Resend emails on retries |
| **Automatic Retries** | Exponential backoff for transient API failures |
| **Managed Auth** | Zero credential code — `swy auth connect` handles OAuth & API keys |
| **Audit Logging** | Full execution trace via `swy audit` |
| **Execution Pipeline** | All 8 steps: resolve → validate → policy → credentials → execute → normalize |
| **tooling.json** | Explicit trust boundary — only whitelisted tools can execute |
| **CLI Workflow** | `swy init` → `swy get` → `swy add` → `swy auth connect` → `swy exec` |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (for Swytchcode CLI)
- Python 3.11+
- Free accounts: Gmail, Notion, Jira, Resend, GitHub

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/support-agent.git
cd support-agent
pip install -r requirements.txt
```

### 2. Setup Swytchcode

```bash
# Install CLI
npm install -g swytchcode

# Run the setup script (Windows)
setup_swytchcode.bat

# Or manually:
swy init
swy login
swy get gmail && swy get notion && swy get jira && swy get resend && swy get github
swy add gmail.messages.list && swy add gmail.messages.get
swy add notion.databases.query && swy add notion.pages.retrieve
swy add jira.issue.create && swy add resend.emails.send
swy add github.issue.create
swy auth connect gmail && swy auth connect notion
swy auth connect jira && swy auth connect resend && swy auth connect github
```

### 3. Configure Environment

```bash
cp .env.example .env
# Fill in your API keys in .env
```

### 4. Run

```bash
# Demo mode (simulated email)
python main.py --demo

# Live mode (real Gmail)
python main.py

# Dashboard
streamlit run dashboard/app.py

# Verify setup
python main.py --verify
```

---

## 📁 Project Structure

```
support-agent/
├── .swytchcode/              # Swytchcode project config
├── src/
│   ├── agent.py              # LangGraph workflow (7 nodes, 2 conditional branches)
│   ├── state.py              # TypedDict state definition
│   ├── tools.py              # Swytchcode tool loader
│   ├── config.py             # Environment configuration
│   └── nodes/
│       ├── email_ingestion.py      # 📧 Gmail — read support emails
│       ├── issue_classifier.py     # 🧠 Gemini — classify & analyze sentiment
│       ├── knowledge_search.py     # 📚 Notion — search KB articles
│       ├── ticket_creator.py       # 🎫 Jira — create support tickets
│       ├── github_escalation.py    # 🐛 GitHub — KB gap detection
│       ├── reply_drafter.py        # ✍️ Gemini — draft contextual replies
│       └── notification_sender.py  # 📤 Resend — send formatted emails
├── dashboard/
│   └── app.py                # Streamlit monitoring dashboard
├── policies.json             # Swytchcode policy rules (5 policies)
├── tooling.json              # Swytchcode trusted tools whitelist
├── main.py                   # CLI entry point
├── requirements.txt          # Python dependencies
└── setup_swytchcode.bat      # One-click Swytchcode setup
```

---

## 💡 Innovation Features

1. **Knowledge Gap Detection** — When the Notion KB doesn't have an answer, the agent auto-creates a GitHub issue titled "KB Gap: [topic]" for the docs team, creating a continuous improvement feedback loop.

2. **Sentiment-Aware Escalation** — Frustrated customers (detected by Gemini) are automatically bumped to higher priority in Jira, ensuring urgent issues get attention first.

3. **Policy-Driven Guardrails** — Swytchcode policies prevent runaway behavior: rate-limiting ticket creation, blocking auto-replies to VIP domains, and enforcing input validation.

4. **Idempotent Operations** — Duplicate Jira tickets and Resend emails are prevented by Swytchcode's idempotency engine, making the agent safe to retry.

---

## 📊 Judging Criteria Alignment

| Criteria (Weight) | How We Address It |
|---|---|
| **Swytchcode API Integration (30%)** | 5 integrations, policy engine, idempotency, retries, managed auth, audit logging, CLI workflow |
| **Technical Implementation (25%)** | LangGraph stateful graph, 7 nodes, conditional routing, Gemini LLM, Python SDK |
| **Innovation & Originality (20%)** | KB gap detection, sentiment-aware escalation, policy-driven guardrails |
| **Functionality (10%)** | End-to-end working prototype with demo mode |
| **Real-World Impact (10%)** | Automates 80%+ of repetitive support work |
| **UX & Presentation (5%)** | Streamlit dashboard, Rich CLI output, formatted HTML emails |

---

## 🧩 Chrome Extension (Innovation Bonus)

A **Chrome Extension** that brings the AI Support Agent directly into your browser:

- 🚀 Process support emails with one click from any browser tab
- 🧠 See real-time classification (category, sentiment, priority)
- 🎫 View created Jira tickets and GitHub issues
- 📧 Preview draft replies before sending
- 📊 Track processing metrics with persistent counters
- ⚡ Works in **demo mode** (offline) or **live mode** (connects to FastAPI backend)

### Install the Extension

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"** → select the `extension/` folder
4. The 🤖 icon appears in your toolbar!

### Run the Backend (for live mode)

```bash
python server.py
# → API at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### Project Structure (Extension)

```
extension/
├── manifest.json       # Manifest V3 config
├── service-worker.js   # Background badge updates
├── popup.html          # 3-tab popup UI
├── popup.css           # Dark theme + animations
└── popup.js            # Pipeline visualization + API calls
```

---

## 🏆 Built With

- [Swytchcode](https://swytchcode.com) — AI agent execution layer
- [LangGraph](https://github.com/langchain-ai/langgraph) — Stateful workflow orchestration
- [Google Gemini](https://ai.google.dev) — LLM for classification & reply drafting
- [Streamlit](https://streamlit.io) — Dashboard UI
- [FastAPI](https://fastapi.tiangolo.com) — Chrome Extension backend API

---

*Built for the [Build with Swytchcode Hackathon](https://www.commudle.com/builds/create?campaign=BuildWithSwytchcode)*
