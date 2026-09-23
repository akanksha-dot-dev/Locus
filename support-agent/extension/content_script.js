/**
 * AI Support Agent — Gmail Content Script
 *
 * Injects an AI processing button directly into Gmail's email view.
 * When clicked:
 *   1. Reads sender / subject / body from the Gmail DOM
 *   2. Sends to the local FastAPI backend
 *   3. Shows a toast notification with classification + reply preview
 *   4. Offers one-click reply injection into Gmail's compose box
 *
 * Uses MutationObserver to watch Gmail's SPA navigation without
 * blocking the main thread.
 */

(function () {
  'use strict';

  // ── Config ─────────────────────────────────────────────────
  const API_URL = 'http://localhost:8000';
  const BUTTON_CLASS = 'ai-agent-process-btn';
  const TOAST_ID = 'ai-agent-toast-overlay';

  // ── Inject stylesheet ──────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* AI Support Agent — injected styles */
    .${BUTTON_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.02em;
      box-shadow: 0 2px 8px rgba(99,102,241,0.4);
      transition: opacity 0.15s, transform 0.15s, box-shadow 0.15s;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      vertical-align: middle;
      margin-left: 8px;
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }
    .${BUTTON_CLASS}:hover {
      opacity: 0.9;
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99,102,241,0.5);
    }
    .${BUTTON_CLASS}:active { transform: translateY(0); }
    .${BUTTON_CLASS}.processing {
      opacity: 0.7;
      cursor: wait;
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
    }
    .${BUTTON_CLASS} .btn-spinner {
      width: 10px; height: 10px;
      border: 2px solid rgba(255,255,255,0.4);
      border-top-color: white;
      border-radius: 50%;
      animation: ai-spin 0.7s linear infinite;
      display: none;
    }
    .${BUTTON_CLASS}.processing .btn-spinner { display: block; }
    .${BUTTON_CLASS}.processing .btn-label { display: none; }
    @keyframes ai-spin { to { transform: rotate(360deg); } }

    /* Toast overlay */
    #${TOAST_ID} {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 360px;
      background: #13132a;
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 14px;
      padding: 0;
      z-index: 99999;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      overflow: hidden;
      animation: ai-slide-in 0.25s cubic-bezier(0.4,0,0.2,1);
    }
    @keyframes ai-slide-in {
      from { opacity: 0; transform: translateX(20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .ai-toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px 8px;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      border-bottom: 1px solid rgba(99,102,241,0.3);
    }
    .ai-toast-title {
      color: white;
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .ai-toast-close {
      color: rgba(255,255,255,0.5);
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
      padding: 0 4px;
    }
    .ai-toast-close:hover { color: white; }
    .ai-toast-body { padding: 12px 14px; }
    .ai-badge-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }
    .ai-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .ai-badge-known     { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
    .ai-badge-unknown   { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .ai-badge-urgent    { background: rgba(239,68,68,0.2);   color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
    .ai-badge-high      { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
    .ai-badge-critical  { background: rgba(239,68,68,0.2);   color: #ef4444; border: 1px solid rgba(239,68,68,0.4); }
    .ai-badge-medium    { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
    .ai-badge-low       { background: rgba(100,116,139,0.2); color: #94a3b8; border: 1px solid rgba(100,116,139,0.3); }
    .ai-badge-frustrated{ background: rgba(239,68,68,0.2);   color: #fca5a5; border: 1px solid rgba(239,68,68,0.4); }
    .ai-badge-neutral   { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.3); }
    .ai-toast-reply {
      font-size: 11px;
      color: #cbd5e1;
      background: #0b0b18;
      border-radius: 8px;
      padding: 8px 10px;
      max-height: 80px;
      overflow-y: auto;
      white-space: pre-wrap;
      line-height: 1.5;
      border: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 10px;
    }
    .ai-toast-actions {
      display: flex;
      gap: 7px;
    }
    .ai-inject-btn {
      flex: 1;
      padding: 7px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .ai-inject-btn:hover { opacity: 0.9; }
    .ai-copy-btn {
      padding: 7px 12px;
      background: transparent;
      color: #818cf8;
      border: 1px solid rgba(99,102,241,0.35);
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .ai-copy-btn:hover { background: rgba(99,102,241,0.1); }
    .ai-conf-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
    }
    .ai-conf-label { font-size: 10px; color: #64748b; }
    .ai-conf-track {
      flex: 1;
      height: 4px;
      background: rgba(255,255,255,0.08);
      border-radius: 2px;
      overflow: hidden;
    }
    .ai-conf-fill {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #a855f7);
      border-radius: 2px;
      transition: width 0.6s ease;
    }
    .ai-conf-pct { font-size: 10px; color: #818cf8; font-weight: 700; }
    .ai-sla-tag {
      font-size: 9px;
      padding: 2px 7px;
      border-radius: 10px;
      background: rgba(245,158,11,0.1);
      color: #f59e0b;
      border: 1px solid rgba(245,158,11,0.25);
    }
    .ai-toast-error {
      padding: 12px 14px;
      color: #fca5a5;
      font-size: 12px;
    }
  `;
  document.head.appendChild(style);

  // ── Gmail DOM helpers ──────────────────────────────────────
  function extractEmailData(emailEl) {
    // Sender email — try multiple attribute patterns Gmail uses
    const senderEl = (
      emailEl.querySelector('[email]') ||
      emailEl.querySelector('.gD') ||
      emailEl.querySelector('.go .gD')
    );
    const sender = (
      senderEl?.getAttribute('email') ||
      senderEl?.dataset?.hovercard?.match(/email=([^&]+)/)?.[1] ||
      senderEl?.textContent?.trim() ||
      ''
    );

    // Subject — global to the thread, not individual email
    const subjectEl = (
      document.querySelector('h2.hP') ||
      document.querySelector('.hP') ||
      document.querySelector('[data-thread-perm-id] h2')
    );
    const subject = subjectEl?.textContent?.trim() || document.title.replace(' - Gmail', '') || '';

    // Body — the .a3s.aiL class is the main message body
    const bodyEl = (
      emailEl.querySelector('.a3s.aiL') ||
      emailEl.querySelector('.a3s') ||
      emailEl.querySelector('.ii.gt div') ||
      emailEl.querySelector('[data-message-id]')
    );
    const body = bodyEl?.innerText?.trim() || bodyEl?.textContent?.trim() || '';

    return { sender, subject, body };
  }

  // ── Toast management ───────────────────────────────────────
  function removeToast() {
    document.getElementById(TOAST_ID)?.remove();
  }

  function showToast(result, emailData) {
    removeToast();

    const sla = result.sla_deadline_hours
      ? `SLA: ${result.sla_deadline_hours}h`
      : '';

    const conf = result.confidence_score ?? null;
    const bestReply = result.reply_variants?.[0]?.text || result.draft_reply || '';

    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.innerHTML = `
      <div class="ai-toast-header">
        <div class="ai-toast-title">
          <span>⚡</span>
          <span>AI Support Agent</span>
        </div>
        <button class="ai-toast-close" id="ai-toast-close-btn">✕</button>
      </div>
      <div class="ai-toast-body">
        <div class="ai-badge-row">
          <span class="ai-badge ai-badge-${result.issue_category}">${result.issue_category}</span>
          <span class="ai-badge ai-badge-${result.sentiment}">${result.sentiment}</span>
          <span class="ai-badge ai-badge-${result.priority}">${result.priority}</span>
          ${result.kb_match_found ? '<span class="ai-badge ai-badge-known">✓ KB Hit</span>' : '<span class="ai-badge ai-badge-unknown">KB Gap</span>'}
          ${sla ? `<span class="ai-sla-tag">${sla}</span>` : ''}
        </div>
        ${conf !== null ? `
        <div class="ai-conf-bar">
          <span class="ai-conf-label">Confidence</span>
          <div class="ai-conf-track">
            <div class="ai-conf-fill" style="width:${conf}%"></div>
          </div>
          <span class="ai-conf-pct">${conf}%</span>
        </div>` : ''}
        <div class="ai-toast-reply" id="ai-draft-text">${bestReply}</div>
        <div class="ai-toast-actions">
          <button class="ai-inject-btn" id="ai-inject-reply-btn">
            ↩ Inject Reply into Compose
          </button>
          <button class="ai-copy-btn" id="ai-copy-reply-btn">Copy</button>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Close button
    document.getElementById('ai-toast-close-btn').addEventListener('click', removeToast);

    // Copy button
    document.getElementById('ai-copy-reply-btn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(bestReply);
        document.getElementById('ai-copy-reply-btn').textContent = '✓ Copied';
        setTimeout(() => {
          const btn = document.getElementById('ai-copy-reply-btn');
          if (btn) btn.textContent = 'Copy';
        }, 1800);
      } catch (_) {}
    });

    // Inject reply into compose
    document.getElementById('ai-inject-reply-btn').addEventListener('click', () => {
      injectReply(bestReply, emailData.subject);
    });

    // Auto-dismiss after 30 seconds
    setTimeout(removeToast, 30_000);
  }

  function showErrorToast(message) {
    removeToast();
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.innerHTML = `
      <div class="ai-toast-header">
        <div class="ai-toast-title"><span>⚡</span><span>AI Support Agent</span></div>
        <button class="ai-toast-close" id="ai-toast-close-btn">✕</button>
      </div>
      <div class="ai-toast-error">❌ ${message}</div>
    `;
    document.body.appendChild(toast);
    document.getElementById('ai-toast-close-btn')?.addEventListener('click', removeToast);
    setTimeout(removeToast, 8_000);
  }

  // ── Reply injection into Gmail compose ────────────────────
  function injectReply(replyText, subject) {
    // Click the Reply button to open the compose box if not already open
    const replyBtn = (
      document.querySelector('[data-tooltip="Reply"]') ||
      document.querySelector('span[data-action-label="Reply"]') ||
      document.querySelector('.ams.bkH') ||
      document.querySelector('[aria-label="Reply"]')
    );

    if (replyBtn) {
      replyBtn.click();
      // Wait for compose to open, then fill
      setTimeout(() => fillComposeBox(replyText), 600);
    } else {
      // Compose may already be open
      fillComposeBox(replyText);
    }
  }

  function fillComposeBox(text) {
    // Gmail compose box selectors (multiple fallbacks)
    const composeEl = (
      document.querySelector('div[contenteditable="true"].Am.Al.editable') ||
      document.querySelector('.Am.Al.editable[contenteditable="true"]') ||
      document.querySelector('[contenteditable="true"][aria-label="Message Body"]') ||
      document.querySelector('.editable.LW-avf')
    );

    if (!composeEl) {
      showErrorToast('Could not find the Gmail compose box. Please click Reply first, then try again.');
      return;
    }

    // Focus and clear, then insert text
    composeEl.focus();
    // Use execCommand for reliable cross-browser text insertion
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    document.execCommand('insertText', false, text);

    // Dispatch input event so Gmail recognizes the change
    composeEl.dispatchEvent(new Event('input', { bubbles: true }));
    composeEl.dispatchEvent(new Event('change', { bubbles: true }));

    // Close toast after successful injection
    setTimeout(removeToast, 500);
  }

  // ── Process email via backend ──────────────────────────────
  async function processEmail(emailEl, btn) {
    const data = extractEmailData(emailEl);

    if (!data.body || !data.subject) {
      showErrorToast('Could not read email content. Try expanding the email first.');
      return;
    }

    // Set button loading state
    btn.classList.add('processing');
    btn.disabled = true;

    try {
      const resp = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_from: data.sender,
          email_subject: data.subject,
          email_body: data.body,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const result = await resp.json();
      showToast(result, data);

    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        showErrorToast('Request timed out. Is the AI Agent server running? (localhost:8000)');
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        showErrorToast('Cannot reach AI Agent server. Start it with: python server.py');
      } else {
        showErrorToast(`Error: ${err.message}`);
      }
    } finally {
      btn.classList.remove('processing');
      btn.disabled = false;
    }
  }

  // ── Button injection ───────────────────────────────────────
  function injectButton(emailEl) {
    // Don't double-inject
    if (emailEl.querySelector(`.${BUTTON_CLASS}`)) return;

    // Ensure it's actually an expanded (readable) email
    if (!emailEl.querySelector('.a3s') && !emailEl.querySelector('.ii.gt')) return;

    // Find the best injection point — the email header area
    const headerArea = (
      emailEl.querySelector('.ade') ||
      emailEl.querySelector('.hl') ||
      emailEl.querySelector('.adn-btn-bar') ||
      emailEl.querySelector('.amn')
    );

    if (!headerArea) return;

    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.title = 'Process this email with AI Support Agent';
    btn.innerHTML = `
      <div class="btn-spinner"></div>
      <span class="btn-label">⚡ AI Process</span>
    `;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      processEmail(emailEl, btn);
    });

    headerArea.appendChild(btn);
  }

  // ── Scan for new email views ───────────────────────────────
  function scanForEmails() {
    // Gmail expanded emails have class .adn.ads or .adn with expanded state
    const emailEls = document.querySelectorAll('.adn.ads, .adn[data-message-id]');
    emailEls.forEach(injectButton);
  }

  // ── MutationObserver — watch Gmail's SPA navigation ───────
  let scanTimeout = null;
  const observer = new MutationObserver(() => {
    // Debounce: scan after DOM settles
    clearTimeout(scanTimeout);
    scanTimeout = setTimeout(scanForEmails, 400);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan
  scanForEmails();

  console.log('[AI Support Agent] Gmail content script loaded');
})();
