# 🚀 Complete Beginner's Guide — From Zero to Working Agent

> **Audience:** Total beginners. Every click, every URL, every command is explained.
> **Time needed:** ~90 minutes for full setup.

---

## 📋 Big Picture — What You're Building

```
YOU (beginner) will set up:

  ┌─────────────────────────────────────────────────────────────────┐
  │                     YOUR COMPUTER                               │
  │                                                                 │
  │  ┌───────────────┐    ┌──────────────┐    ┌─────────────────┐  │
  │  │ Python 3.11+  │    │ Node.js 18+  │    │ Swytchcode CLI  │  │
  │  │ (runs agent)  │    │ (installs    │    │ (connects to    │  │
  │  │               │    │  swy CLI)    │    │  all 5 APIs)    │  │
  │  └───────┬───────┘    └──────┬───────┘    └────────┬────────┘  │
  │          │                   │                     │            │
  │          └───────────────────┴─────────────────────┘            │
  │                              │                                  │
  │                    ┌─────────▼──────────┐                       │
  │                    │   YOUR AGENT CODE  │                       │
  │                    │   (main.py)        │                       │
  │                    └─────────┬──────────┘                       │
  └──────────────────────────────┼──────────────────────────────────┘
                                 │
                    ┌────────────▼────────────────┐
                    │      SWYTCHCODE LAYER       │
                    │  (handles auth, retries,    │
                    │   policies, idempotency)    │
                    └────────────┬────────────────┘
                                 │
          ┌──────────┬───────────┼───────────┬──────────┐
          ▼          ▼           ▼           ▼          ▼
       📧 Gmail  📚 Notion  🎫 Jira   📤 Resend  🐛 GitHub
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
cd d:\SwytchAgent2.0\backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> [!NOTE]
> **What is `venv`?** It creates an isolated Python environment so your project's packages don't conflict with other Python projects. You'll see `(venv)` at the start of your terminal prompt when it's active.
>
> ⚠️ Every time you open a new terminal, you need to activate it again:
> ```powershell
> cd d:\SwytchAgent2.0\backend
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
cd d:\SwytchAgent2.0\backend
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
cd d:\SwytchAgent2.0\backend
copy .env.example .env
```

Now open `.env` in your editor and fill in ALL the values you saved earlier:

```ini
# --- LLM Provider (Google Gemini) ---
GOOGLE_API_KEY=AIzaSy...paste-your-gemini-key...

# --- Notion ---
NOTION_KB_DATABASE_ID=a1b2c3d4...paste-your-database-id...

# --- Jira ---
JIRA_PROJECT_KEY=SUP
JIRA_DOMAIN=yourname.atlassian.net

# --- GitHub ---
GITHUB_OWNER=your-github-username
GITHUB_REPO=support-kb-gaps

# --- Resend ---
RESEND_FROM_EMAIL=onboarding@resend.dev

# --- Agent Settings ---
SUPPORT_LABEL=support
MAX_EMAILS_PER_RUN=5
```

---

## PHASE 6: Run the Agent! (5 min)

### Run 1: Verify Setup

```powershell
cd d:\SwytchAgent2.0\backend
.\venv\Scripts\Activate.ps1
python main.py --verify
```

**Expected:** `✅ Loaded X Swytchcode tools from 5 integrations`

### Run 2: Demo Mode (Uses Simulated Email — No Live APIs except Gemini)

```powershell
python main.py --demo
```

**What happens:**
1. Agent uses a **fake email** (Jane can't reset her password)
2. Gemini classifies it (category, sentiment, priority)
3. Creates a GitHub issue (KB gap)
4. Creates a Jira ticket
5. Drafts a reply using Gemini
6. Sends via Resend

**After it finishes, verify:**
- ✅ Go to **GitHub** → `support-kb-gaps` repo → **Issues** tab → you should see a new issue titled "KB Gap: ..."
- ✅ Go to **Jira** → `SUP` project → you should see a new ticket `SUP-1`
- ✅ Go to **Resend Dashboard** → **Emails** → you should see a sent email
- ✅ Check your inbox → you should receive the reply email

### Run 3: Live Mode (Reads Real Gmail)

Make sure your test emails are in Gmail with the `support` label and are **unread**.

```powershell
python main.py
```

**What happens:**
1. Agent reads the **first unread email** with the `support` label from Gmail
2. Gemini classifies it
3. If the email is about "password reset" → Notion KB will find a match → agent drafts a reply using KB content
4. If the email is about "500 errors" → No KB match → agent creates GitHub issue + Jira ticket → drafts an acknowledgment reply
5. Reply is sent via Resend

---

## PHASE 7: Run the Dashboard (5 min)

```powershell
cd d:\SwytchAgent2.0\backend
.\venv\Scripts\Activate.ps1
streamlit run dashboard/app.py
```

**What happens:**
1. Your browser opens at `http://localhost:8501`
2. You see the beautiful dashboard with metrics, integration badges, and feature list
3. Check **"Use demo email"** checkbox (pre-filled with a test email)
4. Click the big **🚀 Process Email** button
5. Watch the progress bar step through each node
6. See the classification, tickets, and draft reply in real-time
7. Click **"Execution Log"** tab to see every step
8. Click **"Architecture"** tab to see the system diagram

> [!TIP]
> **For your hackathon demo video:** Screen-record the dashboard while clicking "Process Email". It's the most visually impressive way to show the full workflow.

---

## PHASE 8: Verify Everything Worked (Final Checklist)

Go to each platform and verify the agent created the right data:

### ✅ Gmail
Open **https://mail.google.com** (your test account)
- [ ] The test emails are still there (agent reads, doesn't delete)
- [ ] Agent correctly identified the sender, subject, and body

### ✅ Notion
Open your **Support Knowledge Base** in Notion
- [ ] Database is unchanged (agent only reads, doesn't write)
- [ ] For "password reset" emails, the agent found the KB article
- [ ] For "500 error" emails, the agent found no match (triggers escalation)

### ✅ GitHub
Open **https://github.com/YOUR_USERNAME/support-kb-gaps/issues**
- [ ] New issues appear titled "KB Gap: ..."
- [ ] Each issue has a detailed body with category, priority, sentiment
- [ ] Labels are applied (kb-gap, auto-generated, etc.)

### ✅ Jira
Open **https://yourname.atlassian.net** → SUP project
- [ ] New tickets appear with `[Support]` prefix in the summary
- [ ] Description contains customer info, sentiment, and KB results
- [ ] Priority matches the classification (frustrated = High)

### ✅ Resend
Open **https://resend.com/emails** (your dashboard)
- [ ] Sent emails appear in the list
- [ ] Subject starts with "Re: ..."
- [ ] HTML formatting looks clean (header, body, ticket badge)

### ✅ Swytchcode Audit
```powershell
swy audit
```
- [ ] Shows all tool executions with timestamps
- [ ] All 5 integrations appear in the log
- [ ] All exit codes are 0 (success)

---

## 🎬 How to Record Your Demo Video

1. Open the **Streamlit dashboard** (`streamlit run dashboard/app.py`)
2. Start screen recording (Windows: `Win + G` → Record)
3. Click **"Process Email"** with a demo email
4. Show each step completing in the progress bar
5. Show the classification result, Jira ticket, and draft reply
6. Switch tabs to show Execution Log
7. Open GitHub issues in browser to show the created issue
8. Open Jira to show the created ticket
9. Open Resend dashboard to show the sent email
10. Run `swy audit` in terminal to show the Swytchcode audit trail
11. Stop recording — upload to your hackathon submission

---

## ❓ Common Questions

**Q: Do I need to pay for anything?**
A: No! Everything uses free tiers: Gmail (free), Notion (free), Jira (free for ≤10 users), Resend (100 emails/day free), GitHub (free), Gemini (free tier), Swytchcode (free for hackathon).

**Q: What if I can't install `swy` via npm?**
A: Try the direct Windows install: `irm https://cli.swytchcode.com/install.ps1 | iex`

**Q: What if Notion says "Could not find database"?**
A: You forgot to **share the database** with your Notion integration. Go to the database page → Share → Invite → select your integration.

**Q: What if the agent says "No unread support emails"?**
A: Make sure your test emails (1) have the `support` label, and (2) are marked as **unread**.

**Q: Can I change the LLM from Gemini to OpenAI/Claude?**
A: Yes! Just change the `issue_classifier.py` and `reply_drafter.py` to use a different LLM SDK. But Gemini is free, so it's best for hackathons.

**Q: What makes my submission stand out to judges?**
A: Show the **Swytchcode features**: policies.json (guardrails), idempotency (no duplicates), managed auth (zero credential code), audit logging (`swy audit`). These are what the judges from Swytchcode specifically look for.
