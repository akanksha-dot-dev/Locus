/**
 * AI Support Agent — Chrome Extension Popup (v2.0)
 *
 * Architecture:
 *  - All chrome.storage reads happen on init
 *  - Tab switching is pure CSS class toggling
 *  - API calls go to configurable backend URL (saved in chrome.storage)
 *  - Demo mode activates automatically when backend is offline
 *  - Charts are rendered via CSS conic-gradient (no canvas needed)
 */

// ── Helpers ───────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');

// ── State ─────────────────────────────────────────────────────
let API_URL = 'http://localhost:8000';
let metrics = { processed: 0, kbHits: 0, tickets: 0, replies: 0 };

// ── Chart colour palette ──────────────────────────────────────
const PALETTE = {
  known:      '#10b981',
  unknown:    '#f59e0b',
  urgent:     '#ef4444',
  positive:   '#10b981',
  neutral:    '#6366f1',
  negative:   '#f59e0b',
  frustrated: '#ef4444',
  low:        '#64748b',
  medium:     '#6366f1',
  high:       '#f59e0b',
  critical:   '#ef4444',
};

// ── Pipeline step definitions ─────────────────────────────────
const STEPS = [
  { icon: '🧠', label: 'Classifying with Gemini…' },
  { icon: '📚', label: 'Searching Notion KB…' },
  { icon: '🐛', label: 'Filing GitHub issue (if KB gap)…' },
  { icon: '🎫', label: 'Creating Jira ticket…' },
  { icon: '✍️', label: 'Drafting reply with Gemini…' },
  { icon: '📤', label: 'Sending reply via Resend…' },
];

// ═══════════════════════════════════════════════════════════════
//  TAB NAVIGATION
// ═══════════════════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $(`panel-${tab}`)?.classList.add('active');

      // Lazy-load tab content
      if (tab === 'history')   await loadHistory();
      if (tab === 'analytics') await loadAnalytics();
      if (tab === 'gaps')      await loadGaps();
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  CONNECTION CHECK
// ═══════════════════════════════════════════════════════════════
async function checkConnection() {
  const dot   = $('connDot');
  const label = $('connLabel');
  try {
    const resp = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      dot.className   = 'conn-dot connected';
      label.textContent = 'Connected';
      return true;
    }
  } catch (_) {
    // offline
  }
  dot.className   = 'conn-dot error';
  label.textContent = 'Offline';
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  METRICS
// ═══════════════════════════════════════════════════════════════
function renderMetrics() {
  $('statProcessed').textContent = metrics.processed;
  $('statKBHits').textContent    = metrics.kbHits;
  $('statTickets').textContent   = metrics.tickets;
  $('statReplies').textContent   = metrics.replies;
  // Update badge (fire-and-forget)
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count: metrics.processed });
  chrome.storage.local.set({ metrics });
}

function updateMetricsFromResult(result) {
  metrics.processed++;
  if (result.kb_match_found) metrics.kbHits++;
  if (result.jira_ticket_id) metrics.tickets++;
  if (result.reply_sent)     metrics.replies++;
  renderMetrics();
}

// ═══════════════════════════════════════════════════════════════
//  PROGRESS UI
// ═══════════════════════════════════════════════════════════════
function setProgress(stepIdx, total) {
  const pct = Math.round(((stepIdx + 1) / total) * 100);
  $('progressFill').style.width = `${pct}%`;

  const list = $('stepsList');
  list.innerHTML = '';
  STEPS.slice(0, stepIdx + 1).forEach((step, i) => {
    const div = document.createElement('div');
    div.className = `step-item ${i < stepIdx ? 'done' : 'active'}`;
    div.innerHTML = `<span class="step-icon">${i < stepIdx ? '✅' : step.icon}</span>${step.label}`;
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════════
//  RESULTS RENDERING
// ═══════════════════════════════════════════════════════════════
function applyBadge(id, value, prefix) {
  const el = $(id);
  el.textContent = value;
  el.className = `badge badge-${prefix}-${(value || 'unknown').toLowerCase()}`;
}

function displayResults(result) {
  // Classification
  applyBadge('resCat',  result.issue_category || 'unknown',  'category');
  applyBadge('resSent', result.sentiment       || 'neutral',  'sentiment');
  applyBadge('resPri',  result.priority        || 'medium',   'priority');

  const kbEl = $('resKB');
  kbEl.textContent = result.kb_match_found ? '✅ Yes' : '❌ No';
  kbEl.className   = `badge badge-kb-${result.kb_match_found ? 'yes' : 'no'}`;

  // Tickets
  if (result.jira_ticket_id) {
    show($('rowJira'));
    const jiraLink = $('linkJira');
    jiraLink.textContent = result.jira_ticket_id;
    jiraLink.href        = result.jira_ticket_url || '#';
  } else {
    hide($('rowJira'));
  }

  if (result.github_issue_id) {
    show($('rowGitHub'));
    const ghLink = $('linkGitHub');
    ghLink.textContent = `#${result.github_issue_id}`;
    ghLink.href        = result.github_issue_url || '#';
  } else {
    hide($('rowGitHub'));
  }

  if (!result.jira_ticket_id && !result.github_issue_id) {
    show($('noTickets'));
  } else {
    hide($('noTickets'));
  }

  // Draft reply
  $('resDraft').textContent = result.draft_reply || 'No reply generated';

  // Success bar
  if (result.reply_sent) {
    show($('successBar'));
    $('successMsg').textContent = result.resend_message_id
      ? `Reply sent (ID: ${result.resend_message_id})`
      : 'Reply sent via Resend';
  } else {
    hide($('successBar'));
  }

  show($('resultsWrap'));
  updateMetricsFromResult(result);
}

// ═══════════════════════════════════════════════════════════════
//  DEMO MODE (offline simulation)
// ═══════════════════════════════════════════════════════════════
async function runDemo(emailFrom, emailSubject, emailBody) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const bodyLow    = emailBody.toLowerCase();
  const subjectLow = emailSubject.toLowerCase();

  const isKnown = ['password', 'reset', 'billing', 'login', 'invoice'].some((w) => subjectLow.includes(w) || bodyLow.includes(w));
  const isFrustrated = ['frustrat', 'ridiculous', 'asap', 'urgent', 'error 500', 'deadline'].some((w) => bodyLow.includes(w));

  const category  = isKnown       ? 'known'     : 'unknown';
  const sentiment = isFrustrated  ? 'frustrated' : 'neutral';
  const priority  = isFrustrated  ? 'high'       : (isKnown ? 'medium' : 'high');

  setProgress(0, 6); await delay(800);
  setProgress(1, 6); await delay(700);

  const kbMatch = isKnown;
  let githubId = null, jiraId = null;

  if (!kbMatch) {
    setProgress(2, 6); await delay(700);
    githubId = String(Math.floor(Math.random() * 50) + 1);
    setProgress(3, 6); await delay(700);
    jiraId = `CCS-${Math.floor(Math.random() * 999) + 100}`;
  } else {
    setProgress(2, 6); await delay(200);
    setProgress(3, 6); await delay(200);
  }

  setProgress(4, 6); await delay(900);
  const senderName = emailFrom.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const draft = kbMatch
    ? `Hi ${senderName},\n\nThank you for reaching out! To reset your password, go to Settings → Security → Click "Reset Password". You'll receive a reset link via email within 5 minutes.\n\nIf you continue to have issues, please contact us again.\n\nBest regards,\nSupport Team`
    : `Hi ${senderName},\n\nThank you for reaching out. We've received your report and our engineering team has been notified (ticket: ${jiraId}).\n\nWe'll investigate and follow up within 24 hours.\n\nBest regards,\nSupport Team`;

  setProgress(5, 6); await delay(700);

  return {
    issue_category: category,
    sentiment,
    priority,
    kb_match_found: kbMatch,
    jira_ticket_id: jiraId,
    jira_ticket_url: jiraId ? `https://yourname.atlassian.net/browse/${jiraId}` : null,
    github_issue_id: githubId,
    github_issue_url: githubId ? `https://github.com/org/kb-gaps/issues/${githubId}` : null,
    draft_reply: draft,
    reply_sent: true,
    resend_message_id: `demo_${Date.now()}`,
  };
}

// ═══════════════════════════════════════════════════════════════
//  PROCESS EMAIL
// ═══════════════════════════════════════════════════════════════
async function processEmail() {
  const btn     = $('btnProcess');
  const emailFrom    = $('emailFrom').value.trim();
  const emailSubject = $('emailSubject').value.trim();
  const emailBody    = $('emailBody').value.trim();

  if (!emailFrom || !emailSubject || !emailBody) {
    alert('Please fill in From, Subject, and Email Body.');
    return;
  }

  // Reset UI
  btn.disabled = true;
  btn.classList.add('processing');
  $('btnProcess').querySelector('.btn-text').textContent = 'Processing…';
  show($('progressWrap'));
  hide($('resultsWrap'));
  $('progressFill').style.width = '0%';
  $('stepsList').innerHTML = '';

  try {
    const online = await checkConnection();
    let result;

    if (online) {
      // Show animated steps while waiting for the API
      let stepIdx = 0;
      const stepInterval = setInterval(() => {
        if (stepIdx < STEPS.length - 1) setProgress(stepIdx++, STEPS.length);
      }, 900);

      const resp = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_from: emailFrom, email_subject: emailSubject, email_body: emailBody }),
        signal: AbortSignal.timeout(60000),
      });

      clearInterval(stepInterval);
      setProgress(STEPS.length - 1, STEPS.length);

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      result = await resp.json();
    } else {
      // Offline — run full demo simulation
      result = await runDemo(emailFrom, emailSubject, emailBody);
    }

    displayResults(result);
  } catch (err) {
    console.error('Process error:', err);
    // Fallback to demo
    const result = await runDemo(emailFrom, emailSubject, emailBody);
    displayResults(result);
  } finally {
    btn.disabled = false;
    btn.classList.remove('processing');
    $('btnProcess').querySelector('.btn-text').textContent = 'Process Email';
  }
}

// ═══════════════════════════════════════════════════════════════
//  COPY DRAFT
// ═══════════════════════════════════════════════════════════════
function initCopyDraft() {
  $('btnCopyDraft').addEventListener('click', async () => {
    const text = $('resDraft').textContent;
    try {
      await navigator.clipboard.writeText(text);
      $('btnCopyDraft').textContent = '✅ Copied!';
      setTimeout(() => { $('btnCopyDraft').textContent = 'Copy Reply'; }, 1800);
    } catch (_) {
      $('btnCopyDraft').textContent = 'Copy failed';
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  HISTORY TAB
// ═══════════════════════════════════════════════════════════════
function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch (_) { return iso.slice(0, 16).replace('T', ' '); }
}

async function loadHistory() {
  const container = $('historyList');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  let items = [];
  try {
    const resp = await fetch(`${API_URL}/history`, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const data = await resp.json();
      items = data.items || [];
    }
  } catch (_) {
    // backend offline — nothing to show
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No emails processed yet</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-subject" title="${item.email_subject || ''}">${item.email_subject || '(no subject)'}</span>
        <span class="history-time">${formatTime(item.processed_at)}</span>
      </div>
      <div class="history-meta">
        <span class="history-from">${item.email_from || ''}</span>
        <span class="badge badge-category-${item.issue_category || 'unknown'}">${item.issue_category || '—'}</span>
        <span class="badge badge-priority-${item.priority || 'medium'}">${item.priority || '—'}</span>
      </div>
      <div class="history-body">${item.draft_reply || '(no reply)'}</div>
    `;
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    container.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════
//  ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════
function renderDonut(categories) {
  const donut  = $('donutChart');
  const legend = $('donutLegend');
  const total  = Object.values(categories).reduce((a, b) => a + b, 0);

  if (total === 0) {
    donut.style.background = 'var(--surface-3)';
    legend.innerHTML = '<span style="color:var(--text-3);font-size:11px;">No data yet</span>';
    return;
  }

  const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
  let cumPct = 0;
  const segments = entries.map(([key, val]) => {
    const pct = (val / total) * 100;
    const from = cumPct;
    cumPct += pct;
    const color = PALETTE[key] || '#6366f1';
    return `${color} ${from.toFixed(1)}% ${cumPct.toFixed(1)}%`;
  });

  donut.style.background = `conic-gradient(${segments.join(', ')})`;

  legend.innerHTML = entries.map(([key, val]) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${PALETTE[key] || '#6366f1'}"></span>
      <span>${key}</span>
      <span class="legend-pct">${Math.round((val / total) * 100)}%</span>
    </div>
  `).join('');
}

function renderBarChart(containerId, data, palette) {
  const container = $(containerId);
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) {
    container.innerHTML = '<span style="color:var(--text-3);font-size:11px;">No data yet</span>';
    return;
  }
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  container.innerHTML = entries.map(([key, val]) => {
    const pct = Math.round((val / total) * 100);
    const color = palette[key] || '#6366f1';
    return `
      <div class="bar-row">
        <span class="bar-label">${key}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <span class="bar-count">${val}</span>
      </div>
    `;
  }).join('');
}

async function loadAnalytics() {
  let data = null;
  try {
    const resp = await fetch(`${API_URL}/analytics`, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) data = await resp.json();
  } catch (_) { /* offline */ }

  if (!data) {
    $('kpiKBRate').textContent = '—%';
    $('kpiTickets').textContent = '—';
    return;
  }

  $('kpiKBRate').textContent  = `${data.kb_hit_rate ?? 0}%`;
  $('kpiTickets').textContent = data.tickets_created ?? 0;

  renderDonut(data.categories || {});
  renderBarChart('barSentiment', data.sentiments || {}, PALETTE);
  renderBarChart('barPriority',  data.priorities  || {}, PALETTE);
}

// ═══════════════════════════════════════════════════════════════
//  KB GAPS TAB
// ═══════════════════════════════════════════════════════════════
async function loadGaps() {
  const container = $('gapsList');
  container.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';

  let gaps = [];
  try {
    const resp = await fetch(`${API_URL}/kb-gaps`, { signal: AbortSignal.timeout(4000) });
    if (resp.ok) {
      const data = await resp.json();
      gaps = data.gaps || [];
    }
  } catch (_) { /* offline */ }

  if (gaps.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎉</div>
        <p>No KB gaps — great coverage!</p>
      </div>`;
    return;
  }

  container.innerHTML = '';
  gaps.forEach((gap) => {
    const card = document.createElement('div');
    card.className = 'gap-card';
    const kws = (gap.keywords || []).map((k) => `<span class="kw-chip">${k}</span>`).join('');
    card.innerHTML = `
      <div class="gap-card-header">
        <span class="gap-issue-id">#${gap.issue_id}</span>
        <span class="gap-subject" title="${gap.subject || ''}">${gap.subject || 'Unknown issue'}</span>
      </div>
      <div class="gap-meta">
        <span class="badge badge-priority-${gap.priority || 'medium'}">${gap.priority || 'medium'}</span>
        <span class="gap-time">${formatTime(gap.created_at)}</span>
        ${gap.issue_url && gap.issue_url !== '#'
          ? `<a class="gap-open-btn" href="${gap.issue_url}" target="_blank" rel="noopener">↗ GitHub</a>`
          : ''
        }
      </div>
      ${kws ? `<div class="gap-keywords">${kws}</div>` : ''}
    `;
    container.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ═══════════════════════════════════════════════════════════════
function initSettings() {
  // Load saved URL
  chrome.storage.local.get(['apiUrl'], ({ apiUrl }) => {
    if (apiUrl) {
      API_URL = apiUrl;
      $('settingsUrl').value = apiUrl;
    }
  });

  // Save URL on blur
  $('settingsUrl').addEventListener('blur', () => {
    const url = $('settingsUrl').value.trim().replace(/\/$/, '');
    if (url) {
      API_URL = url;
      chrome.storage.local.set({ apiUrl: url });
    }
  });

  // Test connection
  $('btnTestConn').addEventListener('click', async () => {
    const result = $('connResult');
    result.textContent = 'Testing…';
    result.className = 'conn-result';
    show(result);
    const ok = await checkConnection();
    result.textContent = ok ? '✅ Connected to backend' : '❌ Could not reach backend';
    result.className = `conn-result ${ok ? 'ok' : 'fail'}`;
  });

  // Clear data
  $('btnClearData').addEventListener('click', async () => {
    if (!confirm('Clear all locally stored metrics?')) return;
    await chrome.storage.local.clear();
    metrics = { processed: 0, kbHits: 0, tickets: 0, replies: 0 };
    renderMetrics();
    chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' });
    $('btnClearData').textContent = 'Cleared!';
    setTimeout(() => { $('btnClearData').textContent = 'Clear Local Storage'; }, 2000);
  });
}

// ═══════════════════════════════════════════════════════════════
//  CONTEXT MENU PENDING TEXT
// ═══════════════════════════════════════════════════════════════
async function checkPendingText() {
  const { pendingText, pendingTextTime } = await chrome.storage.local.get(['pendingText', 'pendingTextTime']);
  // Only use pending text if it was set in the last 2 minutes
  if (pendingText && pendingTextTime && (Date.now() - pendingTextTime) < 120_000) {
    $('emailBody').value = pendingText;
    show($('pendingBanner'));
    // Clear it so next open is clean
    await chrome.storage.local.remove(['pendingText', 'pendingTextTime']);
    // Clear the badge
    chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' });
  }
}

$('btnClearPending')?.addEventListener('click', () => {
  $('emailBody').value = '';
  hide($('pendingBanner'));
});

// ═══════════════════════════════════════════════════════════════
//  REFRESH BUTTONS
// ═══════════════════════════════════════════════════════════════
$('btnRefreshHistory')?.addEventListener('click', loadHistory);
$('btnRefreshAnalytics')?.addEventListener('click', loadAnalytics);
$('btnRefreshGaps')?.addEventListener('click', loadGaps);

// ═══════════════════════════════════════════════════════════════
//  PROCESS BUTTON
// ═══════════════════════════════════════════════════════════════
$('btnProcess').addEventListener('click', processEmail);

// ═══════════════════════════════════════════════════════════════
//  INITIALISE
// ═══════════════════════════════════════════════════════════════
(async () => {
  // Restore metrics from storage
  const stored = await chrome.storage.local.get(['metrics', 'apiUrl']);
  if (stored.metrics) {
    metrics = stored.metrics;
    renderMetrics();
  }
  if (stored.apiUrl) {
    API_URL = stored.apiUrl;
    $('settingsUrl').value = stored.apiUrl;
  }

  // Check for context-menu pending text
  await checkPendingText();

  // Check backend connection
  await checkConnection();

  // Wire up tabs + settings
  initTabs();
  initSettings();
  initCopyDraft();
})();
