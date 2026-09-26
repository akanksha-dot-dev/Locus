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
import { playSuccessChime, playTactileTick } from '../utils/audio';

document.addEventListener('DOMContentLoaded', async () => {
  const startTime = performance.now();

  // Elements
  const offlinePill = document.getElementById('offline-pill');
  const verdictBadge = document.getElementById('verdict-badge');
  const verdictReason = document.getElementById('verdict-reason');
  const gaugeScoreNum = document.getElementById('gauge-score-num');
  const gaugeProgress = document.getElementById('gauge-progress') as SVGCircleElement | null;
  const weatherDesc = document.getElementById('metric-weather-desc');
  const focusHours = document.getElementById('metric-focus-hours');
  const outfitText = document.getElementById('outfit-text');
  const activeBlockTime = document.getElementById('active-block-time');
  const activeBlockTitle = document.getElementById('active-block-title');
  const activeBlockCheck = document.getElementById('active-block-check') as HTMLInputElement | null;
  const lastSyncedTime = document.getElementById('last-synced-time');
  const btnSync = document.getElementById('btn-sync');
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');

  // Pomodoro Controls
  const pomoClock = document.getElementById('pomodoro-clock');
  const pomoDot = document.getElementById('pomo-dot');
  const btnPomoToggle = document.getElementById('btn-pomo-toggle');
  const btnPomoReset = document.getElementById('btn-pomo-reset');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');

  let currentBlockId: string | null = null;
  let soundEnabled = true;
  let pomoRemainingSeconds = 25 * 60;
  let pomoInterval: any = null;
  let isPomoRunning = false;

  // Sound Toggle Listener
  btnSoundToggle?.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    if (soundIcon) soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    if (soundEnabled) playTactileTick(600);
  });

  // Pomodoro UI Controller
  function formatClock(seconds: number): string {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function updatePomodoroUI(): void {
    if (pomoClock) pomoClock.textContent = formatClock(pomoRemainingSeconds);
    if (btnPomoToggle) btnPomoToggle.textContent = isPomoRunning ? 'PAUSE' : 'START';
    if (pomoDot) {
      pomoDot.className = `pomodoro-dot ${isPomoRunning ? 'active' : 'idle'}`;
    }
  }

  btnPomoToggle?.addEventListener('click', () => {
    if (soundEnabled) playTactileTick(isPomoRunning ? 400 : 750);
    isPomoRunning = !isPomoRunning;
    if (isPomoRunning) {
      pomoInterval = setInterval(() => {
        if (pomoRemainingSeconds > 0) {
          pomoRemainingSeconds--;
          updatePomodoroUI();
        } else {
          clearInterval(pomoInterval);
          isPomoRunning = false;
          updatePomodoroUI();
          if (soundEnabled) playSuccessChime();
        }
      }, 1000);
    } else {
      clearInterval(pomoInterval);
    }
    updatePomodoroUI();
  });

  btnPomoReset?.addEventListener('click', () => {
    if (soundEnabled) playTactileTick(350);
    clearInterval(pomoInterval);
    isPomoRunning = false;
    pomoRemainingSeconds = 25 * 60;
    updatePomodoroUI();
  });

  // Smooth Count-up Circular Gauge Animation
  function animateGauge(targetScore: number): void {
    if (!gaugeProgress || !gaugeScoreNum) return;
    const progressEl = gaugeProgress;
    const scoreEl = gaugeScoreNum;
    const circumference = 188.5;
    const startScore = parseInt(scoreEl.textContent || '0', 10) || 0;
    const duration = 750;
    const animStart = performance.now();

    function step(now: number) {
      const elapsed = now - animStart;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      const currentVal = Math.round(startScore + (targetScore - startScore) * ease);
      scoreEl.textContent = String(currentVal);

      const offset = circumference * (1 - Math.max(0, Math.min(100, currentVal)) / 100);
      progressEl.style.strokeDashoffset = String(offset);

      if (currentVal >= 80) {
        progressEl.style.stroke = '#10b981';
      } else if (currentVal >= 50) {
        progressEl.style.stroke = '#06b6d4';
      } else {
        progressEl.style.stroke = '#f59e0b';
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

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
      verdictBadge.className = 'badge holo-badge';

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

    // 3. Weather Metrics & Gauge
    if (res && typeof res.weather_score === 'number') {
      animateGauge(res.weather_score);
      if (weatherDesc) {
        weatherDesc.textContent = `${res.weather_condition}, ${Math.round(res.temperature_c)}°C in ${res.city}`;
      }
    } else {
      if (gaugeScoreNum) gaugeScoreNum.textContent = '--';
      if (gaugeProgress) gaugeProgress.style.strokeDashoffset = '188.5';
      if (weatherDesc) weatherDesc.textContent = 'No data available';
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
    if (soundEnabled) playTactileTick(500);
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
    if (soundEnabled) playTactileTick(800);
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
