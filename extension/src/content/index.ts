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
    }
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
