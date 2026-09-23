/**
 * AI Support Agent — Chrome Extension Popup v2.0
 *
 * Features:
 *  - 6 tabs: Process, History, Analytics, KB Gaps, Live, Settings
 *  - Auto-process mode toggle (backend /auto-process/start/stop)
 *  - 3-tone reply variants (Empathetic / Formal / Concise)
 *  - Confidence score bar + SLA deadline display
 *  - WebSocket live activity feed (/ws)
 *  - KB Article Generator ("Generate + Push to Notion" on KB gaps)
 *  - SLA breach counter in stats bar
 *  - Context menu pending text pre-fill
 */

// ── Helpers ───────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const show = (el) => el?.classList.remove('hidden');
const hide = (el) => el?.classList.add('hidden');

// ── State ─────────────────────────────────────────────────────
let API_URL   = 'http://localhost:8000';
let metrics   = { processed: 0, kbHits: 0, tickets: 0, replies: 0 };
let wsConn    = null;
let liveCount = 0;
let currentVariants = [];   // [{tone, label, icon, text}]

// ── Chart palette ─────────────────────────────────────────────
const PALETTE = {
  known:'#10b981', unknown:'#f59e0b', urgent:'#ef4444',
  positive:'#10b981', neutral:'#6366f1', negative:'#f59e0b', frustrated:'#ef4444',
  low:'#64748b', medium:'#6366f1', high:'#f59e0b', critical:'#ef4444',
};

// ── Pipeline step definitions ─────────────────────────────────
const STEPS = [
  { icon: '🧠', label: 'Classifying with Gemini…' },
  { icon: '📚', label: 'Searching Notion KB…' },
  { icon: '🐛', label: 'Filing GitHub issue (KB gap)…' },
  { icon: '🎫', label: 'Creating Jira ticket…' },
  { icon: '✍️', label: 'Drafting 3-tone replies…' },
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

      if (tab === 'history')   await loadHistory();
      if (tab === 'analytics') await loadAnalytics();
      if (tab === 'gaps')      await loadGaps();
      if (tab === 'live')      { liveCount = 0; hide($('liveBadge')); connectWebSocket(); }
    });
  });
}

// ═══════════════════════════════════════════════════════════════
//  CONNECTION CHECK
// ═══════════════════════════════════════════════════════════════
async function checkConnection() {
  try {
    const r = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      $('connDot').className = 'conn-dot connected';
      $('connLabel').textContent = 'Connected';
      return true;
    }
  } catch (_) {}
  $('connDot').className = 'conn-dot error';
  $('connLabel').textContent = 'Offline';
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  METRICS
// ═══════════════════════════════════════════════════════════════
function renderMetrics(breachCount = 0) {
  $('statProcessed').textContent = metrics.processed;
  $('statKBHits').textContent    = metrics.kbHits;
  $('statTickets').textContent   = metrics.tickets;
  $('statReplies').textContent   = metrics.replies;
  $('statBreaching').textContent = breachCount;
  chrome.runtime.sendMessage({ type: 'UPDATE_BADGE', count: metrics.processed });
  chrome.storage.local.set({ metrics });
}

function updateMetricsFromResult(result) {
  metrics.processed++;
  if (result.kb_match_found) metrics.kbHits++;
  if (result.jira_ticket_id) metrics.tickets++;
  if (result.reply_sent)     metrics.replies++;
  renderMetrics();
  // Refresh SLA count
  loadSLACount();
}

async function loadSLACount() {
  try {
    const r = await fetch(`${API_URL}/sla-status`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      const nc = (d.near_breach_count || 0) + (d.breached_count || 0);
      $('statBreaching').textContent = nc;
      if ($('kpiBreached')) $('kpiBreached').textContent = d.breached_count ?? '0';
    }
  } catch (_) {}
}

// ═══════════════════════════════════════════════════════════════
//  PROGRESS UI
// ═══════════════════════════════════════════════════════════════
function setProgress(stepIdx, total) {
  $('progressFill').style.width = `${Math.round(((stepIdx + 1) / total) * 100)}%`;
  const list = $('stepsList');
  list.innerHTML = '';
  STEPS.slice(0, stepIdx + 1).forEach((s, i) => {
    const div = document.createElement('div');
    div.className = `step-item ${i < stepIdx ? 'done' : 'active'}`;
    div.innerHTML = `<span class="step-icon">${i < stepIdx ? '✅' : s.icon}</span>${s.label}`;
    list.appendChild(div);
  });
}

// ═══════════════════════════════════════════════════════════════
//  RESULTS RENDERING
// ═══════════════════════════════════════════════════════════════
function applyBadge(id, value, prefix) {
  const el = $(id);
  el.textContent = value;
  el.className = `badge badge-${prefix}-${(value||'unknown').toLowerCase()}`;
}

function displayResults(result) {
  applyBadge('resCat',  result.issue_category || 'unknown',  'category');
  applyBadge('resSent', result.sentiment       || 'neutral',  'sentiment');
  applyBadge('resPri',  result.priority        || 'medium',   'priority');

  const kbEl = $('resKB');
  kbEl.textContent = result.kb_match_found ? '✅ Yes' : '❌ No';
  kbEl.className = `badge badge-kb-${result.kb_match_found ? 'yes' : 'no'}`;

  // Confidence bar
  if (result.confidence_score != null) {
    const c = result.confidence_score;
    $('confFill').style.width = `${c}%`;
    $('confPct').textContent = `${c}%`;
    show($('confRow'));
  } else {
    hide($('confRow'));
  }

  // SLA deadline
  if (result.sla_deadline_hours != null) {
    const slaEl = $('slaVal');
    slaEl.textContent = `${result.sla_deadline_hours}h response window`;
    if (result.sla_deadline_hours <= 4) slaEl.classList.add('breach');
    else slaEl.classList.remove('breach');
    show($('slaRow'));
  } else {
    hide($('slaRow'));
  }

  // Tickets
  if (result.jira_ticket_id) {
    show($('rowJira'));
    $('linkJira').textContent = result.jira_ticket_id;
    $('linkJira').href        = result.jira_ticket_url || '#';
  } else { hide($('rowJira')); }

  if (result.github_issue_id) {
    show($('rowGitHub'));
    $('linkGitHub').textContent = `#${result.github_issue_id}`;
    $('linkGitHub').href        = result.github_issue_url || '#';
  } else { hide($('rowGitHub')); }

  if (!result.jira_ticket_id && !result.github_issue_id) show($('noTickets'));
  else hide($('noTickets'));

  // 3-tone reply variants
  currentVariants = result.reply_variants || [];
  renderToneVariants(currentVariants, result.draft_reply);

  // Success bar
  if (result.reply_sent) {
    $('successMsg').textContent = result.resend_message_id
      ? `Reply sent (ID: ${result.resend_message_id})`
      : 'Reply sent via Resend';
    show($('successBar'));
  } else { hide($('successBar')); }

  show($('resultsWrap'));
  updateMetricsFromResult(result);
}

// ── Tone variant tabs ─────────────────────────────────────────
function renderToneVariants(variants, fallbackDraft) {
  const tabs = $('toneTabs');
  const draft = $('resDraft');

  if (!variants || variants.length <= 1) {
    hide(tabs);
    draft.textContent = fallbackDraft || 'No reply generated';
    return;
  }

  show(tabs);
  tabs.style.display = '';

  // Build tab buttons
  tabs.innerHTML = '';
  variants.forEach((v, i) => {
    const btn = document.createElement('button');
    btn.className = `tone-tab${i === 0 ? ' active' : ''}`;
    btn.dataset.tone = i;
    btn.textContent = `${v.icon || ''} ${v.label || v.tone}`;
    btn.addEventListener('click', () => {
      tabs.querySelectorAll('.tone-tab').forEach((t) => t.classList.remove('active'));
      btn.classList.add('active');
      draft.textContent = v.text;
    });
    tabs.appendChild(btn);
  });

  // Show first variant
  draft.textContent = variants[0].text;
}

// ═══════════════════════════════════════════════════════════════
//  DEMO MODE
// ═══════════════════════════════════════════════════════════════
async function runDemo(emailFrom, emailSubject, emailBody) {
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));
  const bodyLow    = emailBody.toLowerCase();
  const subjectLow = emailSubject.toLowerCase();
  const isKnown = ['password','reset','billing','login','invoice'].some((w) => subjectLow.includes(w)||bodyLow.includes(w));
  const isFrust = ['frustrat','asap','urgent','error 500','deadline'].some((w) => bodyLow.includes(w));
  const cat  = isKnown ? 'known' : 'unknown';
  const sent = isFrust ? 'frustrated' : 'neutral';
  const pri  = isFrust ? 'high' : (isKnown ? 'medium' : 'high');
  const conf = Math.floor(Math.random() * 25) + 72;
  const sla  = {'high':4,'medium':24,'low':72,'critical':1}[pri] || 24;

  for (let i = 0; i < STEPS.length; i++) { setProgress(i, STEPS.length); await delay(650); }

  const kbMatch = isKnown;
  let githubId = null, jiraId = null;
  if (!kbMatch) {
    githubId = String(Math.floor(Math.random() * 50) + 1);
    jiraId   = `CCS-${Math.floor(Math.random() * 999) + 100}`;
  }

  const name = emailFrom.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());
  const baseReply = kbMatch
    ? `Hi ${name},\n\nTo reset your password, go to Settings → Security → "Reset Password". A reset link will arrive within 5 minutes.\n\nBest regards,\nSupport Team`
    : `Hi ${name},\n\nWe've received your report and our engineering team has been notified (ticket: ${jiraId}). We'll follow up within 24 hours.\n\nBest regards,\nSupport Team`;

  return {
    issue_category: cat, sentiment: sent, priority: pri,
    confidence_score: conf, sla_deadline_hours: sla,
    kb_match_found: kbMatch,
    jira_ticket_id: jiraId, jira_ticket_url: jiraId ? `https://yourname.atlassian.net/browse/${jiraId}` : null,
    github_issue_id: githubId, github_issue_url: githubId ? `https://github.com/org/kb-gaps/issues/${githubId}` : null,
    draft_reply: baseReply,
    reply_variants: [
      { tone:'empathetic', label:'Empathetic', icon:'💬', text: `Hi ${name},\n\nI completely understand how frustrating this must be — thank you for your patience. ${kbMatch ? 'Great news: I found the exact solution for you! Go to Settings → Security → "Reset Password".' : `We've already escalated this to our engineering team (${jiraId}) and they're on it.`}\n\nPlease don't hesitate to reach out if you need anything else.\n\nWarm regards,\nSupport Team` },
      { tone:'formal',     label:'Formal',     icon:'🎩', text: `Dear ${name},\n\nThank you for contacting our support team. ${kbMatch ? 'We have identified a solution: please navigate to Settings → Security → "Reset Password".' : `Your issue has been escalated and assigned ticket ${jiraId}. Our team will respond within 24 hours.`}\n\nSincerely,\nCustomer Support` },
      { tone:'concise',    label:'Concise',    icon:'⚡', text: `Hi ${name},\n\n${kbMatch ? 'Fix: Settings → Security → Reset Password. Link arrives in 5 min.' : `Ticket ${jiraId} created. Engineering team notified. Update in 24h.`}\n\n— Support Team` },
    ],
    reply_sent: true,
    resend_message_id: `demo_${Date.now()}`,
  };
}

// ═══════════════════════════════════════════════════════════════
//  PROCESS EMAIL
// ═══════════════════════════════════════════════════════════════
async function processEmail() {
  const btn          = $('btnProcess');
  const emailFrom    = $('emailFrom').value.trim();
  const emailSubject = $('emailSubject').value.trim();
  const emailBody    = $('emailBody').value.trim();

  if (!emailFrom || !emailSubject || !emailBody) {
    alert('Please fill in From, Subject, and Email Body.');
    return;
  }

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
      let stepIdx = 0;
      const stepTimer = setInterval(() => { if (stepIdx < STEPS.length - 1) setProgress(stepIdx++, STEPS.length); }, 950);
      const resp = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_from: emailFrom, email_subject: emailSubject, email_body: emailBody }),
        signal: AbortSignal.timeout(90_000),
      });
      clearInterval(stepTimer);
      setProgress(STEPS.length - 1, STEPS.length);
      if (!resp.ok) throw new Error(`Server ${resp.status}`);
      result = await resp.json();
    } else {
      result = await runDemo(emailFrom, emailSubject, emailBody);
    }
    displayResults(result);
  } catch (err) {
    const demo = await runDemo(emailFrom, emailSubject, emailBody);
    displayResults(demo);
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
    } catch (_) {}
  });
}

// ═══════════════════════════════════════════════════════════════
//  AUTO-PROCESS MODE
// ═══════════════════════════════════════════════════════════════
async function setAutoMode(active) {
  const pill = $('autoPill');
  const dot  = $('autoDot');
  const label = $('autoLabel');

  if (active) {
    try {
      await fetch(`${API_URL}/auto-process/start`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval_seconds: 60 }),
        signal: AbortSignal.timeout(5000),
      });
    } catch (_) {}
    pill.classList.add('active');
    dot.classList.add('active');
    label.textContent = 'AUTO ON';
  } else {
    try {
      await fetch(`${API_URL}/auto-process/stop`, { method: 'DELETE', signal: AbortSignal.timeout(5000) });
    } catch (_) {}
    pill.classList.remove('active');
    dot.classList.remove('active');
    label.textContent = 'AUTO OFF';
  }
  chrome.storage.local.set({ autoMode: active });
}

function initAutoToggle() {
  const toggle = $('autoToggle');
  toggle.addEventListener('change', () => setAutoMode(toggle.checked));

  // Restore persisted auto mode
  chrome.storage.local.get(['autoMode'], async ({ autoMode }) => {
    if (autoMode) {
      toggle.checked = true;
      // Verify if backend is still running it
      try {
        const r = await fetch(`${API_URL}/auto-process/status`, { signal: AbortSignal.timeout(3000) });
        if (r.ok) {
          const d = await r.json();
          if (!d.running) await setAutoMode(true); // restart if server restarted
          else {
            $('autoPill').classList.add('active');
            $('autoDot').classList.add('active');
            $('autoLabel').textContent = 'AUTO ON';
          }
        }
      } catch (_) {}
    }
  });
}

// ═══════════════════════════════════════════════════════════════
//  WEBSOCKET LIVE FEED
// ═══════════════════════════════════════════════════════════════
function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (_) { return iso.slice(11,19); }
}

function addLiveEvent(event) {
  const feed = $('liveFeed');
  // Clear empty state
  if (feed.querySelector('.empty-state')) feed.innerHTML = '';

  const isActive = $('panel-live')?.classList.contains('active');

  // Increment badge if tab not visible
  if (!isActive) {
    liveCount++;
    const badge = $('liveBadge');
    badge.textContent = liveCount > 9 ? '9+' : liveCount;
    show(badge);
  }

  let icon = '📧', cls = '';
  if (event.type === 'email_processed')   { icon = '✅'; }
  if (event.type === 'auto_processed')    { icon = '🤖'; }
  if (event.type === 'auto_poll')         { icon = '🔍'; cls = 'auto-poll'; }
  if (event.type === 'auto_started')      { icon = '▶️'; }
  if (event.type === 'auto_stopped')      { icon = '⏹️'; }
  if (event.type === 'auto_error')        { icon = '❌'; cls = 'error-event'; }

  const div = document.createElement('div');
  div.className = `live-event ${cls}`;

  const subject = event.subject || event.data?.email_subject || event.type.replace(/_/g,' ');
  const cat   = event.category || event.data?.issue_category || '';
  const pri   = event.priority || event.data?.priority || '';
  const kb    = event.kb_match != null ? (event.kb_match ? '✓ KB' : '↗ Escalated') : '';
  const conf  = event.confidence != null ? `${event.confidence}%` : '';
  const time  = formatTime(event.timestamp || new Date().toISOString());

  div.innerHTML = `
    <span class="live-event-icon">${icon}</span>
    <div class="live-event-body">
      <div class="live-event-subject">${subject}</div>
      <div class="live-event-meta">
        ${cat ? `<span class="badge badge-category-${cat}">${cat}</span>` : ''}
        ${pri ? `<span class="badge badge-priority-${pri}">${pri}</span>` : ''}
        ${kb  ? `<span class="badge" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid rgba(16,185,129,0.3)">${kb}</span>` : ''}
        ${conf ? `<span style="font-size:9px;color:#818cf8">${conf} conf</span>` : ''}
        <span class="live-event-time">${time}</span>
      </div>
    </div>
  `;

  feed.insertBefore(div, feed.firstChild);

  // Keep max 50 events
  while (feed.children.length > 50) feed.removeChild(feed.lastChild);
}

function connectWebSocket() {
  const indicator = $('liveDotIndicator');
  const label     = $('liveConnLabel');

  if (wsConn && wsConn.readyState === WebSocket.OPEN) return;

  const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';

  try {
    wsConn = new WebSocket(wsUrl);

    wsConn.onopen = () => {
      indicator.className = 'live-dot-indicator connected';
      label.textContent = 'Connected';
    };

    wsConn.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'history_snapshot') {
          // Show recent items from backend on connect
          const feed = $('liveFeed');
          feed.innerHTML = '';
          (data.items || []).slice(0, 10).forEach((item) => {
            addLiveEvent({
              type: 'email_processed',
              subject: item.email_subject,
              category: item.issue_category,
              priority: item.priority,
              kb_match: item.kb_match_found,
              confidence: item.confidence_score,
              timestamp: item.processed_at,
            });
          });
        } else {
          addLiveEvent(data);
        }
        // Update SLA count when new email processed
        if (['email_processed','auto_processed'].includes(data.type)) {
          loadSLACount();
        }
      } catch (_) {}
    };

    wsConn.onerror = () => {
      indicator.className = 'live-dot-indicator error';
      label.textContent = 'Connection error';
    };

    wsConn.onclose = () => {
      indicator.className = 'live-dot-indicator';
      label.textContent = 'Disconnected';
      wsConn = null;
    };
  } catch (_) {
    indicator.className = 'live-dot-indicator error';
    label.textContent = 'WebSocket unavailable';
  }
}

// ═══════════════════════════════════════════════════════════════
//  HISTORY TAB
// ═══════════════════════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch (_) { return iso.slice(0,16).replace('T',' '); }
}

async function loadHistory() {
  const c = $('historyList');
  c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
  let items = [];
  try {
    const r = await fetch(`${API_URL}/history`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) items = (await r.json()).items || [];
  } catch (_) {}

  if (!items.length) {
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>No emails processed yet</p></div>';
    return;
  }

  c.innerHTML = '';
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-subject" title="${item.email_subject||''}">${item.email_subject||'(no subject)'}</span>
        <span class="history-time">${formatDate(item.processed_at)}</span>
      </div>
      <div class="history-meta">
        <span class="history-from">${item.email_from||''}</span>
        <span class="badge badge-category-${item.issue_category||'unknown'}">${item.issue_category||'—'}</span>
        <span class="badge badge-priority-${item.priority||'medium'}">${item.priority||'—'}</span>
        ${item.confidence_score != null ? `<span style="font-size:9px;color:#818cf8">${item.confidence_score}% conf</span>` : ''}
      </div>
      <div class="history-body">${item.draft_reply||'(no reply)'}</div>
    `;
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    c.appendChild(card);
  });
}

// ═══════════════════════════════════════════════════════════════
//  ANALYTICS TAB
// ═══════════════════════════════════════════════════════════════
function renderDonut(categories) {
  const donut  = $('donutChart');
  const legend = $('donutLegend');
  const total  = Object.values(categories).reduce((a,b) => a+b, 0);
  if (!total) { donut.style.background = 'var(--surface-3)'; legend.innerHTML = '<span style="color:var(--text-3);font-size:11px">No data</span>'; return; }
  const entries = Object.entries(categories).sort((a,b) => b[1]-a[1]);
  let cumPct = 0;
  const segs = entries.map(([k,v]) => {
    const p = (v/total)*100;
    const from = cumPct; cumPct += p;
    return `${PALETTE[k]||'#6366f1'} ${from.toFixed(1)}% ${cumPct.toFixed(1)}%`;
  });
  donut.style.background = `conic-gradient(${segs.join(', ')})`;
  legend.innerHTML = entries.map(([k,v]) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${PALETTE[k]||'#6366f1'}"></span>
      <span>${k}</span>
      <span class="legend-pct">${Math.round((v/total)*100)}%</span>
    </div>`).join('');
}

function renderBarChart(id, data) {
  const el = $(id);
  const total = Object.values(data).reduce((a,b) => a+b, 0);
  if (!total) { el.innerHTML = '<span style="color:var(--text-3);font-size:11px">No data</span>'; return; }
  el.innerHTML = Object.entries(data).sort((a,b) => b[1]-a[1]).map(([k,v]) => `
    <div class="bar-row">
      <span class="bar-label">${k}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((v/total)*100)}%;background:${PALETTE[k]||'#6366f1'}"></div></div>
      <span class="bar-count">${v}</span>
    </div>`).join('');
}

async function loadAnalytics() {
  let data = null;
  try {
    const r = await fetch(`${API_URL}/analytics`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) data = await r.json();
  } catch (_) {}
  if (!data) return;
  $('kpiKBRate').textContent    = `${data.kb_hit_rate ?? 0}%`;
  $('kpiTickets').textContent   = data.tickets_created ?? 0;
  $('kpiConfidence').textContent = `${data.avg_confidence ?? 0}%`;
  renderDonut(data.categories || {});
  renderBarChart('barSentiment', data.sentiments || {});
  renderBarChart('barPriority',  data.priorities  || {});
  await loadSLACount();
}

// ═══════════════════════════════════════════════════════════════
//  KB GAPS TAB + ARTICLE GENERATOR
// ═══════════════════════════════════════════════════════════════
async function generateArticle(gap, btn, resultEl) {
  btn.disabled = true;
  btn.textContent = '⏳ Generating…';
  resultEl.className = 'article-result';
  resultEl.textContent = '';
  show(resultEl);
  try {
    const r = await fetch(`${API_URL}/generate-kb-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject: gap.subject,
        keywords: gap.keywords || [],
        description: gap.email_body || gap.subject,
        issue_id: gap.issue_id,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`Server ${r.status}`);
    const d = await r.json();
    if (d.notion_pushed && d.notion_url) {
      resultEl.className = 'article-result ok';
      resultEl.innerHTML = `✅ Article pushed to Notion! <a href="${d.notion_url}" target="_blank" style="color:var(--success)">Open →</a>`;
    } else if (d.success) {
      resultEl.className = 'article-result ok';
      resultEl.textContent = `✅ Article generated (${d.word_count} words). ${d.notion_error ? 'Notion: ' + d.notion_error : ''}`;
    } else {
      throw new Error(d.error || 'Unknown error');
    }
    btn.textContent = '✓ Done';
  } catch (err) {
    resultEl.className = 'article-result fail';
    resultEl.textContent = `❌ ${err.message}`;
    btn.disabled = false;
    btn.textContent = '📝 Generate + Push to Notion';
  }
}

async function loadGaps() {
  const c = $('gapsList');
  c.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div><p>Loading…</p></div>';
  let gaps = [];
  try {
    const r = await fetch(`${API_URL}/kb-gaps`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) gaps = (await r.json()).gaps || [];
  } catch (_) {}

  if (!gaps.length) {
    c.innerHTML = '<div class="empty-state"><div class="empty-icon">🎉</div><p>No KB gaps — great coverage!</p></div>';
    return;
  }

  c.innerHTML = '';
  gaps.forEach((gap) => {
    const card = document.createElement('div');
    card.className = 'gap-card';
    const kws = (gap.keywords||[]).map((k) => `<span class="kw-chip">${k}</span>`).join('');
    const articleResultId = `art-${gap.issue_id}`;
    card.innerHTML = `
      <div class="gap-card-header">
        <span class="gap-issue-id">#${gap.issue_id}</span>
        <span class="gap-subject" title="${gap.subject||''}">${gap.subject||'Unknown'}</span>
      </div>
      <div class="gap-meta">
        <span class="badge badge-priority-${gap.priority||'medium'}">${gap.priority||'medium'}</span>
        <span class="gap-time">${formatDate(gap.created_at)}</span>
        ${gap.issue_url && gap.issue_url !== '#'
          ? `<a class="gap-open-btn" href="${gap.issue_url}" target="_blank" rel="noopener">↗ GitHub</a>`
          : ''}
      </div>
      ${kws ? `<div class="gap-keywords">${kws}</div>` : ''}
      <button class="btn-gen-article" id="gen-${gap.issue_id}">📝 Generate + Push to Notion</button>
      <div class="article-result hidden" id="${articleResultId}"></div>
    `;
    c.appendChild(card);

    // Wire up generate button
    const btn = document.getElementById(`gen-${gap.issue_id}`);
    const resultEl = document.getElementById(articleResultId);
    btn.addEventListener('click', () => generateArticle(gap, btn, resultEl));
  });
}

// ═══════════════════════════════════════════════════════════════
//  SETTINGS TAB
// ═══════════════════════════════════════════════════════════════
function initSettings() {
  chrome.storage.local.get(['apiUrl'], ({ apiUrl }) => {
    if (apiUrl) { API_URL = apiUrl; $('settingsUrl').value = apiUrl; }
  });

  $('settingsUrl').addEventListener('blur', () => {
    const url = $('settingsUrl').value.trim().replace(/\/$/, '');
    if (url) { API_URL = url; chrome.storage.local.set({ apiUrl: url }); }
  });

  $('btnTestConn').addEventListener('click', async () => {
    const r = $('connResult');
    r.textContent = 'Testing…'; r.className = 'conn-result'; show(r);
    const ok = await checkConnection();
    r.textContent = ok ? '✅ Connected to backend' : '❌ Cannot reach backend';
    r.className = `conn-result ${ok ? 'ok' : 'fail'}`;
  });

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
  const { pendingText, pendingTextTime } = await chrome.storage.local.get(['pendingText','pendingTextTime']);
  if (pendingText && pendingTextTime && (Date.now() - pendingTextTime) < 120_000) {
    $('emailBody').value = pendingText;
    show($('pendingBanner'));
    await chrome.storage.local.remove(['pendingText','pendingTextTime']);
    chrome.runtime.sendMessage({ type: 'CLEAR_BADGE' });
  }
}

$('btnClearPending')?.addEventListener('click', () => { $('emailBody').value = ''; hide($('pendingBanner')); });

// ── Refresh buttons ───────────────────────────────────────────
$('btnRefreshHistory')?.addEventListener('click',  loadHistory);
$('btnRefreshAnalytics')?.addEventListener('click', loadAnalytics);
$('btnRefreshGaps')?.addEventListener('click',     loadGaps);

// ── Process button ────────────────────────────────────────────
$('btnProcess').addEventListener('click', processEmail);

// ═══════════════════════════════════════════════════════════════
//  INITIALISE
// ═══════════════════════════════════════════════════════════════
(async () => {
  const stored = await chrome.storage.local.get(['metrics', 'apiUrl']);
  if (stored.metrics) { metrics = stored.metrics; }
  if (stored.apiUrl)  { API_URL = stored.apiUrl; $('settingsUrl').value = stored.apiUrl; }

  renderMetrics();
  await checkPendingText();
  await checkConnection();
  await loadSLACount();

  initTabs();
  initSettings();
  initCopyDraft();
  initAutoToggle();
})();
