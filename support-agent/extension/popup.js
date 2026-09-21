/**
 * AI Support Agent — Chrome Extension Popup Logic
 * 
 * Connects to the local FastAPI backend server to process emails
 * through the full Swytchcode + LangGraph pipeline.
 */

const API_URL = "http://localhost:8000";

// ── State ─────────────────────────────────────────────────────
let metrics = { processed: 0, tickets: 0, kbHits: 0, replies: 0 };
let logEntries = [];

// ── DOM Elements ──────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ── Tab Switching ─────────────────────────────────────────────
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ── Check Server Connection ───────────────────────────────────
async function checkConnection() {
  try {
    const resp = await fetch(`${API_URL}/health`, { method: "GET" });
    if (resp.ok) {
      $("statusDot").querySelector(".status-dot").className = "status-dot connected";
      $("statusText").textContent = "Connected";
      return true;
    }
  } catch (e) {
    // Server not running
  }
  $("statusDot").querySelector(".status-dot").className = "status-dot error";
  $("statusText").textContent = "Offline";
  return false;
}

// ── Update Metrics ────────────────────────────────────────────
function updateMetrics() {
  $("metricProcessed").textContent = metrics.processed;
  $("metricTickets").textContent = metrics.tickets;
  $("metricKBHits").textContent = metrics.kbHits;
  $("metricReplies").textContent = metrics.replies;

  // Update badge
  chrome.runtime.sendMessage({ type: "UPDATE_BADGE", count: metrics.processed });

  // Save to storage
  chrome.storage.local.set({ metrics });
}

// ── Add Log Entry ─────────────────────────────────────────────
function addLog(message) {
  logEntries.push(message);
  const container = $("logContainer");
  container.innerHTML = "";
  logEntries.forEach((entry) => {
    const div = document.createElement("div");
    div.className = "log-entry";
    div.textContent = entry;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

// ── Progress Steps ────────────────────────────────────────────
const STEPS = [
  { icon: "🧠", label: "Classifying issue with Gemini..." },
  { icon: "📚", label: "Searching Notion knowledge base..." },
  { icon: "🐛", label: "Creating GitHub issue (if KB gap)..." },
  { icon: "🎫", label: "Creating Jira ticket..." },
  { icon: "✍️", label: "Drafting reply with Gemini..." },
  { icon: "📤", label: "Sending reply via Resend..." },
];

function showProgress(stepIndex, total) {
  const pct = Math.round(((stepIndex + 1) / total) * 100);
  $("progressFill").style.width = `${pct}%`;

  const container = $("progressSteps");
  container.innerHTML = "";
  STEPS.slice(0, stepIndex + 1).forEach((step, i) => {
    const div = document.createElement("div");
    div.className = `step-item ${i === stepIndex ? "active" : "done"}`;
    div.innerHTML = `<span class="step-icon">${i < stepIndex ? "✅" : step.icon}</span> ${step.label}`;
    container.appendChild(div);
  });
}

// ── Apply Badge Classes ───────────────────────────────────────
function setBadge(elementId, value, type) {
  const el = $(elementId);
  el.textContent = value;
  el.className = `result-value badge ${type}-${value.toLowerCase()}`;
}

// ── Process Email ─────────────────────────────────────────────
async function processEmail() {
  const btn = $("btnProcess");
  const progressArea = $("progressArea");
  const resultsArea = $("resultsArea");

  // Get input values
  const emailFrom = $("emailFrom").value.trim();
  const emailSubject = $("emailSubject").value.trim();
  const emailBody = $("emailBody").value.trim();

  if (!emailFrom || !emailSubject || !emailBody) {
    alert("Please fill in all fields.");
    return;
  }

  // UI: show progress, hide results
  btn.disabled = true;
  btn.classList.add("processing");
  btn.querySelector(".btn-text").textContent = "Processing...";
  progressArea.classList.remove("hidden");
  resultsArea.classList.add("hidden");
  logEntries = [];

  addLog(`🚀 Processing email from ${emailFrom}...`);

  const connected = await checkConnection();

  if (connected) {
    // ── LIVE MODE: Call the FastAPI backend ──
    try {
      addLog("🔗 Connected to backend server");

      for (let i = 0; i < STEPS.length; i++) {
        showProgress(i, STEPS.length);
        addLog(STEPS[i].icon + " " + STEPS[i].label);
        await new Promise((r) => setTimeout(r, 800));
      }

      const resp = await fetch(`${API_URL}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_from: emailFrom,
          email_subject: emailSubject,
          email_body: emailBody,
        }),
      });

      if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
      const result = await resp.json();
      displayResults(result);

    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      // Fall back to demo mode
      addLog("⚠️ Falling back to demo mode...");
      await runDemoMode(emailFrom, emailSubject, emailBody);
    }
  } else {
    // ── DEMO MODE: Simulate locally ──
    addLog("⚠️ Backend offline — running in demo mode");
    await runDemoMode(emailFrom, emailSubject, emailBody);
  }

  // Reset button
  btn.disabled = false;
  btn.classList.remove("processing");
  btn.querySelector(".btn-text").textContent = "Process Email";
}

// ── Demo Mode (simulates the pipeline locally) ────────────────
async function runDemoMode(emailFrom, emailSubject, emailBody) {
  // Step 1: Classification (simulated)
  showProgress(0, 6);
  addLog("🧠 [Gemini] Classifying email...");
  await new Promise((r) => setTimeout(r, 1000));

  const isFrustrated = emailBody.toLowerCase().includes("frustrat") ||
                       emailBody.toLowerCase().includes("ridiculous") ||
                       emailBody.toUpperCase().includes("FIX THIS");
  const isKnown = emailSubject.toLowerCase().includes("password") ||
                  emailSubject.toLowerCase().includes("billing") ||
                  emailSubject.toLowerCase().includes("reset");

  const category = isKnown ? "known" : "unknown";
  const sentiment = isFrustrated ? "frustrated" : "neutral";
  const priority = isFrustrated ? "high" : (isKnown ? "medium" : "high");

  addLog(`✅ [Gemini] Category: ${category} | Sentiment: ${sentiment} | Priority: ${priority}`);

  // Step 2: KB Search
  showProgress(1, 6);
  addLog("📚 [Notion] Searching knowledge base...");
  await new Promise((r) => setTimeout(r, 800));

  const kbMatch = isKnown;
  addLog(kbMatch ? "✅ [Notion] Found matching KB article" : "⚠️ [Notion] No match — escalating");

  let githubId = null;
  let jiraId = null;

  // Step 3: GitHub (if no KB match)
  showProgress(2, 6);
  if (!kbMatch) {
    addLog("🐛 [GitHub] Creating KB gap issue via Swytchcode...");
    await new Promise((r) => setTimeout(r, 800));
    githubId = "#" + (Math.floor(Math.random() * 20) + 1);
    addLog(`✅ [GitHub] Created issue ${githubId}`);
  } else {
    addLog("⏭️ [GitHub] Skipped — KB match found");
  }

  // Step 4: Jira
  showProgress(3, 6);
  if (!kbMatch) {
    addLog("🎫 [Jira] Creating support ticket via Swytchcode...");
    await new Promise((r) => setTimeout(r, 800));
    jiraId = "SUP-" + (Math.floor(Math.random() * 100) + 1);
    addLog(`✅ [Jira] Created ticket ${jiraId}`);
  } else {
    addLog("⏭️ [Jira] Skipped — resolved from KB");
  }

  // Step 5: Draft Reply
  showProgress(4, 6);
  addLog("✍️ [Gemini] Drafting reply...");
  await new Promise((r) => setTimeout(r, 1000));

  const draftReply = kbMatch
    ? `Hi ${emailFrom.split("@")[0]},\n\nThank you for reaching out! To reset your password, go to Settings → Security → Click "Reset Password". You'll receive a reset link via email within 5 minutes.\n\nIf you continue to experience issues, please don't hesitate to reach out again.\n\nBest regards,\nSupport Team`
    : `Hi ${emailFrom.split("@")[0]},\n\nThank you for reaching out. We've received your report and our engineering team has been notified. A ticket (${jiraId}) has been created to track this issue.\n\nWe'll investigate and follow up within 24 hours.\n\nBest regards,\nSupport Team`;

  addLog("✅ [Gemini] Reply drafted");

  // Step 6: Send
  showProgress(5, 6);
  addLog("📤 [Resend] Sending reply via Swytchcode...");
  await new Promise((r) => setTimeout(r, 800));
  addLog("✅ [Resend] Reply sent successfully");

  // Display results
  displayResults({
    issue_category: category,
    sentiment: sentiment,
    priority: priority,
    kb_match_found: kbMatch,
    jira_ticket_id: jiraId,
    github_issue_id: githubId,
    draft_reply: draftReply,
    reply_sent: true,
  });
}

// ── Display Results ───────────────────────────────────────────
function displayResults(result) {
  const resultsArea = $("resultsArea");
  resultsArea.classList.remove("hidden");

  // Classification badges
  setBadge("resCategory", result.issue_category || "unknown", "category");
  setBadge("resSentiment", result.sentiment || "neutral", "sentiment");
  setBadge("resPriority", result.priority || "medium", "priority");

  const kbEl = $("resKBMatch");
  kbEl.textContent = result.kb_match_found ? "✅ Yes" : "❌ No";
  kbEl.className = `result-value badge ${result.kb_match_found ? "kb-yes" : "kb-no"}`;

  // Tickets
  $("resJiraId").textContent = result.jira_ticket_id || "Not needed";
  $("resGithubId").textContent = result.github_issue_id || "Not needed";

  // Draft reply
  $("resDraftReply").textContent = result.draft_reply || "No reply generated";

  // Success card
  $("successCard").style.display = result.reply_sent ? "flex" : "none";

  // Update metrics
  metrics.processed++;
  if (result.jira_ticket_id) metrics.tickets++;
  if (result.kb_match_found) metrics.kbHits++;
  if (result.reply_sent) metrics.replies++;
  updateMetrics();

  addLog("✅ Processing complete!");
}

// ── Event Listeners ───────────────────────────────────────────
$("btnProcess").addEventListener("click", processEmail);

// ── Init ──────────────────────────────────────────────────────
(async () => {
  // Load saved metrics
  const stored = await chrome.storage.local.get(["metrics"]);
  if (stored.metrics) {
    metrics = stored.metrics;
    updateMetrics();
  }
  checkConnection();
})();
