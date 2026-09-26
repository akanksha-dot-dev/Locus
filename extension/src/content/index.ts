/**
 * Locus Content Script — Jira, GitHub & Calendar Context Extractor & In-Page Co-Pilot
 * Bundled strictly as an IIFE (isolated, no external module imports).
 * Detects Jira tickets, GitHub PRs/Issues, and Calendar events, and provides
 * a non-intrusive, Shadow-DOM encapsulated floating co-pilot.
 */

(function () {
  let lastDetectedUrl = '';

  function extractJiraContext(): { id: string; title: string } | null {
    let key = '';
    const urlMatch =
      window.location.pathname.match(/\/browse\/([A-Z0-9]+-\d+)/i) ||
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
    // 1. Check Pull Request
    const prMatch = window.location.pathname.match(/\/pull\/(\d+)/i);
    if (prMatch && prMatch[1]) {
      const prNumber = `#${prMatch[1]}`;
      const titleEl =
        document.querySelector('.gh-header-title .js-issue-title') ||
        document.querySelector('bdi.js-issue-title') ||
        document.querySelector('h1.gh-header-title');
      const title = titleEl?.textContent?.trim() || document.title.replace(/by \w+ · Pull Request #\d+.*$/i, '').trim();
      return { id: prNumber, title: title || `PR ${prNumber}` };
    }

    // 2. Check Issue
    const issueMatch = window.location.pathname.match(/\/issues\/(\d+)/i);
    if (issueMatch && issueMatch[1]) {
      const issueNumber = `#${issueMatch[1]}`;
      const titleEl =
        document.querySelector('.gh-header-title .js-issue-title') ||
        document.querySelector('bdi.js-issue-title') ||
        document.querySelector('h1.gh-header-title');
      const title = titleEl?.textContent?.trim() || document.title.replace(/· Issue #\d+.*$/i, '').trim();
      return { id: issueNumber, title: title || `Issue ${issueNumber}` };
    }

    return null;
  }

  function extractGoogleCalendarContext(): { id: string; title: string } | null {
    const dialog = document.querySelector('div[role="dialog"]');
    if (dialog) {
      const titleEl = dialog.querySelector('span[role="heading"]') || dialog.querySelector('h2');
      if (titleEl && titleEl.textContent) {
        return { id: 'GCAL', title: titleEl.textContent.trim() };
      }
    }
    return null;
  }

  function extractNotionContext(): { id: string; title: string } | null {
    const titleEl = document.querySelector('.notion-page-block [contenteditable="true"]') ||
                    document.querySelector('.notion-page-content h1') ||
                    document.querySelector('h1.notion-header');
    const title = titleEl?.textContent?.trim() || document.title.replace(/ · Notion$/i, '').trim();
    if (title && title !== 'Untitled') {
      return { id: 'NOTION', title };
    }
    return null;
  }

  function extractLinearContext(): { id: string; title: string } | null {
    const match = window.location.pathname.match(/\/issue\/([A-Z0-9]+-\d+)/i);
    const key = match ? match[1] : '';
    const titleEl = document.querySelector('h1') || document.querySelector('[data-testid="issue-title"]');
    const title = titleEl?.textContent?.trim() || document.title.replace(/ · Linear$/i, '').trim();
    if (key || (title && title !== 'Linear')) {
      return { id: key || 'LINEAR', title: title || key || 'Linear Issue' };
    }
    return null;
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
    } else if (hostname.includes('calendar.google.com')) {
      const gcalCtx = extractGoogleCalendarContext();
      if (gcalCtx) {
        detected = {
          source: 'jira',
          id: gcalCtx.id,
          title: gcalCtx.title,
          url: currentUrl,
        };
      }
    } else if (hostname.includes('notion.so')) {
      const notionCtx = extractNotionContext();
      if (notionCtx) {
        detected = {
          source: 'jira',
          id: notionCtx.id,
          title: notionCtx.title,
          url: currentUrl,
        };
      }
    } else if (hostname.includes('linear.app')) {
      const linearCtx = extractLinearContext();
      if (linearCtx) {
        detected = {
          source: 'jira',
          id: linearCtx.id,
          title: linearCtx.title,
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

    let isMinimized = false;

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
        .pill-container.minimized {
          padding: 8px;
          border-radius: 50%;
          cursor: pointer;
        }
        .pill-container.minimized .content-wrapper {
          display: none;
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
          flex-shrink: 0;
        }
        .content-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
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
          max-width: 170px;
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
        .btn-minimize {
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          line-height: 1;
        }
        .btn-minimize:hover {
          color: #f3f4f6;
        }
      </style>
      <div class="pill-container" id="locus-pill" title="Locus Day Planner Co-Pilot">
        <div class="brand-dot"></div>
        <div class="content-wrapper">
          <span class="brand-title">LOCUS</span>
          <span class="context-tag">${detected.id}</span>
          <span class="title-text" title="${detected.title}">${detected.title}</span>
          <button class="btn-add" id="btn-insert-plan">⚡ Add Task</button>
          <button class="btn-add" id="btn-open-panel" style="background: rgba(255, 255, 255, 0.14); color: #f3f4f6; border: 1px solid rgba(255, 255, 255, 0.2);">Side Panel</button>
          <button class="btn-minimize" id="btn-minimize" title="Minimize">─</button>
          <button class="btn-minimize" id="btn-dismiss" title="Dismiss">✕</button>
        </div>
      </div>
    `;

    const btnAdd = shadow.getElementById('btn-insert-plan');
    const btnPanel = shadow.getElementById('btn-open-panel');
    const btnMinimize = shadow.getElementById('btn-minimize');
    const btnClose = shadow.getElementById('btn-dismiss');
    const pill = shadow.getElementById('locus-pill');

    btnPanel?.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' });
    });

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

    btnMinimize?.addEventListener('click', (e) => {
      e.stopPropagation();
      isMinimized = !isMinimized;
      if (pill) {
        if (isMinimized) {
          pill.classList.add('minimized');
        } else {
          pill.classList.remove('minimized');
        }
      }
    });

    pill?.addEventListener('click', () => {
      if (isMinimized) {
        isMinimized = false;
        pill.classList.remove('minimized');
      }
    });

    btnClose?.addEventListener('click', (e) => {
      e.stopPropagation();
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
