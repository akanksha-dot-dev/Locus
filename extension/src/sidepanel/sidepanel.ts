/**
 * Locus Docked Side Panel Companion Logic
 * Manages 24h day plan timeline, Jira/GitHub workloads, LangGraph swarm visualizer,
 * real-time day analytics, global search filtering, and quick-prompt day planning.
 */

import {
  GitHubPR,
  JiraTicket,
  JudgeScenarioKey,
  ScheduleBlock,
  StorageState,
  Verdict,
  calculateDayAnalytics,
  normalizeVerdict,
} from '../types/index';
import { downloadIcsFile } from '../services/icalendar';
import { SwarmVisualizer } from '../components/swarm-graph';
import {
  isSpeakingBriefing,
  playSpeechBriefing,
  playSuccessChime,
  playSwarmBlip,
  playTactileTick,
  playTaskComplete,
  stopSpeechBriefing,
} from '../utils/audio';

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const timelineList = document.getElementById('timeline-list');
  const jiraList = document.getElementById('jira-list');
  const githubList = document.getElementById('github-list');

  const countTimeline = document.getElementById('count-timeline');
  const countJira = document.getElementById('count-jira');
  const countGithub = document.getElementById('count-github');
  const countSwarm = document.getElementById('count-swarm');

  const offlineBanner = document.getElementById('sidepanel-offline-banner');
  const contextBar = document.getElementById('detected-context-bar');
  const contextSourceBadge = document.getElementById('context-source-badge');
  const contextTitle = document.getElementById('context-title');
  const btnContextPlan = document.getElementById('btn-context-plan');

  const searchInput = document.getElementById('sidepanel-search') as HTMLInputElement | null;
  const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
  const btnPromptSend = document.getElementById('btn-prompt-send');
  const promptChips = document.querySelectorAll<HTMLButtonElement>('.prompt-chip');

  const timelineAddInput = document.getElementById('timeline-add-input') as HTMLInputElement | null;
  const btnTimelineAdd = document.getElementById('btn-timeline-add');

  // Analytics Elements
  const analyticsRate = document.getElementById('analytics-rate');
  const analyticsRateBar = document.getElementById('analytics-rate-bar');
  const analyticsDeepHours = document.getElementById('analytics-deep-hours');
  const analyticsMeetingHours = document.getElementById('analytics-meeting-hours');
  const analyticsBreakHours = document.getElementById('analytics-break-hours');

  // Footer Elements
  const footerVerdict = document.getElementById('footer-verdict');
  const footerCityWeather = document.getElementById('footer-city-weather');
  const footerSynced = document.getElementById('footer-synced');

  const btnSync = document.getElementById('btn-sidepanel-sync');
  const btnSidepanelVoice = document.getElementById('btn-sidepanel-voice');
  const btnRun5ApiWorkflow = document.getElementById('btn-run-5api-workflow');
  const scenarioChips = document.querySelectorAll<HTMLButtonElement>('.scenario-chip');
  const sidepanelCitySelector = document.getElementById('sidepanel-city-selector') as HTMLInputElement | null;
  const btnExportIcs = document.getElementById('btn-export-ics');
  const btnOpenNotion = document.getElementById('btn-open-notion');

  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
  const tabPanes = document.querySelectorAll<HTMLElement>('.tab-pane');

  // Lightweight 0-dep canvas confetti celebration burst
  function triggerConfetti(): void {
    const canvas = document.getElementById('confetti-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; alpha: number }[] = [];
    const colors = ['#10b981', '#06b6d4', '#6366f1', '#f59e0b', '#ec4899'];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() * 80 - 40),
        y: canvas.height * 0.35 + (Math.random() * 40 - 20),
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.7) * 9,
        color: colors[Math.floor(Math.random() * colors.length)] || '#10b981',
        size: Math.random() * 5 + 3,
        alpha: 1,
      });
    }

    const startTime = performance.now();
    function renderParticles() {
      if (!ctx || !canvas) return;
      const elapsed = performance.now() - startTime;
      if (elapsed > 1800) {
        canvas.style.display = 'none';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.alpha = Math.max(0, 1 - elapsed / 1800);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(renderParticles);
    }
    requestAnimationFrame(renderParticles);
  }

  // Swarm Visualizer Component
  const swarmContainer = document.getElementById('swarm-graph-container');
  const swarmVisualizer = swarmContainer ? new SwarmVisualizer(swarmContainer) : null;
  const swarmLogs = document.getElementById('swarm-logs');
  if (swarmVisualizer) {
    swarmVisualizer.onNodeClick = () => {
      playTactileTick(550);
    };
  }

  let activeBlocksCache: ScheduleBlock[] = [];
  let cachedStorageState: StorageState | null = null;

  // Tab switching with tactile audio tick
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      playTactileTick(450);
      const target = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.remove('active'));
      tabPanes.forEach((p) => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`pane-${target}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Time & Laser Bar Utilities
  function getCurrentMinutes(): number {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function parseBlockMinutes(timeStr?: string): { start: number; end: number } {
    if (!timeStr) return { start: 0, end: 1440 };
    const parts = timeStr.split('-').map((s) => s.trim());
    const parsePart = (p?: string) => {
      if (!p) return 0;
      const match = p.match(/(\d{1,2}):(\d{2})/);
      if (!match || !match[1] || !match[2]) return 0;
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    };
    const start = parsePart(parts[0]);
    const end = parts.length > 1 ? parsePart(parts[1]) : start + 60;
    return { start, end };
  }

  function getLaserBarHtml(): string {
    const d = new Date();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `
      <div id="timeline-laser-bar" class="timeline-laser-bar">
        <div class="laser-line"></div>
        <div class="laser-tag">
          <span class="laser-dot"></span>
          <span>NOW · <span id="laser-clock">${timeStr}</span></span>
        </div>
        <div class="laser-line"></div>
      </div>
    `;
  }

  // Live laser seconds ticker
  setInterval(() => {
    const clockEl = document.getElementById('laser-clock');
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
  }, 1000);

  // Render Full State
  function render(state: Partial<StorageState>): void {
    cachedStorageState = state as StorageState;
    const res = state.lastResponse;
    const blocks: ScheduleBlock[] = state.scheduleBlocks || [];
    activeBlocksCache = blocks;
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
    if (countSwarm) countSwarm.textContent = '8';

    // 4. Timeline Blocks with Glowing Laser Bar
    if (timelineList) {
      if (blocks.length === 0) {
        timelineList.innerHTML = '<div class="empty-state">No schedule blocks available</div>';
      } else {
        const currentMins = getCurrentMinutes();
        let laserInserted = false;
        let itemsHtml = '';

        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (!b) continue;
          const { end } = parseBlockMinutes(b.time);

          if (!laserInserted && (currentMins < end || i === blocks.length - 1)) {
            itemsHtml += getLaserBarHtml();
            laserInserted = true;
          }

          const isDone = Boolean(b.completed);
          itemsHtml += `
            <div class="timeline-item ${isDone ? 'completed' : ''}" data-id="${b.id}" data-search="${(b.title + ' ' + b.time).toLowerCase()}">
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
        }

        if (!laserInserted) {
          itemsHtml += getLaserBarHtml();
        }

        timelineList.innerHTML = itemsHtml;

        // Auto-scroll laser bar into view smoothly
        setTimeout(() => {
          const laser = document.getElementById('timeline-laser-bar');
          laser?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);

        // Attach checkbox change listeners with audio click
        timelineList.querySelectorAll<HTMLInputElement>('.timeline-check').forEach((cb) => {
          cb.addEventListener('change', () => {
            playTaskComplete();
            const blockId = cb.dataset.id;
            if (blockId) {
              chrome.runtime.sendMessage({
                type: 'TOGGLE_BLOCK',
                payload: { blockId, completed: cb.checked },
              });
              // Local update for instant analytics responsiveness
              const matched = activeBlocksCache.find((b) => b.id === blockId);
              if (matched) matched.completed = cb.checked;
              updateAnalytics(activeBlocksCache);

              // Check if all blocks completed -> celebrate with confetti!
              const allDone = activeBlocksCache.length > 0 && activeBlocksCache.every((b) => b.completed);
              if (allDone) {
                playSuccessChime();
                triggerConfetti();
              }
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
          <div class="ticket-card" data-search="${(t.key + ' ' + t.summary).toLowerCase()}">
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
          <div class="pr-card" data-search="${('#' + pr.number + ' ' + pr.title).toLowerCase()}">
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

    // 7. Day Analytics Tab
    updateAnalytics(blocks);

    // 8. Footer
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

    if (sidepanelCitySelector && document.activeElement !== sidepanelCitySelector) {
      sidepanelCitySelector.value = res?.city || state.settings?.defaultCity || 'Mumbai';
    }

    if (footerSynced) {
      if (state.lastSyncedAt) {
        const d = new Date(state.lastSyncedAt);
        footerSynced.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        footerSynced.textContent = '--:--';
      }
    }

    // 9. Swarm Visualizer State Update
    if (res && swarmVisualizer) {
      swarmVisualizer.setAllCompleted();
    }
  }

  // Update Analytics Tab
  function updateAnalytics(blocks: ScheduleBlock[]): void {
    const analytics = calculateDayAnalytics(blocks);
    if (analyticsRate) analyticsRate.textContent = `${analytics.completionRate}%`;
    if (analyticsRateBar) analyticsRateBar.style.width = `${analytics.completionRate}%`;
    if (analyticsDeepHours) analyticsDeepHours.textContent = `${analytics.deepWorkHours}h`;
    if (analyticsMeetingHours) analyticsMeetingHours.textContent = `${analytics.meetingHours}h`;
    if (analyticsBreakHours) analyticsBreakHours.textContent = `${analytics.breakHours}h`;
  }

  // Global Search & Filter
  searchInput?.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    const items = document.querySelectorAll<HTMLElement>('[data-search]');
    items.forEach((item) => {
      const text = item.dataset.search || '';
      item.style.display = text.includes(query) ? '' : 'none';
    });
  });

  // Prompt Preset Chips
  promptChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (prompt && promptInput) {
        playTactileTick(500);
        promptInput.value = prompt;
        btnPromptSend?.click();
      }
    });
  });

  // Inline Timeline Block Insertion
  const handleTimelineAdd = async () => {
    const title = timelineAddInput?.value.trim();
    if (!title || !cachedStorageState) return;

    playTaskComplete();
    const newBlock: ScheduleBlock = {
      id: `block-${Date.now()}`,
      time: 'Focus Slot',
      title,
      activity: title,
      category: 'deep_work',
      completed: false,
    };

    const updatedBlocks = [...(cachedStorageState.scheduleBlocks || []), newBlock];
    await chrome.storage.local.set({ scheduleBlocks: updatedBlocks });
    if (timelineAddInput) timelineAddInput.value = '';
    render({ ...cachedStorageState, scheduleBlocks: updatedBlocks });
  };

  btnTimelineAdd?.addEventListener('click', handleTimelineAdd);
  timelineAddInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleTimelineAdd();
  });

  // Load state on start
  chrome.storage.local.get(null, (items) => {
    const state = items as unknown as StorageState;
    render(state);

    // Auto-probe backend if currently in offline mode
    if (state.isOffline || !state.lastResponse) {
      btnSync?.classList.add('rotating');
      const activeCity = sidepanelCitySelector?.value.trim() || state.settings?.defaultCity || state.lastResponse?.city || 'Mumbai';
      chrome.runtime.sendMessage({ type: 'SYNC_REQUEST', payload: { force: true, city: activeCity } }, (res) => {
        btnSync?.classList.remove('rotating');
        if (res?.state) render(res.state);
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

  // Pipeline Step Updates from Swarm
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'PIPELINE_STEP_UPDATE') {
      playSwarmBlip();
      const { node, status, elapsed_ms, details } = msg.payload || {};
      if (node && swarmVisualizer) {
        swarmVisualizer.updateNode(node, status, details, elapsed_ms);
        if (swarmLogs) {
          const logEntry = document.createElement('div');
          logEntry.className = `swarm-log-entry ${status === 'running' ? 'active' : 'done'}`;
          logEntry.textContent = `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${node.toUpperCase()}: ${status.toUpperCase()} ${elapsed_ms ? `(${elapsed_ms}ms)` : ''}`;
          swarmLogs.appendChild(logEntry);
          swarmLogs.scrollTop = swarmLogs.scrollHeight;
        }
      }
    }
  });

  // Insert Context into Prompt Bar
  btnContextPlan?.addEventListener('click', async () => {
    playTactileTick(500);
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
    playTactileTick(700);
    swarmVisualizer?.resetAll('idle');
    if (swarmLogs) {
      const entry = document.createElement('div');
      entry.className = 'swarm-log-entry active';
      entry.textContent = `[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] DISPATCHING PLANNER: "${query}"`;
      swarmLogs.appendChild(entry);
    }
    btnPromptSend?.setAttribute('disabled', 'true');
    chrome.runtime.sendMessage(
      {
        type: 'SYNC_REQUEST',
        payload: {
          userRequest: query,
          city: sidepanelCitySelector?.value || cachedStorageState?.lastResponse?.city,
        },
      },
      (res) => {
        btnPromptSend?.removeAttribute('disabled');
        if (res?.state) {
          playSuccessChime();
          swarmVisualizer?.setAllCompleted();
          render(res.state);
        }
      }
    );
    if (promptInput) promptInput.value = '';
  });

  // City Selector Change & Enter Key Handler
  let sidepanelCityDebounceTimer: number | null = null;
  let isSidepanelSyncingCity = false;

  function triggerSidepanelCitySync(force = false) {
    const rawVal = sidepanelCitySelector?.value.trim();
    if (!rawVal) return;
    const currentCity = cachedStorageState?.lastResponse?.city || '';
    if (!force && rawVal.toLowerCase() === currentCity.toLowerCase()) {
      return;
    }
    if (isSidepanelSyncingCity) return;
    isSidepanelSyncingCity = true;

    playTactileTick(600);
    btnSync?.classList.add('rotating');
    chrome.runtime.sendMessage(
      { type: 'SYNC_REQUEST', payload: { force: true, city: rawVal } },
      (res) => {
        isSidepanelSyncingCity = false;
        btnSync?.classList.remove('rotating');
        if (res?.state) {
          playSuccessChime();
          render(res.state);
        }
      }
    );
  }

  // Select all text on focus for frictionless typing
  sidepanelCitySelector?.addEventListener('focus', () => {
    sidepanelCitySelector.select();
  });

  // Handle instant datalist selection or debounced manual entry
  sidepanelCitySelector?.addEventListener('input', () => {
    const rawVal = sidepanelCitySelector.value.trim();
    if (!rawVal) return;

    // Check if input matches any option in datalist
    const datalist = document.getElementById('sidepanel-cities-list') as HTMLDataListElement | null;
    const isMatched = datalist && Array.from(datalist.options).some(
      (opt) => opt.value.toLowerCase() === rawVal.toLowerCase()
    );

    if (isMatched) {
      if (sidepanelCityDebounceTimer) clearTimeout(sidepanelCityDebounceTimer);
      triggerSidepanelCitySync(false);
      return;
    }

    // For arbitrary world cities typed manually, debounce 650ms
    if (sidepanelCityDebounceTimer) clearTimeout(sidepanelCityDebounceTimer);
    if (rawVal.length >= 3) {
      sidepanelCityDebounceTimer = window.setTimeout(() => {
        triggerSidepanelCitySync(false);
      }, 650);
    }
  });

  sidepanelCitySelector?.addEventListener('change', () => triggerSidepanelCitySync(false));
  sidepanelCitySelector?.addEventListener('blur', () => triggerSidepanelCitySync(false));
  sidepanelCitySelector?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sidepanelCitySelector.blur();
      triggerSidepanelCitySync(true);
    }
  });

  // Sync button
  btnSync?.addEventListener('click', () => {
    playTactileTick(500);
    triggerSidepanelCitySync(true);
  });

  // Export .ics trigger (RFC 5545 1-click download)
  btnExportIcs?.addEventListener('click', async () => {
    playTactileTick(600);
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
    playTactileTick(600);
    const items = (await chrome.storage.local.get('lastResponse')) as unknown as StorageState;
    const url = items.lastResponse?.notion_page_url || 'https://notion.so';
    chrome.tabs.create({ url });
  });

  // Voice Briefing Toggle (SpeechSynthesis HUD)
  btnSidepanelVoice?.addEventListener('click', () => {
    playTactileTick(600);
    if (isSpeakingBriefing()) {
      stopSpeechBriefing();
      if (btnSidepanelVoice) btnSidepanelVoice.textContent = '🔊 Audio Briefing';
    } else {
      const res = cachedStorageState?.lastResponse;
      if (!res) return;
      if (btnSidepanelVoice) btnSidepanelVoice.textContent = '⏹️ Stop Briefing';
      const verdictStr = normalizeVerdict(res.go_to_office).toUpperCase();
      const spokenText = `Locus Executive Briefing for ${res.city}. Work disposition is ${verdictStr}. ${res.ai_summary || res.office_reason || 'Day plan is synchronized.'}`;
      playSpeechBriefing(spokenText, () => {
        if (btnSidepanelVoice) btnSidepanelVoice.textContent = '🔊 Audio Briefing';
      });
    }
  });

  // Judge Scenario Playground Chips
  scenarioChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      playTactileTick(500);
      const scenario = chip.dataset.scenario as JudgeScenarioKey | undefined;
      if (!scenario) return;
      scenarioChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      btnSync?.classList.add('rotating');
      chrome.runtime.sendMessage(
        {
          type: 'SYNC_REQUEST',
          payload: {
            force: true,
            city: sidepanelCitySelector?.value || cachedStorageState?.lastResponse?.city || 'Mumbai',
            scenarioKey: scenario,
          },
        },
        (res) => {
          btnSync?.classList.remove('rotating');
          if (res?.state) {
            playSuccessChime();
            render(res.state);
          }
        }
      );
    });
  });

  // Swytchcode 5-API Orchestration Flow Simulation
  let isRunning5Api = false;
  btnRun5ApiWorkflow?.addEventListener('click', async () => {
    if (isRunning5Api) return;
    isRunning5Api = true;
    playTactileTick(600);
    if (btnRun5ApiWorkflow) {
      btnRun5ApiWorkflow.textContent = '⏳ Executing...';
      btnRun5ApiWorkflow.setAttribute('disabled', 'true');
    }

    const apis = [
      { id: 'weather', name: 'OpenWeather', desc: 'Fetching barometric & precip metrics...' },
      { id: 'gmail', name: 'Gmail/Calendar', desc: 'Scanning agenda & commute conflicts...' },
      { id: 'notion', name: 'Notion', desc: 'Synchronizing timeline blocks to workspace...' },
      { id: 'slack', name: 'Slack', desc: 'Broadcasting morning briefing to #general...' },
      { id: 'resend', name: 'Resend', desc: 'Delivering executive email summary...' },
    ];

    for (const api of apis) {
      const badge = document.getElementById(`api-badge-${api.id}`);
      const detail = document.getElementById(`api-detail-${api.id}`);
      if (badge) {
        badge.className = 'badge badge-hybrid';
        badge.textContent = 'RUNNING';
      }
      if (detail) detail.textContent = api.desc;
      playSwarmBlip();
      await new Promise((r) => setTimeout(r, 400));
      if (badge) {
        badge.className = 'badge badge-office';
        badge.textContent = 'COMPLETED';
      }
    }

    playSuccessChime();
    triggerConfetti();
    if (btnRun5ApiWorkflow) {
      btnRun5ApiWorkflow.textContent = '✓ Flow Verified';
      setTimeout(() => {
        if (btnRun5ApiWorkflow) {
          btnRun5ApiWorkflow.textContent = '▶ Run 5-API Flow';
          btnRun5ApiWorkflow.removeAttribute('disabled');
        }
      }, 3000);
    }
    isRunning5Api = false;
  });
});
