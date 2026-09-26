/**
 * Locus Action Popup HUD Logic
 * Fast cold-boot (<150ms) executive summary controller with dual-ring telemetry,
 * 4-preset Pomodoro engine, interactive city switching, and quick task insertion.
 */

import {
  ScheduleBlock,
  StorageState,
  Verdict,
  normalizeVerdict,
} from '../types/index';
import { downloadIcsFile } from '../services/icalendar';
import {
  playPomodoroGong,
  playSuccessChime,
  playTactileTick,
  playTaskComplete,
} from '../utils/audio';

document.addEventListener('DOMContentLoaded', async () => {
  const startTime = performance.now();

  // Elements
  const connectionBeacon = document.getElementById('connection-beacon');
  const citySelector = document.getElementById('city-selector') as HTMLSelectElement | null;
  const verdictBadge = document.getElementById('verdict-badge');
  const verdictConfidence = document.getElementById('verdict-confidence');
  const verdictReason = document.getElementById('verdict-reason');

  // Dual Concentric Gauge Elements
  const gaugeScoreNum = document.getElementById('gauge-score-num');
  const gaugeProgress = document.getElementById('gauge-progress') as SVGCircleElement | null;
  const gaugeInnerProgress = document.getElementById('gauge-inner-progress') as SVGCircleElement | null;
  const weatherDesc = document.getElementById('metric-weather-desc');
  const focusHours = document.getElementById('metric-focus-hours');

  // Outfit
  const outfitText = document.getElementById('outfit-text');

  // Schedule Block & Quick Add
  const activeBlockTime = document.getElementById('active-block-time');
  const activeBlockTitle = document.getElementById('active-block-title');
  const activeBlockCheck = document.getElementById('active-block-check') as HTMLInputElement | null;
  const nextBlockPeek = document.getElementById('next-block-peek');
  const nextBlockTitle = document.getElementById('next-block-title');
  const quickAddInput = document.getElementById('quick-add-input') as HTMLInputElement | null;
  const btnQuickAdd = document.getElementById('btn-quick-add');

  // Pomodoro Controls
  const pomoClock = document.getElementById('pomodoro-clock');
  const pomoDot = document.getElementById('pomo-dot');
  const btnPomoToggle = document.getElementById('btn-pomo-toggle');
  const btnPomoReset = document.getElementById('btn-pomo-reset');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const presetButtons = document.querySelectorAll<HTMLButtonElement>('.btn-preset');

  // Footer Actions
  const btnPopupIcs = document.getElementById('btn-popup-ics');
  const btnPopupNotion = document.getElementById('btn-popup-notion');
  const btnPopupStandup = document.getElementById('btn-popup-standup');
  const standupBtnLabel = document.getElementById('standup-btn-label');
  const btnSync = document.getElementById('btn-sync');
  const btnOpenSidepanel = document.getElementById('btn-open-sidepanel');
  const lastSyncedTime = document.getElementById('last-synced-time');

  let currentBlockId: string | null = null;
  let soundEnabled = true;
  let pomoRemainingSeconds = 25 * 60;
  let pomoInterval: any = null;
  let isPomoRunning = false;
  let cachedState: StorageState | null = null;

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

  // Preset switching
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (soundEnabled) playTactileTick(500);
      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const sec = parseInt(btn.dataset.sec || '1500', 10);
      clearInterval(pomoInterval);
      isPomoRunning = false;
      pomoRemainingSeconds = sec;
      updatePomodoroUI();
    });
  });

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
          if (soundEnabled) playPomodoroGong();
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
    const activePreset = document.querySelector<HTMLButtonElement>('.btn-preset.active');
    pomoRemainingSeconds = parseInt(activePreset?.dataset.sec || '1500', 10);
    updatePomodoroUI();
  });

  // Smooth Dual-Ring Count-up Circular Gauge Animation
  function animateDualGauge(weatherScoreVal: number, focusCapacityPercent: number): void {
    if (!gaugeProgress || !gaugeScoreNum) return;
    const outerCircumference = 201.1; // 2 * pi * 32
    const innerCircumference = 150.8; // 2 * pi * 24
    const progressEl = gaugeProgress;
    const innerProgressEl = gaugeInnerProgress;
    const scoreEl = gaugeScoreNum;

    const startScore = parseInt(scoreEl.textContent || '0', 10) || 0;
    const duration = 750;
    const animStart = performance.now();

    function step(now: number) {
      const elapsed = now - animStart;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const currentScore = Math.round(startScore + (weatherScoreVal - startScore) * ease);
      scoreEl.textContent = String(currentScore);

      // Outer Ring (Weather/Commute)
      const outerOffset = outerCircumference * (1 - Math.max(0, Math.min(100, currentScore)) / 100);
      progressEl.style.strokeDashoffset = String(outerOffset);

      if (currentScore >= 80) {
        progressEl.style.stroke = '#10b981';
      } else if (currentScore >= 50) {
        progressEl.style.stroke = '#06b6d4';
      } else {
        progressEl.style.stroke = '#f59e0b';
      }

      // Inner Ring (Focus Energy Capacity)
      if (innerProgressEl) {
        const currentInnerVal = Math.round(focusCapacityPercent * ease);
        const innerOffset = innerCircumference * (1 - Math.max(0, Math.min(100, currentInnerVal)) / 100);
        innerProgressEl.style.strokeDashoffset = String(innerOffset);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  // Hydrate UI from StorageState
  function renderState(state: Partial<StorageState>): void {
    cachedState = state as StorageState;
    const res = state.lastResponse;
    const blocks: ScheduleBlock[] = state.scheduleBlocks || [];
    const isOffline = Boolean(state.isOffline);

    // 1. Connection Beacon
    if (connectionBeacon) {
      connectionBeacon.className = `beacon-dot ${isOffline ? 'beacon-offline' : 'beacon-live'}`;
      connectionBeacon.title = isOffline ? 'Status: Offline / Cached Snapshot' : 'Status: Live Connected';
    }

    // 2. City Selector
    if (citySelector) {
      const currentCity = res?.city || state.settings?.defaultCity || 'Mumbai';
      citySelector.value = currentCity;
    }

    // 3. Verdict & Confidence
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

      if (verdictConfidence) {
        const confPercent = res ? Math.min(99, Math.max(70, Math.round(res.weather_score * 0.4 + 55))) : 90;
        verdictConfidence.textContent = `${confPercent}% CONF`;
      }

      verdictReason.textContent =
        res?.office_reason || 'Analyzing real-time weather and sprint workload...';
    }

    // 4. Dual Concentric Gauge
    const focusCapacityPct = res ? Math.min(100, Math.round((res.estimated_productive_hours / 8) * 100)) : 75;
    if (res && typeof res.weather_score === 'number') {
      animateDualGauge(res.weather_score, focusCapacityPct);
      if (weatherDesc) {
        weatherDesc.textContent = `${res.weather_condition}, ${Math.round(res.temperature_c)}°C in ${res.city}`;
      }
    } else {
      if (gaugeScoreNum) gaugeScoreNum.textContent = '--';
      if (gaugeProgress) gaugeProgress.style.strokeDashoffset = '201.1';
      if (gaugeInnerProgress) gaugeInnerProgress.style.strokeDashoffset = '150.8';
      if (weatherDesc) weatherDesc.textContent = 'No data available';
    }

    // 5. Focus Capacity
    if (focusHours) {
      if (res) {
        focusHours.textContent = res.estimated_productive_hours.toFixed(1);
      } else {
        focusHours.textContent = '--';
      }
    }

    // 6. Outfit
    if (outfitText) {
      outfitText.textContent = res?.outfit_suggestion || 'Comfortable attire recommended.';
    }

    // 7. Active Focus Block & Next Block Peek
    const uncompletedBlocks = blocks.filter((b) => !b.completed);
    const activeBlock = uncompletedBlocks[0] || blocks[0];
    const nextBlock = uncompletedBlocks[1];

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

    if (nextBlockPeek && nextBlockTitle) {
      if (nextBlock) {
        nextBlockPeek.style.display = 'flex';
        nextBlockTitle.textContent = `${nextBlock.time || '--:--'} · ${nextBlock.title || 'Next Task'}`;
      } else {
        nextBlockPeek.style.display = 'none';
      }
    }

    // 8. Last Synced
    if (lastSyncedTime) {
      if (state.lastSyncedAt) {
        const d = new Date(state.lastSyncedAt);
        lastSyncedTime.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        lastSyncedTime.textContent = 'Never';
      }
    }
  }

  // City Selector Change Handler
  citySelector?.addEventListener('change', () => {
    const newCity = citySelector.value;
    if (soundEnabled) playTactileTick(600);
    btnSync?.classList.add('rotating');
    chrome.runtime.sendMessage(
      { type: 'SYNC_REQUEST', payload: { force: true, city: newCity } },
      (res) => {
        btnSync?.classList.remove('rotating');
        if (res?.state) renderState(res.state);
      }
    );
  });

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
        if (res?.state) renderState(res.state);
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
        playSuccessChime();
        renderState(res.state);
      }
    });
  });

  // Active Block Checkbox Toggle
  activeBlockCheck?.addEventListener('change', () => {
    if (!currentBlockId) return;
    if (soundEnabled) playTaskComplete();
    const completed = activeBlockCheck.checked;
    chrome.runtime.sendMessage({
      type: 'TOGGLE_BLOCK',
      payload: { blockId: currentBlockId, completed },
    });
  });

  // Quick Add Task Handler
  const handleQuickAdd = async () => {
    const title = quickAddInput?.value.trim();
    if (!title || !cachedState) return;

    if (soundEnabled) playTaskComplete();
    const newBlock: ScheduleBlock = {
      id: `block-${Date.now()}`,
      time: 'Focus Slot',
      title,
      activity: title,
      category: 'deep_work',
      completed: false,
    };

    const updatedBlocks = [...(cachedState.scheduleBlocks || []), newBlock];
    await chrome.storage.local.set({ scheduleBlocks: updatedBlocks });
    if (quickAddInput) quickAddInput.value = '';
    renderState({ ...cachedState, scheduleBlocks: updatedBlocks });
  };

  btnQuickAdd?.addEventListener('click', handleQuickAdd);
  quickAddInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleQuickAdd();
  });

  // Standup Summary to Clipboard
  btnPopupStandup?.addEventListener('click', () => {
    if (soundEnabled) playTactileTick(500);
    if (!cachedState) return;

    const res = cachedState.lastResponse;
    const verdict = normalizeVerdict(res?.go_to_office).toUpperCase();
    const city = res?.city || 'Mumbai';
    const hours = res?.estimated_productive_hours?.toFixed(1) || '6.0';
    const activeTitle = activeBlockTitle?.textContent || 'Sprint tasks';

    const text = `📋 *Locus Day Plan* (${verdict} · ${city})\n• Disposition: ${verdict} — ${res?.office_reason || 'Focus sprint day'}\n• Focus Capacity: ${hours} hrs\n• Current Focus: ${activeTitle}\n• Weather: ${res?.weather_condition || 'Clear'}, ${Math.round(res?.temperature_c || 25)}°C`;

    navigator.clipboard.writeText(text).then(() => {
      if (standupBtnLabel) standupBtnLabel.textContent = '✓ Copied!';
      setTimeout(() => {
        if (standupBtnLabel) standupBtnLabel.textContent = 'Standup';
      }, 2000);
    });
  });

  // Export .ics trigger from popup
  btnPopupIcs?.addEventListener('click', () => {
    if (soundEnabled) playTactileTick(500);
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
    if (soundEnabled) playTactileTick(500);
    chrome.storage.local.get('lastResponse', (items) => {
      const state = items as unknown as StorageState;
      const url = state.lastResponse?.notion_page_url || 'https://notion.so';
      chrome.tabs.create({ url });
    });
  });

  // Open Side Panel
  btnOpenSidepanel?.addEventListener('click', async () => {
    if (soundEnabled) playTactileTick(500);
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
