# 🚀 Complete Beginner's Guide — From Zero to Working Agent

> **Audience:** Total beginners. Every click, every URL, every command is explained.
> **Time needed:** ~90 minutes for full setup.

---

## 📋 Big Picture — What You're Building

```
YOU (beginner) will set up:

  ┌────────────────────────────────────────────────────────────────────────┐
  │                              YOUR WORKSTATION                          │
  │                                                                        │
  │  ┌────────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
  │  │ Python 3.11+   │     │ Node.js 18+  │     │ Swytchcode CLI (swy) │  │
  │  │ (FastAPI &     │     │ (React 19    │     │ (Connects to all 7   │  │
  │  │  LangGraph)    │     │  Vite UI)    │     │  external tools)     │  │
  │  └───────┬────────┘     └──────┬───────┘     └──────────┬───────────┘  │
  │          │                     │                        │              │
  │          └─────────────────────┴────────────────────────┘              │
  │                                │                                       │
  │                     ┌──────────▼──────────┐                            │
  │                     │   LOCUS ECOSYSTEM   │                            │
  │                     │  • FastAPI Backend  │                            │
  │                     │  • React 19 UI (5173│                            │
  │                     │  • Chrome Extension │                            │
  │                     └──────────┬──────────┘                            │
  └────────────────────────────────┼───────────────────────────────────────┘
                                   │
                      ┌────────────▼────────────────┐
                      │      SWYTCHCODE LAYER       │
                      │  (Managed Auth, Guardrails, │
                      │   Policies, Audit Ledger)   │
                      └────────────┬────────────────┘
                                   │
      ┌───────────┬────────────┬───┴────────┬────────────┬───────────┐
      ▼           ▼            ▼            ▼            ▼           ▼
  🌦️ Weather   📧 Gmail    🎫 Jira     🐛 GitHub    📚 Notion   💬 Slack / Resend
```

---

## PHASE 1: Install Prerequisites (15 min)

### Step 1.1 — Install Python

1. Open your browser → go to **https://www.python.org/downloads/**
2. Click the big yellow button **"Download Python 3.x.x"**
3. Run the installer
4. ⚠️ **CRITICAL:** Check the box **"Add Python to PATH"** at the bottom of the installer
5. Click **Install Now**
6. **Verify it worked:**
   ```powershell
   python --version
   ```
   You should see: `Python 3.11.x` or higher

### Step 1.2 — Install Node.js

1. Go to **https://nodejs.org/**
2. Click the **LTS** (Long Term Support) button — don't use "Current"
3. Run the installer → click Next through everything (keep all defaults)
4. **Verify:**
   ```powershell
   node --version
   npm --version
   ```
   You should see version numbers (e.g., `v20.x.x` and `10.x.x`)

### Step 1.3 — Install Git

1. Go to **https://git-scm.com/download/win**
2. Download and run the installer
3. Keep all default settings → click Next through everything
4. **Verify:**
   ```powershell
   git --version
   ```

### Step 1.4 — Install Swytchcode CLI

Open PowerShell (search "PowerShell" in Start menu) and run:

```powershell
npm install -g swytchcode
```

**Verify:**
```powershell
swy --version
```

If you see a version number, you're good! If you see an error, try:
```powershell
# Alternative install method for Windows
irm https://cli.swytchcode.com/install.ps1 | iex
```

### Step 1.5 — Install Python Dependencies for Your Project

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> [!NOTE]
> **What is `venv`?** It creates an isolated Python environment so your project's packages don't conflict with other Python projects. You'll see `(venv)` at the start of your terminal prompt when it's active.
>
> ⚠️ Every time you open a new terminal, you need to activate it again:
> ```powershell
> cd backend
> .\venv\Scripts\Activate.ps1
> ```

---

## PHASE 2: Create All Platform Accounts (20 min)

You need **6 free accounts**. Open each link in a new tab and sign up.

### 2.1 — Google Gemini API Key (Your AI Brain)

**What is this?** Gemini is Google's AI model. Your agent uses it to understand emails and write replies.

1. Go to **https://aistudio.google.com/apikey**
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select **"Create API key in new project"** (or any existing project)
5. A key appears like: `AIzaSyB...long-string...`
6. **COPY THIS KEY** → save it in a Notepad file temporarily

```
📝 Save this:
GOOGLE_API_KEY = AIzaSy.....your-key-here.....
```

---

### 2.2 — Gmail (Reads Support Emails)

**What is this?** Your agent reads incoming customer emails from a Gmail inbox.

#### Create a test Gmail (recommended — don't use your personal one):
1. Go to **https://accounts.google.com/signup**
2. Create a new account like: `myproject.support.test@gmail.com`
3. Complete the signup process

#### Create the "support" label:
1. Open Gmail at **https://mail.google.com**
2. On the left sidebar, scroll down and click **"+ Create new label"**
3. Type: **support** → click **Create**

#### Send test emails to yourself:
You need some emails in your inbox for the agent to process. Send these from any email (or from the same Gmail to itself):

**Email 1 — send this:**
```
To: myproject.support.test@gmail.com
Subject: How do I reset my password?
Body: Hi, I forgot my password and can't log in. Can you help me reset it? Thanks!
```

**Email 2 — send this:**
```
To: myproject.support.test@gmail.com
Subject: API returning 500 error on webhook endpoint  
Body: We're getting intermittent 500 errors on the /api/webhooks endpoint. Started 2 hours ago. Urgent!
```

**Email 3 — send this:**
```
To: myproject.support.test@gmail.com
Subject: STILL can't access my account after 3 days!!
Body: This is absolutely ridiculous. I've contacted support THREE times and nobody has helped. FIX THIS NOW.
```

#### Apply the "support" label to each email:
1. Open each email
2. Click the **label icon** (🏷️) at the top toolbar
3. Check **support** → click **Apply**
4. Make sure all 3 emails are **UNREAD** (if you opened them, right-click → Mark as unread)

```
📝 Save this:
GMAIL = myproject.support.test@gmail.com
```

---

### 2.3 — Notion (Your Knowledge Base)

**What is this?** Notion stores your company's FAQ/documentation. The agent searches it for answers.

#### Create account:
1. Go to **https://www.notion.so/signup**
2. Sign up with email
3. Choose "For personal use" (free plan)

#### Create the Knowledge Base database:

1. Click **"+ New page"** in the left sidebar
2. Title it: **Support Knowledge Base**
3. Type `/database` and select **"Database - Full page"**
4. You'll see a table. Now set up the columns:

**Column setup:**
- **Name** → already exists (this is the article title)
- Click **"+"** to add a new column → choose **"Multi-select"** → name it **Tags**
- Click **"+"** again → choose **"Text"** → name it **Content**

**Add these 4 rows (click "+ New" at the bottom of the table):**

| Name | Tags | Content |
|------|------|---------|
| How to Reset Your Password | `password`, `account` | Go to Settings → Security → Click "Reset Password". You'll receive a reset link via email within 5 minutes. |
| Billing FAQ | `billing` | We accept Visa, Mastercard, and PayPal. To update billing, go to Settings → Billing → Update Payment Method. |
| Getting Started Guide | `setup` | 1. Create an account  2. Verify email  3. Complete onboarding  4. Invite team members |
| API Rate Limits | `api` | Free tier: 100 req/min. Pro: 1000 req/min. Enterprise: unlimited. |

#### Get the Database ID:

1. Open your "Support Knowledge Base" page in Notion
2. Look at the **URL** in your browser address bar. It looks like:
   ```
   https://www.notion.so/myworkspace/Support-Knowledge-Base-a1b2c3d4e5f67890abcdef1234567890?v=...
   ```
3. The Database ID is the **long string of letters and numbers** after the page title and before `?v=`
4. In the example above: `a1b2c3d4e5f67890abcdef1234567890`
5. **COPY THIS ID**

#### Create a Notion Integration (API access):

1. Go to **https://www.notion.so/profile/integrations**
2. Click **"+ New integration"**
3. Name: **Support Agent**
4. Select your workspace
5. Click **Submit**
6. You'll see a **"Internal Integration Secret"** — it starts with `ntn_`
7. **COPY THIS SECRET**

#### ⚠️ MOST IMPORTANT STEP — Share the database:

1. Go back to your **Support Knowledge Base** page in Notion
2. Click **"Share"** button (top-right corner)
3. In the **"Invite"** field, search for **Support Agent** (your integration)
4. Click to add it
5. Make sure it shows "Can view" access

> [!CAUTION]
> **If you skip this step, the agent CANNOT access your database and will error.** This is the #1 mistake beginners make.

```
📝 Save this:
NOTION_KB_DATABASE_ID = a1b2c3d4...your-id-here...
NOTION_API_KEY = ntn_...your-secret-here...
```

---

### 2.4 — Jira (Creates Support Tickets)

**What is this?** Jira is a project management tool. The agent creates tickets for your engineering team to track.

#### Create account:
1. Go to **https://www.atlassian.com/software/jira/free**
2. Click **"Get it free"**
3. Sign up with email
4. You'll get a site like: `yourname.atlassian.net`

#### Create a project:
1. After signup, click **"Projects"** → **"Create project"**
2. Choose **"Scrum"** (or Kanban — either works)
3. Name: **Support**
4. Key: **SUP** ← this is important, the agent uses this code
5. Click **Create**

#### Get a Jira API token:
1. Go to **https://id.atlassian.com/manage-profile/security/api-tokens**
2. Click **"Create API token"**
3. Label: **Support Agent**
4. Click **Create**
5. **COPY THE TOKEN** (you can only see it once!)

```
📝 Save this:
JIRA_DOMAIN = yourname.atlassian.net
JIRA_PROJECT_KEY = SUP
JIRA_EMAIL = your-email@example.com
JIRA_API_TOKEN = ...your-token-here...
```

---

### 2.5 — Resend (Sends Reply Emails)

**What is this?** Resend is an email-sending service. The agent uses it to send replies to customers.

#### Create account:
1. Go to **https://resend.com/signup**
2. Sign up with email or GitHub
3. Free tier: 100 emails/day — plenty for a hackathon

#### Get API key:
1. In the Resend dashboard, click **"API Keys"** in the left sidebar
2. Click **"Create API Key"**
3. Name: **Support Agent**
4. Permission: **Full access**
5. Click **Add** → **COPY THE KEY** (starts with `re_`)

#### About the sender email:
- For testing, use Resend's built-in test address: `onboarding@resend.dev`
- This can only send to **your own verified email** (good enough for hackathon demo)

```
📝 Save this:
RESEND_API_KEY = re_...your-key-here...
RESEND_FROM_EMAIL = onboarding@resend.dev
```

---

### 2.6 — GitHub (Tracks Knowledge Base Gaps)

**What is this?** When the agent can't find an answer in Notion, it creates a GitHub issue saying "We need a KB article about this topic."

#### Create a repository:
1. Go to **https://github.com/new**
2. Repository name: **support-kb-gaps**
3. Description: *Knowledge base gap tracking for AI Support Agent*
4. Select **Public** (so hackathon judges can see it)
5. ✅ Check **"Add a README file"**
6. Click **"Create repository"**

#### Get a Personal Access Token:
1. Go to **https://github.com/settings/tokens?type=beta**
2. Click **"Generate new token"**
3. Token name: **Support Agent**
4. Expiration: **30 days**
5. Under **Repository access** → choose **"Only select repositories"** → pick **support-kb-gaps**
6. Under **Permissions** → expand **"Repository permissions"**:
   - **Issues**: select **"Read and write"**
   - **Metadata**: **"Read-only"** (auto-selected)
7. Click **"Generate token"**
8. **COPY THE TOKEN** (starts with `github_pat_`)

```
📝 Save this:
GITHUB_OWNER = your-github-username
GITHUB_REPO = support-kb-gaps
GITHUB_TOKEN = github_pat_...your-token-here...
```

---

## PHASE 3: Set Up Swytchcode (10 min)

Swytchcode is the **middleware layer** that connects your Python agent code to all 5 platforms. It handles authentication, retries, security policies, and prevents duplicate operations.

Open PowerShell and run each command **one at a time**:

```powershell
cd backend
```

### Step 3.1 — Initialize Swytchcode

```powershell
swy init
```

**What this does:** Creates a `.swytchcode/` folder and `tooling.json` file in your project.

### Step 3.2 — Log in to Swytchcode

```powershell
swy login
```

**What this does:** Opens your browser to log in / create a Swytchcode account. This is **free**.

### Step 3.3 — Download integration bundles

These commands download the API schemas (tool definitions) for each platform:

```powershell
swy get gmail
swy get notion
swy get jira
swy get resend
swy get github
```

**What this does:** Each command downloads a "bundle" that tells Swytchcode how to talk to that API. Think of it like installing a driver for each platform.

### Step 3.4 — Enable specific tools

By default, all tools are disabled for safety. You must explicitly enable each one:

```powershell
swy add gmail.user.messages.get
swy add gmail.user.messages.get1
swy add notion.query.create
swy add notion.page.get
swy add jira.api.issue.create
swy add jira.api.search.create1
swy add resend.email.create
swy add github.issue.create
swy add github.issue.list
```

**What this does:** Adds each tool to `tooling.json` — this is the "trust boundary." Your agent can ONLY use tools listed here. Judges love this security feature.

### Step 3.5 — Connect authentication for each platform

```powershell
swy auth connect gmail
```
↑ Opens browser → sign in with your test Gmail → grant permissions → done

```powershell
swy auth connect notion
```
↑ Prompts for your Notion integration secret (`ntn_...`) → paste it → done

```powershell
swy auth connect jira
```
↑ Prompts for your Jira email + API token → paste them → done

```powershell
swy auth connect resend
```
↑ Prompts for your Resend API key (`re_...`) → paste it → done

```powershell
swy auth connect github
```
↑ Prompts for your GitHub PAT (`github_pat_...`) → paste it → done

**What this does:** Swytchcode stores all credentials securely in `.swytchcode/credentials.db`. Your Python code **never touches API keys directly** — Swytchcode injects them automatically at execution time.

---

## PHASE 4: Test Each Integration (10 min)

Before running the full agent, test each platform **individually** to make sure auth works:

### Test Gmail:
```powershell
swy exec gmail.messages.list --params "{\"q\": \"is:unread\", \"maxResults\": 1}"
```
**Expected:** JSON with a list of your unread emails. If you see `"messages": [...]`, it works!

### Test Notion:
```powershell
swy exec notion.databases.query --params "{\"database_id\": \"YOUR_DATABASE_ID_HERE\"}" --body "{\"page_size\": 1}"
```
Replace `YOUR_DATABASE_ID_HERE` with your actual Notion database ID.

**Expected:** JSON with one of your KB articles.

### Test Jira:
```powershell
swy exec jira.issue.search --body "{\"jql\": \"project = SUP\", \"maxResults\": 1}"
```
**Expected:** JSON response (might be empty if you have no issues yet, that's fine).

### Test Resend:
```powershell
swy exec resend.emails.send --body "{\"from\": \"onboarding@resend.dev\", \"to\": [\"YOUR_EMAIL@gmail.com\"], \"subject\": \"Test from Agent\", \"html\": \"<p>Hello! This is a test.</p>\"}"
```
Replace `YOUR_EMAIL@gmail.com` with your actual email.

**Expected:** JSON with an `"id"` field. Check your inbox — you should receive the test email!

### Test GitHub:
```powershell
swy exec github.issue.list --params "{\"owner\": \"YOUR_GITHUB_USERNAME\", \"repo\": \"support-kb-gaps\"}"
```
**Expected:** JSON (empty array `[]` is fine if you have no issues yet).

> [!IMPORTANT]
> **If ANY test fails:**
> - Error says "tool not found" → run `swy add <tool.name>` for that tool
> - Error says "auth failed" → run `swy auth connect <provider>` again
> - Error says "policy blocked" → check your `policies.json` file

---

## PHASE 5: Configure Your .env File (5 min)

```powershell
cd backend
copy .env.example .env
```

Now open `backend/.env` in your editor and fill in the values:

```ini
# ── 1. LLM & Autonomous Reasoning Engine (Google Gemini) ─────────────────────
GOOGLE_API_KEY=AIzaSy...your-gemini-key...
LLM_MODEL=gemini-2.0-flash

# ── 2. Weather & Atmospheric Conditions (OpenWeather API) ────────────────────
OPENWEATHER_API_KEY=your_openweather_key
DEFAULT_CITY=Mumbai

# ── 3. Engineering Workload & Sprint Tracking (Jira Cloud) ───────────────────
JIRA_DOMAIN=yourcompany.atlassian.net
JIRA_EMAIL=dev@example.com
JIRA_API_TOKEN=your_jira_token
JIRA_PROJECT_KEY=CCS

# ── 4. Code Review & Pull Request Backlog (GitHub REST API) ──────────────────
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name
GITHUB_TOKEN=ghp_your_token

# ── 5. Executive Knowledge Base & Page Logging (Notion API) ──────────────────
NOTION_API_KEY=ntn_your_notion_key
NOTION_KB_DATABASE_ID=your_database_id

# ── 6. Team Alerts & Incident Notifications (Slack) ──────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# ── 7. Email Dispatch (Resend API) ───────────────────────────────────────────
RESEND_API_KEY=re_your_resend_key
RESEND_TO_EMAIL=your_email@example.com
```

---

## PHASE 6: Run the Agent CLI! (5 min)

### Run 1: Verify Swytchcode Tool Bindings

```powershell
cd backend
.\venv\Scripts\Activate.ps1
python main.py --verify
```

**Expected Output:** `✅ Loaded Swytchcode tools from 7 integrations`

### Run 2: Benchmark Scenario Demo Mode

Run simulated benchmark scenarios without needing live API tokens:

```powershell
# Default scenario (Mumbai)
python main.py --demo

# Adverse Weather Scenario (London Storm)
python main.py --demo --city London
```

**What happens:**
1. The 8-node LangGraph state machine initializes.
2. Ingests atmospheric data, calendar events, Jira sprint tickets, and GitHub pull requests.
3. Gemini synthesizes multi-factor constraints to formulate an **Office vs. WFH verdict**.
4. Builds an hour-by-hour conflict-free schedule.
5. Emits executive payloads for Notion, Slack, and Resend.

---

## PHASE 7: Launch the Full Incident Command Center (1-Click)

Launch both the **FastAPI Backend (`http://localhost:8000`)** and **React 19 Frontend (`http://localhost:5173`)** with one click:

```cmd
START_APP.bat
```

**What this automated launcher does:**
1. Automatically terminates any zombie processes occupying ports `8000` or `5173`.
2. Validates backend Python dependencies and virtual environment.
3. Validates frontend Node.js dependencies.
4. Starts the FastAPI server with WebSocket live streaming at `http://localhost:8000`.
5. Launches Vite frontend dev server at `http://localhost:5173`.
6. Launches your default web browser directly into the Incident Command Center.

### Loading the Chrome Extension Companion (`extension/`)
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the upper-right corner.
3. Click **Load unpacked** and select the `extension/` folder in your cloned repository.
4. The Locus icon appears in your toolbar with live badge verdicts (`OFF`, `WFH`, `HYB`)!
5. Use keyboard shortcut `Alt+L` (or click the icon) to trigger the glanceable HUD or Side Panel.

---

## PHASE 8: Verify Everything Worked (Final Checklist)

Review each integration surface to verify full autonomy:

### ✅ React 19 Command Center (`http://localhost:5173`)
- [ ] Atmospheric telemetry and 24h temperature curve rendered
- [ ] 8-node LangGraph Swarm Topology visualizer shows live node transitions
- [ ] Interactive 24h schedule timeline supports inline editing and task completion
- [ ] Workload HUD displays active Jira sprint tickets and GitHub PR review load
- [ ] Dark Mode (`#090a0f`) and Light Mode (`#f8fafc`) switch smoothly

### ✅ Chrome Extension Companion
- [ ] Toolbar badge displays live verdict (`OFF`, `WFH`, or `HYB`)
- [ ] Popup HUD opens in <150ms with current focus block and outfit recommendation
- [ ] Side Panel displays docked 24-hour timeline and active task list
- [ ] Context scraper detects active Jira tickets and GitHub pull requests

### ✅ Notion
- [ ] Executive Day Plan page auto-created with structured timeline blocks and metrics

### ✅ Slack
- [ ] Rich Block Kit summary card with verdict badge delivered to team channel

### ✅ Resend
- [ ] Responsive HTML executive briefing digest delivered to inbox

### ✅ Swytchcode Audit Ledger
```powershell
swy audit
# Or via REST API
curl -s http://localhost:8000/api/audit/logs
```
- [ ] Shows complete chronological tool execution ledger with timestamps and latencies
- [ ] All exit codes are 0 (Success)

---

## 🎬 How to Record Your Hackathon Presentation

1. Run `START_APP.bat` to launch the React 19 Command Center.
2. Start screen recording (Windows: `Win + G` → Record).
3. Walk through the 3-minute pitch outlined in [SHOWCASE_MANUAL.md](../SHOWCASE_MANUAL.md):
   - **0:00 - 0:45**: Problem Statement & Autonomous Decision Card (WFH vs. Office)
   - **0:45 - 1:30**: 8-Node Swarm Topology & 7 Swytchcode Tool Bindings
   - **1:30 - 2:15**: Workload Command Matrix & Chrome Extension Companion
   - **2:15 - 3:00**: Dual-Theme Engine, 1-Click Calendar Exports, & Enterprise Governance
4. Highlight Swytchcode features: `policies.json` guardrails, managed auth, and audit telemetry.
5. Stop recording and upload to your submission!

---

## ❓ Frequently Asked Questions

**Q: Do I need to pay for any API keys?**  
A: No. All services utilize free tiers: Google Gemini (free tier), OpenWeather (free), Gmail (free personal account), Jira Cloud (free up to 10 users), GitHub (free), Notion (free), Slack (free), Resend (100 emails/day free).

**Q: What if I don't have all 7 API keys yet?**  
A: Locus includes built-in high-fidelity synthetic fallback fixtures for every tool. You can run all benchmark scenarios with zero external API keys!

**Q: What makes this submission stand out to hackathon judges?**  
A: Locus implements all 7 Swytchcode tool bindings across Track 5, an 8-node LangGraph autonomous DAG state machine, a pixel-perfect React 19 dual-theme interface, a Manifest V3 Chrome Extension companion, and enterprise policy enforcement with 110 automated tests.
