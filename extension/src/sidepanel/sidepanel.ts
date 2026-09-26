/**
 * Locus Docked Side Panel Companion Logic
 * Manages 24h day plan timeline, Jira/GitHub workloads, and quick-prompt day planning
 */

import {
  GitHubPR,
  JiraTicket,
  ScheduleBlock,
  StorageState,
  Verdict,
  normalizeVerdict,
} from '../types/index';
import { downloadIcsFile } from '../services/icalendar';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const timelineList = document.getElementById('timeline-list');
  const jiraList = document.getElementById('jira-list');
  const githubList = document.getElementById('github-list');

  const countTimeline = document.getElementById('count-timeline');
  const countJira = document.getElementById('count-jira');
  const countGithub = document.getElementById('count-github');

  const offlineBanner = document.getElementById('sidepanel-offline-banner');
  const contextBar = document.getElementById('detected-context-bar');
  const contextSourceBadge = document.getElementById('context-source-badge');
  const contextTitle = document.getElementById('context-title');
  const btnContextPlan = document.getElementById('btn-context-plan');

  const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
  const btnPromptSend = document.getElementById('btn-prompt-send');

  const footerVerdict = document.getElementById('footer-verdict');
  const footerCityWeather = document.getElementById('footer-city-weather');
  const footerSynced = document.getElementById('footer-synced');

  const btnSync = document.getElementById('btn-sidepanel-sync');
  const btnExportIcs = document.getElementById('btn-export-ics');
  const btnOpenNotion = document.getElementById('btn-open-notion');

  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const tabPanes = document.querySelectorAll<HTMLElement>('.tab-pane');

  // Tab switching
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`pane-${target}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Render Full State
  function render(state: Partial<StorageState>): void {
    const res = state.lastResponse;
    const blocks: ScheduleBlock[] = state.scheduleBlocks || [];
    const jiraTickets: JiraTicket[] = res?.jira_tickets || [];
    const githubPrs: GitHubPR[] = res?.github_prs || [];
    const isOffline = Boolean(state.isOffline);
    const activeCtx = state.activeContext;

    // 1. Offline Banner
    if (offlineBanner) {
      offlineBanner.style.display = isOffline ? 'flex' : 'none';
    }

    // 2. Detected Context Bar
    if (contextBar && contextSourceBadge && contextTitle) {
      if (activeCtx) {
        contextBar.style.display = 'flex';
        contextSourceBadge.textContent = activeCtx.source.toUpperCase();
        contextSourceBadge.className = `badge ${activeCtx.source === 'jira' ? 'badge-wfh' : 'badge-hybrid'}`;
        contextTitle.textContent = `${activeCtx.id}: ${activeCtx.title}`;
      } else {
        contextBar.style.display = 'none';
      }
    }

    // 3. Counts
    if (countTimeline) countTimeline.textContent = String(blocks.length);
    if (countJira) countJira.textContent = String(jiraTickets.length);
    if (countGithub) countGithub.textContent = String(githubPrs.length);

    // 4. Timeline Blocks
    if (timelineList) {
      if (blocks.length === 0) {
        timelineList.innerHTML = '<div class="empty-state">No schedule blocks available</div>';
      } else {
        timelineList.innerHTML = blocks
          .map((b) => {
            const isDone = Boolean(b.completed);
            return `
            <div class="timeline-item ${isDone ? 'completed' : ''}" data-id="${b.id}">
              <input type="checkbox" class="timeline-check block-checkbox" data-id="${b.id}" ${isDone ? 'checked' : ''} />
              <div class="timeline-info">
                <div class="timeline-time-row">
                  <span class="timeline-time">${b.time || '--:--'}</span>
                  <span class="category-pill cat-${b.category || 'general'}">${(b.category || 'general').replace('_', ' ')}</span>
                </div>
                <div class="timeline-title">${b.title || b.activity || 'Task'}</div>
              </div>
            </div>
          `;
          })
          .join('');

        // Attach checkbox change listeners
        timelineList.querySelectorAll<HTMLInputElement>('.timeline-check').forEach((cb) => {
          cb.addEventListener('change', () => {
            const blockId = cb.dataset.id;
            if (blockId) {
              chrome.runtime.sendMessage({
                type: 'TOGGLE_BLOCK',
                payload: { blockId, completed: cb.checked },
              });
            }
          });
        });
      }
    }

    // 5. Jira Tickets
    if (jiraList) {
      if (jiraTickets.length === 0) {
        jiraList.innerHTML = '<div class="empty-state">No open Jira tickets</div>';
      } else {
        jiraList.innerHTML = jiraTickets
          .map(
            (t) => `
          <div class="ticket-card">
            <div class="ticket-header">
              <span class="ticket-key">${t.key}</span>
              <span class="badge ${t.priority === 'Highest' || t.priority === 'High' ? 'badge-offline' : 'badge-wfh'}">${t.priority}</span>
            </div>
            <div class="ticket-title">${t.summary}</div>
            <div class="ticket-meta">
              <span>Status: ${t.status}</span>
              <span>~${t.estimated_hours}h</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // 6. GitHub PRs
    if (githubList) {
      if (githubPrs.length === 0) {
        githubList.innerHTML = '<div class="empty-state">No open GitHub PRs</div>';
      } else {
        githubList.innerHTML = githubPrs
          .map(
            (pr) => `
          <div class="pr-card">
            <div class="pr-header">
              <span class="pr-num">#${pr.number}</span>
              <span class="badge ${pr.days_old > 3 ? 'badge-offline' : 'badge-hybrid'}">${pr.days_old}d old</span>
            </div>
            <div class="pr-title">${pr.title}</div>
            <div class="pr-meta">
              <span>Author: @${pr.author || pr.user || 'dev'}</span>
              <span>${pr.state}</span>
            </div>
          </div>
        `
          )
          .join('');
      }
    }

    // 7. Footer
    if (footerVerdict) {
      const verdict: Verdict = normalizeVerdict(res?.go_to_office);
      footerVerdict.textContent = verdict.toUpperCase();
      footerVerdict.className = `badge ${verdict === 'office' ? 'badge-office' : verdict === 'hybrid' ? 'badge-hybrid' : 'badge-wfh'}`;
    }

    if (footerCityWeather) {
      if (res) {
        footerCityWeather.textContent = `${res.city} · ${Math.round(res.temperature_c)}°C ${res.weather_condition}`;
      } else {
        footerCityWeather.textContent = '--';
      }
    }

    if (footerSynced) {
      if (state.lastSyncedAt) {
        const d = new Date(state.lastSyncedAt);
        footerSynced.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        footerSynced.textContent = '--:--';
      }
    }
  }

  // Load state on start
  chrome.storage.local.get(null, (items) => {
    const state = items as unknown as StorageState;
    render(state);

    // Auto-probe backend if currently in offline mode
    if (state.isOffline || !state.lastResponse) {
      btnSync?.classList.add('rotating');
      chrome.runtime.sendMessage({ type: 'SYNC_REQUEST', payload: { force: true } }, (res) => {
        btnSync?.classList.remove('rotating');
        if (res?.state) {
          render(res.state);
        }
      });
    }
  });

  // Watch for storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      chrome.storage.local.get(null, (items) => {
        render(items as unknown as StorageState);
      });
    }
  });

  // Insert Context into Prompt Bar
  btnContextPlan?.addEventListener('click', async () => {
    const items = (await chrome.storage.local.get('activeContext')) as unknown as StorageState;
    if (items.activeContext && promptInput) {
      promptInput.value = `Prioritize ${items.activeContext.id}: ${items.activeContext.title}`;
      promptInput.focus();
    }
  });

  // Quick Prompt Planning Submission
  btnPromptSend?.addEventListener('click', () => {
    const query = promptInput?.value.trim();
    if (!query) return;
    btnPromptSend?.setAttribute('disabled', 'true');
    chrome.runtime.sendMessage(
      {
        type: 'SYNC_REQUEST',
        payload: { userRequest: query },
      },
      (res) => {
        btnPromptSend?.removeAttribute('disabled');
        if (res?.state) {
          render(res.state);
        }
      }
    );
    if (promptInput) promptInput.value = '';
  });

  // Sync button
  btnSync?.addEventListener('click', () => {
    btnSync.classList.add('rotating');
    chrome.runtime.sendMessage({ type: 'SYNC_REQUEST', payload: { force: true } }, (res) => {
      setTimeout(() => btnSync.classList.remove('rotating'), 600);
      if (res?.state) {
        render(res.state);
      }
    });
  });

  // Export .ics trigger (RFC 5545 1-click download)
  btnExportIcs?.addEventListener('click', async () => {
    try {
      const items = (await chrome.storage.local.get(null)) as unknown as StorageState;
      const blocks: ScheduleBlock[] = items.scheduleBlocks || [];
      if (blocks.length === 0) {
        alert('No schedule blocks currently loaded to export.');
        return;
      }
      downloadIcsFile(blocks);
    } catch (err) {
      console.error('[Locus Sidepanel] Failed to export .ics:', err);
    }
  });

  // Open Notion trigger
  btnOpenNotion?.addEventListener('click', async () => {
    const items = (await chrome.storage.local.get('lastResponse')) as unknown as StorageState;
    const url = items.lastResponse?.notion_page_url || 'https://notion.so';
    chrome.tabs.create({ url });
  });
});
