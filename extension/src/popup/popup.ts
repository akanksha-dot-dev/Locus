/**
 * Locus Action Popup HUD Logic
 * Fast cold-boot (<150ms) executive summary controller
 */

import {
  ScheduleBlock,
  StorageState,
  Verdict,
  normalizeVerdict,
} from '../types/index';
import { downloadIcsFile } from '../services/icalendar';

document.addEventListener('DOMContentLoaded', async () => {
  const startTime = performance.now();

  // Elements
  const offlinePill = document.getElementById('offline-pill');
  const verdictBadge = document.getElementById('verdict-badge');
  const verdictReason = document.getElementById('verdict-reason');
  const weatherScore = document.getElementById('metric-weather-score');
  const weatherDesc = document.getElementById('metric-weather-desc');
  const focusHours = document.getElementById('metric-focus-hours');
  const outfitText = document.getElementById('outfit-text');
  const activeBlockTime = document.getElementById('active-block-time');
  const activeBlockTitle = document.getElementById('active-block-title');
  const activeBlockCheck = document.getElementById('active-block-check') as HTMLInputElement | null;
  const lastSyncedTime = document.getElementById('last-synced-time');
  const btnSync = document.getElementById('btn-sync');
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');

  let currentBlockId: string | null = null;

  // Hydrate UI from StorageState
  function renderState(state: Partial<StorageState>): void {
    const res = state.lastResponse;
    const blocks: ScheduleBlock[] = state.scheduleBlocks || [];
    const isOffline = Boolean(state.isOffline);

    // 1. Offline pill
    if (offlinePill) {
      offlinePill.style.display = isOffline ? 'inline-flex' : 'none';
    }

    // 2. Verdict & Reason
    if (verdictBadge && verdictReason) {
      const rawVerdict = res?.go_to_office;
      const verdict: Verdict = normalizeVerdict(rawVerdict);

      verdictBadge.textContent = verdict.toUpperCase();
      verdictBadge.className = 'badge';

      if (verdict === 'office') {
        verdictBadge.classList.add('badge-office', 'glow-emerald');
      } else if (verdict === 'hybrid') {
        verdictBadge.classList.add('badge-hybrid', 'glow-cyan');
      } else {
        verdictBadge.classList.add('badge-wfh', 'glow-indigo');
      }

      verdictReason.textContent =
        res?.office_reason || 'Analyzing real-time weather and sprint workload...';
    }

    // 3. Weather Metrics
    if (weatherScore && weatherDesc) {
      if (res) {
        weatherScore.textContent = String(res.weather_score);
        weatherDesc.textContent = `${res.weather_condition}, ${Math.round(res.temperature_c)}°C in ${res.city}`;
      } else {
        weatherScore.textContent = '--';
        weatherDesc.textContent = 'No data available';
      }
    }

    // 4. Focus Capacity
    if (focusHours) {
      if (res) {
        focusHours.textContent = res.estimated_productive_hours.toFixed(1);
      } else {
        focusHours.textContent = '--';
      }
    }

    // 5. Outfit
    if (outfitText) {
      outfitText.textContent = res?.outfit_suggestion || 'Comfortable attire recommended.';
    }

    // 6. Active Focus Block (first uncompleted block or first block)
    const activeBlock = blocks.find((b) => !b.completed) || blocks[0];
    if (activeBlock && activeBlockTime && activeBlockTitle && activeBlockCheck) {
      currentBlockId = activeBlock.id;
      activeBlockTime.textContent = activeBlock.time || '--:--';
      activeBlockTitle.textContent = activeBlock.title || activeBlock.activity || 'General Focus';
      activeBlockCheck.checked = Boolean(activeBlock.completed);
      activeBlockCheck.disabled = false;
    } else if (activeBlockTitle && activeBlockCheck) {
      activeBlockTitle.textContent = 'All tasks completed or none scheduled';
      activeBlockCheck.checked = false;
      activeBlockCheck.disabled = true;
    }

    // 7. Last Synced
    if (lastSyncedTime) {
      if (state.lastSyncedAt) {
        const d = new Date(state.lastSyncedAt);
        lastSyncedTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        lastSyncedTime.textContent = 'Never';
      }
    }
  }

  // Load state from local storage immediately (<150ms cold boot)
  chrome.storage.local.get(null, (items) => {
    const state = items as unknown as StorageState;
    renderState(state);
    console.log(`[Locus HUD] Rendered in ${(performance.now() - startTime).toFixed(1)}ms`);

    // Auto-probe backend if currently in offline mode
    if (state.isOffline || !state.lastResponse) {
      btnSync?.classList.add('rotating');
      chrome.runtime.sendMessage({ type: 'SYNC_REQUEST', payload: { force: true } }, (res) => {
        btnSync?.classList.remove('rotating');
        if (res?.state) {
          renderState(res.state);
        }
      });
    }
  });

  // Watch for storage updates
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      chrome.storage.local.get(null, (items) => {
        renderState(items as unknown as StorageState);
      });
    }
  });

  // Manual Sync Button
  btnSync?.addEventListener('click', () => {
    btnSync.classList.add('rotating');
    chrome.runtime.sendMessage({ type: 'SYNC_REQUEST', payload: { force: true } }, (res) => {
      setTimeout(() => btnSync.classList.remove('rotating'), 600);
      if (res?.state) {
        renderState(res.state);
      }
    });
  });

  // Active Block Checkbox Toggle
  activeBlockCheck?.addEventListener('change', () => {
    if (!currentBlockId) return;
    const completed = activeBlockCheck.checked;
    chrome.runtime.sendMessage({
      type: 'TOGGLE_BLOCK',
      payload: { blockId: currentBlockId, completed },
    });
  });

  const btnPopupIcs = document.getElementById('btn-popup-ics');
  const btnPopupNotion = document.getElementById('btn-popup-notion');

  // Export .ics trigger from popup
  btnPopupIcs?.addEventListener('click', () => {
    chrome.storage.local.get(null, (items) => {
      const state = items as unknown as StorageState;
      const blocks = state.scheduleBlocks || [];
      if (blocks.length === 0) {
        alert('No schedule blocks currently loaded.');
        return;
      }
      downloadIcsFile(blocks);
    });
  });

  // Open Notion trigger from popup
  btnPopupNotion?.addEventListener('click', () => {
    chrome.storage.local.get('lastResponse', (items) => {
      const state = items as unknown as StorageState;
      const url = state.lastResponse?.notion_page_url || 'https://notion.so';
      chrome.tabs.create({ url });
    });
  });

  // Open Side Panel
  btnOpenSidepanel?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && chrome.sidePanel?.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
        window.close(); // Close popup once side panel is opened
      }
    } catch (err) {
      console.warn('[Locus HUD] Could not open side panel:', err);
    }
  });
});
