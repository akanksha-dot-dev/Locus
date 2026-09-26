/**
 * Locus Content Script — Jira & GitHub Context Extractor
 * Bundled strictly as an IIFE (isolated, no external module imports).
 * Detects Jira ticket or GitHub PR in active tab and transmits to background worker.
 */

(function () {
  let lastDetectedUrl = '';

  function extractJiraContext(): { id: string; title: string } | null {
    // 1. Extract Key from URL or DOM
    let key = '';
    const urlMatch = window.location.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i) ||
                     window.location.search.match(/selectedIssue=([A-Z0-9]+-\d+)/i);
    if (urlMatch && urlMatch[1]) {
      key = urlMatch[1];
    } else {
      const keyEl =
        document.querySelector('[data-testid="issue.views.issue-base.foundation.breadcrumbs.current-issue.item"]') ||
        document.querySelector('a[data-testid="issue-key"]') ||
        document.querySelector('#key-val');
      if (keyEl && keyEl.textContent) {
        key = keyEl.textContent.trim();
      }
    }

    if (!key) return null;

    // 2. Extract Summary/Title
    let title = '';
    const titleEl =
      document.querySelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]') ||
      document.querySelector('h1[data-test-id="issue.views.issue-base.foundation.summary.heading"]') ||
      document.querySelector('#summary-val') ||
      document.querySelector('h1');

    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    } else {
      title = document.title.replace(` - ${key}`, '').replace(' - Jira', '').trim();
    }

    return { id: key, title: title || key };
  }

  function extractGitHubContext(): { id: string; title: string } | null {
    // Check if on a Pull Request page
    const prMatch = window.location.pathname.match(/\/pull\/(\d+)/i);
    if (!prMatch || !prMatch[1]) return null;

    const prNumber = `#${prMatch[1]}`;

    // Extract PR title
    let title = '';
    const titleEl =
      document.querySelector('.gh-header-title .js-issue-title') ||
      document.querySelector('bdi.js-issue-title') ||
      document.querySelector('h1.gh-header-title');

    if (titleEl && titleEl.textContent) {
      title = titleEl.textContent.trim();
    } else {
      title = document.title.replace(/by \w+ · Pull Request #\d+.*$/i, '').trim();
    }

    return { id: prNumber, title: title || `PR ${prNumber}` };
  }

  function inspectPage(): void {
    const currentUrl = window.location.href;
    if (currentUrl === lastDetectedUrl) return;

    const hostname = window.location.hostname;
    let detected: { source: 'jira' | 'github'; id: string; title: string; url: string } | null = null;

    if (hostname.includes('atlassian.net') || hostname.includes('jira')) {
      const jiraCtx = extractJiraContext();
      if (jiraCtx) {
        detected = {
          source: 'jira',
          id: jiraCtx.id,
          title: jiraCtx.title,
          url: currentUrl,
        };
      }
    } else if (hostname.includes('github.com')) {
      const ghCtx = extractGitHubContext();
      if (ghCtx) {
        detected = {
          source: 'github',
          id: ghCtx.id,
          title: ghCtx.title,
          url: currentUrl,
        };
      }
    }

    if (detected) {
      lastDetectedUrl = currentUrl;
      console.log('[Locus Content] Detected context:', detected);
      try {
        chrome.runtime.sendMessage({
          type: 'CONTEXT_DETECTED',
          payload: {
            ...detected,
            timestamp: Date.now(),
          },
        });
      } catch (err) {
        console.warn('[Locus Content] Message send failed (worker may be sleeping):', err);
      }
      renderCoPilotPill(detected);
    }
  }

  function renderCoPilotPill(detected: { source: 'jira' | 'github'; id: string; title: string; url: string }): void {
    let hostEl = document.getElementById('locus-copilot-host');
    if (!hostEl) {
      hostEl = document.createElement('div');
      hostEl.id = 'locus-copilot-host';
      document.body.appendChild(hostEl);
    }

    let shadow = hostEl.shadowRoot;
    if (!shadow) {
      shadow = hostEl.attachShadow({ mode: 'open' });
    }

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .pill-container {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(15, 16, 17, 0.94);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(6, 182, 212, 0.4);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(6, 182, 212, 0.25);
          border-radius: 9999px;
          padding: 6px 14px 6px 10px;
          color: #f3f4f6;
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        @keyframes slide-in {
          from { transform: translateY(20px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .brand-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #06b6d4;
          box-shadow: 0 0 8px #06b6d4;
        }
        .brand-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #06b6d4;
        }
        .context-tag {
          font-size: 10px;
          font-weight: 600;
          font-family: Menlo, monospace;
          padding: 2px 6px;
          border-radius: 4px;
          background: ${detected.source === 'jira' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(6, 182, 212, 0.2)'};
          color: ${detected.source === 'jira' ? '#818cf8' : '#22d3ee'};
          border: 1px solid ${detected.source === 'jira' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(6, 182, 212, 0.4)'};
        }
        .title-text {
          font-size: 11px;
          font-weight: 500;
          max-width: 180px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #e5e7eb;
        }
        .btn-add {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #06b6d4;
          color: #08090a;
          font-size: 11px;
          font-weight: 700;
          border: none;
          border-radius: 9999px;
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add:hover {
          background: #22d3ee;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
        }
        .btn-close {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
        }
        .btn-close:hover {
          color: #f3f4f6;
        }
      </style>
      <div class="pill-container" id="locus-pill">
        <div class="brand-dot"></div>
        <span class="brand-title">LOCUS</span>
        <span class="context-tag">${detected.id}</span>
        <span class="title-text" title="${detected.title}">${detected.title}</span>
        <button class="btn-add" id="btn-insert-plan">⚡ Add to Day Plan</button>
        <button class="btn-close" id="btn-dismiss" title="Dismiss">✕</button>
      </div>
    `;

    const btnAdd = shadow.getElementById('btn-insert-plan');
    const btnClose = shadow.getElementById('btn-dismiss');
    const pill = shadow.getElementById('locus-pill');

    btnAdd?.addEventListener('click', () => {
      if (btnAdd) {
        btnAdd.textContent = '✓ Scheduled!';
        btnAdd.setAttribute('style', 'background: #10b981; color: #08090a;');
      }
      chrome.runtime.sendMessage({
        type: 'SYNC_REQUEST',
        payload: { userRequest: `Prioritize ${detected.id}: ${detected.title}` },
      });
      setTimeout(() => {
        if (pill) pill.style.opacity = '0';
        setTimeout(() => hostEl?.remove(), 300);
      }, 1600);
    });

    btnClose?.addEventListener('click', () => {
      if (pill) pill.style.opacity = '0';
      setTimeout(() => hostEl?.remove(), 250);
    });
  }

  // Initial check
  inspectPage();

  // Watch for SPA transitions via MutationObserver
  let debounceTimer: any = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      inspectPage();
    }, 500);
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });
  }
})();
