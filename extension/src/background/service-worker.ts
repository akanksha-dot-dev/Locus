/**
 * Locus Chrome Extension Companion — Background Service Worker
 * Manifest V3 Service Worker coordinating background polling alarms,
 * dynamic action badge updates, WebSocket streaming client, offline fallback,
 * and the cross-component message bus.
 */

import {
  AgentResponse,
  DEFAULT_STORAGE_STATE,
  DetectedContext,
  ExtensionMessage,
  ScheduleBlock,
  StorageState,
  Verdict,
  normalizeTimeline,
  normalizeVerdict,
} from '../types/index';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';
import { generateOfflineSimulation } from '../services/offline-simulator';
import { wsClient } from '../services/websocket';

// ── 1. Constants & Configuration ─────────────────────────────────────────────

export const ALARM_SYNC_NAME = 'locus-periodic-sync';
export const ALARM_POMODORO_NAME = 'locus-pomodoro-finish';
export const SYNC_INTERVAL_MINUTES = 5;
export const STALENESS_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours

// Badge visual styling tokens matching design specifications
export const BADGE_COLORS = {
  OFFICE: '#10b981', // Emerald
  WFH: '#6366f1',    // Indigo
  HYBRID: '#06b6d4', // Cyan
  OFFLINE: '#f59e0b',// Amber
} as const;

export const BADGE_TEXTS = {
  OFFICE: 'OFF',
  WFH: 'WFH',
  HYBRID: 'HYB',
  OFFLINE: 'OFFL',
} as const;

// ── 2. Dynamic Action Badge Manager ──────────────────────────────────────────

/**
 * Updates the extension toolbar badge text, background color, and tooltip.
 * Strictly adheres to:
 * - Office verdict: 'OFF' in emerald #10b981
 * - WFH verdict: 'WFH' in indigo #6366f1
 * - Hybrid verdict: 'HYB' in cyan #06b6d4
 * - Offline / Error: 'OFFL' in amber #f59e0b
 */
export function updateBadge(verdictInput?: Verdict | string | null, isOffline: boolean = false): void {
  try {
    if (typeof chrome === 'undefined' || !chrome.action) return;

    if (isOffline) {
      chrome.action.setBadgeText({ text: BADGE_TEXTS.OFFLINE });
      chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.OFFLINE });
      chrome.action.setTitle({ title: 'Locus: Offline Mode (Simulation / Cached Active)' });
      return;
    }

    const verdict = normalizeVerdict(verdictInput);
    switch (verdict) {
      case 'office':
        chrome.action.setBadgeText({ text: BADGE_TEXTS.OFFICE });
        chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.OFFICE });
        chrome.action.setTitle({ title: 'Locus: Office Day Recommended' });
        break;
      case 'wfh':
        chrome.action.setBadgeText({ text: BADGE_TEXTS.WFH });
        chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.WFH });
        chrome.action.setTitle({ title: 'Locus: Work From Home Day Recommended' });
        break;
      case 'hybrid':
        chrome.action.setBadgeText({ text: BADGE_TEXTS.HYBRID });
        chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.HYBRID });
        chrome.action.setTitle({ title: 'Locus: Flexible / Hybrid Day Recommended' });
        break;
      default:
        chrome.action.setBadgeText({ text: BADGE_TEXTS.WFH });
        chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.WFH });
        chrome.action.setTitle({ title: 'Locus Day Planner' });
        break;
    }
  } catch (err) {
    console.warn('[Locus SW] Failed to update badge:', err);
  }
}

/**
 * Helper to determine if cached data is stale (>4 hours old or different calendar day)
 */
export function isCacheStale(lastSyncedAt: number | null): boolean {
  if (!lastSyncedAt) return true;
  if (Date.now() - lastSyncedAt > STALENESS_THRESHOLD_MS) return true;

  const cacheDate = new Date(lastSyncedAt).toDateString();
  const todayDate = new Date().toDateString();
  return cacheDate !== todayDate;
}

// ── 3. State Synchronization Engine ──────────────────────────────────────────

export interface SyncOptions {
  force?: boolean;
  city?: string;
  userRequest?: string;
  reason?: string;
}

/**
 * Fetches latest state from backend or falls back smoothly to cache / simulation.
 * Dynamically responds to any city change, probes backend liveness, and guarantees reactivity.
 */
export async function executeSync(options: SyncOptions = {}): Promise<StorageState> {
  console.log(`[Locus SW] Executing sync (reason: ${options.reason || 'manual'})...`);

  // Hydrate current storage to preserve user task completions
  const prevState = await storageService.getState();
  const requestedCity = options.city ? options.city.trim() : null;
  const currentCity = prevState.settings.defaultCity || prevState.lastResponse?.city || 'Mumbai';
  const city = requestedCity || currentCity;
  const isCityChanging = Boolean(requestedCity && requestedCity.toLowerCase() !== currentCity.toLowerCase());

  // If a city is explicitly requested, persist as default immediately
  if (requestedCity) {
    await storageService.setSettings({ defaultCity: requestedCity });
  }

  // 1. Probe backend liveness
  let isBackendOnline = false;
  try {
    const health = await apiService.checkHealth(1500);
    isBackendOnline = Boolean(health && health.status === 'ok');
  } catch {
    isBackendOnline = false;
  }

  // 2. If backend is alive, attempt live query
  if (isBackendOnline) {
    try {
      let freshResponse: AgentResponse | null = null;

      if (options.userRequest) {
        freshResponse = await apiService.runPipeline(
          { user_request: options.userRequest, city },
          15000
        );
      } else {
        // Fast path: fetch live real weather directly from backend OpenWeather service
        try {
          const liveWeather = await apiService.getWeather(city, 3000);
          if (liveWeather) {
            // Seed deterministic simulation with real live weather metrics from backend
            const simulated = generateOfflineSimulation({
              city: liveWeather.city || city,
              userRequest: options.userRequest,
            });
            simulated.response.temperature_c = liveWeather.temperature_c;
            simulated.response.feels_like_c = liveWeather.feels_like_c;
            simulated.response.humidity = liveWeather.humidity;
            simulated.response.wind_speed = liveWeather.wind_speed;
            simulated.response.weather_condition = liveWeather.condition;
            simulated.response.weather_summary = `${liveWeather.condition}, ${Math.round(liveWeather.temperature_c)}°C in ${liveWeather.city}`;
            simulated.response.weather_icon = liveWeather.icon_url;
            freshResponse = simulated.response;
          }
        } catch {
          // Fallback to demo run
          freshResponse = await apiService.runDemo('day_planner_office', city, undefined, 8000);
        }
      }

      if (freshResponse) {
        const rawTimeline = freshResponse.day_plan_timeline || [];
        const normalizedBlocks = normalizeTimeline(rawTimeline);

        const existingDoneMap = new Map<string, boolean>();
        for (const block of prevState.scheduleBlocks) {
          existingDoneMap.set(block.title, block.completed);
          existingDoneMap.set(block.time + ':' + block.title, block.completed);
        }

        const mergedBlocks: ScheduleBlock[] = normalizedBlocks.map((b) => ({
          ...b,
          completed: existingDoneMap.get(b.time + ':' + b.title) ?? existingDoneMap.get(b.title) ?? b.completed,
        }));

        await storageService.setCachedSnapshot(freshResponse, 'none');
        await storageService.setScheduleBlocks(mergedBlocks);
        await storageService.setOfflineStatus(false, 'none', null);

        const newState = await storageService.getState();
        updateBadge(freshResponse.go_to_office, false);

        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage({ type: 'STATE_UPDATED', payload: newState }).catch(() => {});
        }
        return newState;
      }
    } catch (backendErr) {
      console.warn('[Locus SW] Live backend call timed out or failed; falling back to simulation:', backendErr);
    }
  }

  // 3. Offline / Simulation Fallback
  console.log(`[Locus SW] Serving simulation for ${city} (isCityChanging: ${isCityChanging})...`);
  let fallbackState: StorageState;

  if (!isCityChanging && !options.force && prevState.lastResponse && prevState.scheduleBlocks.length > 0 && !isCacheStale(prevState.lastSyncedAt)) {
    // Strategy A: Gracefully serve recent cached snapshot if same city and not forced
    await storageService.setOfflineStatus(true, 'cached', 'Backend offline: Displaying cached snapshot');
    fallbackState = await storageService.getState();
    updateBadge(fallbackState.lastResponse?.go_to_office, true);
  } else {
    // Strategy B: Generate fresh simulation for the requested city
    const simulated = generateOfflineSimulation({
      city,
      userRequest: options.userRequest,
    });

    const existingDoneMap = new Map<string, boolean>();
    for (const block of prevState.scheduleBlocks) {
      existingDoneMap.set(block.title, block.completed);
      existingDoneMap.set(block.time + ':' + block.title, block.completed);
    }

    const mergedSimBlocks: ScheduleBlock[] = simulated.scheduleBlocks.map((b) => ({
      ...b,
      completed: existingDoneMap.get(b.time + ':' + b.title) ?? existingDoneMap.get(b.title) ?? b.completed,
    }));

    await storageService.setCachedSnapshot(simulated.response, 'simulated');
    await storageService.setScheduleBlocks(mergedSimBlocks);
    await storageService.setOfflineStatus(true, 'simulated', 'Active deterministic simulation mode');

    fallbackState = await storageService.getState();
    updateBadge(simulated.response.go_to_office, true);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'STATE_UPDATED', payload: fallbackState }).catch(() => {});
  }
  return fallbackState;
}

// ── 4. MV3 Lifecycle & Startup Handlers ───────────────────────────────────────

if (typeof chrome !== 'undefined' && chrome.runtime) {
  // Handle Extension Installation / Reload / Update
  chrome.runtime.onInstalled?.addListener(async (details) => {
    console.log(`[Locus SW] onInstalled triggered (${details.reason}). Initializing...`);

    // Ensure storage state structure is initialized
    const stored = await storageService.getState();
    if (!stored.lastResponse && stored.scheduleBlocks.length === 0) {
      await storageService.setState(DEFAULT_STORAGE_STATE);
    }

    // Create 5-minute periodic alarm for background sync
    if (chrome.alarms) {
      chrome.alarms.create(ALARM_SYNC_NAME, {
        periodInMinutes: SYNC_INTERVAL_MINUTES,
        delayInMinutes: 0.1, // Fire first alarm after 6 seconds
      });
    }

    // Initialize Context Menus
    if (chrome.contextMenus) {
      try {
        chrome.contextMenus.create({
          id: 'locus-add-focus-task',
          title: '⚡ Schedule "%s" as Locus Focus Task',
          contexts: ['selection'],
        });
        chrome.contextMenus.create({
          id: 'locus-ask-advisor',
          title: '🧠 Ask Locus AI Advisor about "%s"',
          contexts: ['selection'],
        });
      } catch (err) {
        // Ignored if already created
      }
    }

    // Default initial badge
    updateBadge('wfh', false);

    // Initialize WebSocket connection
    wsClient.connect();

    // Run initial state synchronization
    await executeSync({ force: false, reason: 'installed' });
  });

  // Handle Context Menu item clicks
  chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
    if (!info.selectionText) return;

    if (info.menuItemId === 'locus-add-focus-task') {
      const state = await storageService.getState();
      const newBlock: ScheduleBlock = {
        id: `block-ctx-${Date.now()}`,
        time: 'Focus Slot',
        title: info.selectionText.slice(0, 100),
        activity: info.selectionText.slice(0, 100),
        category: 'deep_work',
        completed: false,
      };
      const updated = [...state.scheduleBlocks, newBlock];
      await storageService.setScheduleBlocks(updated);

      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-48.png',
          title: 'Locus Day Planner',
          message: `Added focus task: "${info.selectionText.slice(0, 45)}..."`,
        });
      }
    } else if (info.menuItemId === 'locus-ask-advisor') {
      await executeSync({ force: true, userRequest: info.selectionText, reason: 'context_menu' });
      if (tab?.id && chrome.sidePanel?.open) {
        await chrome.sidePanel.open({ tabId: tab.id });
      }
    }
  });

  // Global Keyboard Shortcut Command Listeners
  chrome.commands?.onCommand.addListener(async (command) => {
    console.log(`[Locus SW] Command received: ${command}`);
    if (command === 'toggle_sidepanel') {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ tabId: tab.id });
        }
      } catch (err) {
        console.warn('[Locus SW] Could not open side panel via shortcut:', err);
      }
    } else if (command === 'toggle_pomodoro') {
      const pomo = await storageService.getPomodoro();
      if (pomo.isRunning) {
        const remaining = pomo.targetEndTime
          ? Math.max(0, Math.round((pomo.targetEndTime - Date.now()) / 1000))
          : pomo.remainingSeconds;
        const updated = { ...pomo, isRunning: false, targetEndTime: null, remainingSeconds: remaining };
        await storageService.setPomodoro(updated);
        chrome.alarms?.clear(ALARM_POMODORO_NAME);
        chrome.runtime?.sendMessage?.({ type: 'POMODORO_UPDATED', payload: updated }).catch(() => {});
      } else {
        const duration = pomo.remainingSeconds > 0 ? pomo.remainingSeconds : pomo.durationSeconds;
        const target = Date.now() + duration * 1000;
        const updated = { ...pomo, isRunning: true, targetEndTime: target, remainingSeconds: duration };
        await storageService.setPomodoro(updated);
        chrome.alarms?.create(ALARM_POMODORO_NAME, { when: target });
        chrome.runtime?.sendMessage?.({ type: 'POMODORO_UPDATED', payload: updated }).catch(() => {});
      }
    }
  });

  // Handle Browser Startup
  chrome.runtime.onStartup?.addListener(async () => {
    console.log('[Locus SW] onStartup triggered. Verifying alarms & WebSocket...');

    // Ensure alarm is scheduled
    if (chrome.alarms) {
      chrome.alarms.get(ALARM_SYNC_NAME, (alarm) => {
        if (!alarm) {
          chrome.alarms.create(ALARM_SYNC_NAME, {
            periodInMinutes: SYNC_INTERVAL_MINUTES,
          });
        }
      });
    }

    // Re-establish WebSocket
    wsClient.connect();

    // Refresh badge from storage
    const state = await storageService.getState();
    if (state.lastResponse) {
      updateBadge(state.lastResponse.go_to_office, Boolean(state.isOffline));
    }
  });

  // Periodic & Pomodoro Alarm Listener
  chrome.alarms?.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_SYNC_NAME) {
      console.log('[Locus SW] 5-minute alarm triggered. Syncing background state...');
      await executeSync({ force: false, reason: 'alarm' });
    } else if (alarm.name === ALARM_POMODORO_NAME) {
      console.log('[Locus SW] Pomodoro finish alarm triggered!');
      const pomo = await storageService.getPomodoro();
      const updated = {
        ...pomo,
        isRunning: false,
        targetEndTime: null,
        remainingSeconds: pomo.durationSeconds,
        completedSessions: (pomo.completedSessions || 0) + 1,
      };
      await storageService.setPomodoro(updated);

      if (chrome.notifications) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon-128.png',
          title: '🎯 Focus Interval Complete!',
          message: 'Outstanding focus block! Time for a refreshing 5-minute break.',
        });
      }

      if (chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'POMODORO_COMPLETE', payload: updated }).catch(() => {});
      }
    }
  });

  // Watch storage modifications to guarantee badge is always 100% reactive
  chrome.storage?.onChanged?.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.lastResponse || changes.isOffline) {
        storageService.getState().then((state) => {
          const verdict = state.lastResponse ? normalizeVerdict(state.lastResponse.go_to_office) : 'wfh';
          updateBadge(verdict, Boolean(state.isOffline));
        }).catch(console.error);
      }
    }
  });

  // WebSocket Integration in Background Worker
  wsClient.connect();

  // When agent pipeline finishes on backend, sync full state immediately
  wsClient.onAgentComplete(async (payload) => {
    console.log('[Locus SW] Received agent_complete over WebSocket:', payload);
    await executeSync({ force: true, reason: 'ws_agent_complete' });
  });

  // Forward step_complete events to UI surfaces (Popup & Side Panel)
  wsClient.onStepComplete((payload) => {
    if (chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'PIPELINE_STEP_UPDATE',
        payload,
      }).catch(() => {
        // Harmless: popup or sidepanel may not currently be open
      });
    }
  });

  // Omnibox Keyword Search Handler ("locus <query>")
  if (chrome.omnibox) {
    chrome.omnibox.onInputChanged?.addListener(async (text, suggest) => {
      const state = await storageService.getState();
      const verdict = state.lastResponse ? normalizeVerdict(state.lastResponse.go_to_office).toUpperCase() : 'WFH';
      const activeTask = state.scheduleBlocks.find((b) => !b.completed)?.title || 'Sprint tasks';

      suggest([
        {
          content: `now`,
          description: `Locus Focus: "${activeTask}"`,
        },
        {
          content: `office`,
          description: `Locus Verdict: ${verdict} (${state.lastResponse?.city || 'Mumbai'})`,
        },
        {
          content: `plan ${text}`,
          description: `Locus: Plan day prioritizing "${text}"`,
        },
      ]);
    });

    chrome.omnibox.onInputEntered?.addListener(async (text) => {
      console.log(`[Locus SW] Omnibox input received: "${text}"`);
      const trimmed = text.trim();
      if (trimmed === 'office' || trimmed === 'now') {
        try {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (tab?.id && chrome.sidePanel?.open) {
            await chrome.sidePanel.open({ tabId: tab.id });
          }
        } catch {
          // Ignored
        }
        return;
      }

      const query = trimmed.replace(/^(plan|wfh)\s+/i, '').trim() || trimmed;
      await executeSync({
        force: true,
        userRequest: query,
        reason: 'omnibox_input',
      });
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && chrome.sidePanel?.open) {
          await chrome.sidePanel.open({ tabId: tab.id });
        }
      } catch {
        // Ignore if sidepanel is already open or tab not eligible
      }
    });
  }

  // ── 5. Runtime Message Bus Router ────────────────────────────────────────────

  chrome.runtime.onMessage.addListener(
    (
      message: ExtensionMessage | { type: string; payload?: any },
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      // Process message asynchronously
      handleMessageAsync(message)
        .then((res) => sendResponse(res))
        .catch((err) => {
          console.error('[Locus SW] Message handler error:', err);
          sendResponse({ success: false, error: String(err) });
        });

      // Return true to indicate asynchronous sendResponse in MV3
      return true;
    }
  );
}

async function handleMessageAsync(
  message: ExtensionMessage | { type: string; payload?: any }
): Promise<any> {
  const type = message.type;

  switch (type) {
    case 'PING':
      return {
        type: 'PONG',
        timestamp: Date.now(),
        wsStatus: wsClient.getStatus(),
        attempts: wsClient.getAttempts(),
      };

    case 'GET_STATE':
    case 'FETCH_STATE': {
      const state = await storageService.getState();
      return {
        success: true,
        state,
        wsStatus: wsClient.getStatus(),
      };
    }

    case 'SYNC_REQUEST': {
      const payload = (message as any).payload || {};
      const updatedState = await executeSync({
        force: true,
        city: payload.city,
        userRequest: payload.userRequest,
        reason: 'user_force_sync',
      });
      return {
        success: true,
        state: updatedState,
        isOffline: updatedState.isOffline,
      };
    }

    case 'CONTEXT_DETECTED': {
      const detected = (message as any).payload as DetectedContext;
      console.log('[Locus SW] CONTEXT_DETECTED:', detected);
      await storageService.setActiveContext(detected);
      return { success: true };
    }

    case 'RUN_PROMPT': {
      const prompt = (message as any).payload?.prompt || (message as any).payload?.userRequest || '';
      const city = (message as any).payload?.city;
      console.log('[Locus SW] RUN_PROMPT requested:', prompt);
      const resultState = await executeSync({
        force: true,
        city,
        userRequest: prompt,
        reason: 'run_prompt',
      });
      return {
        success: true,
        data: resultState.lastResponse,
        isOffline: resultState.isOffline,
      };
    }

    case 'TOGGLE_BLOCK': {
      const { blockId, completed } = (message as any).payload || {};
      const updated = await storageService.toggleBlockCompletion(blockId, Boolean(completed));
      return { success: true, updatedBlocks: updated };
    }

    case 'WS_STATUS': {
      return {
        status: wsClient.getStatus(),
        attempts: wsClient.getAttempts(),
        isConnected: wsClient.isConnected(),
      };
    }

    case 'OPEN_NOTION': {
      const url = (message as any).payload?.url;
      if (url && typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url });
        return { success: true };
      }
      const snapshot = await storageService.getCachedSnapshot();
      const notionUrl = snapshot?.notion_page_url;
      if (notionUrl && typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: notionUrl });
        return { success: true };
      }
      return { success: false, error: 'No Notion URL available' };
    }

    case 'EXPORT_ICS': {
      return { success: true };
    }

    case 'START_POMODORO': {
      const payload = (message as any).payload || {};
      const durationSeconds = payload.durationSeconds || 1500;
      const preset = payload.preset || 'focus_25';
      const targetEndTime = Date.now() + durationSeconds * 1000;
      const currentPomo = await storageService.getPomodoro();
      const updatedPomo = {
        ...currentPomo,
        preset,
        durationSeconds,
        remainingSeconds: durationSeconds,
        isRunning: true,
        targetEndTime,
      };
      await storageService.setPomodoro(updatedPomo);
      if (chrome.alarms) {
        chrome.alarms.create(ALARM_POMODORO_NAME, { when: targetEndTime });
      }
      return { success: true, pomodoro: updatedPomo };
    }

    case 'PAUSE_POMODORO': {
      const currentPomo = await storageService.getPomodoro();
      const remaining = currentPomo.targetEndTime
        ? Math.max(0, Math.round((currentPomo.targetEndTime - Date.now()) / 1000))
        : currentPomo.remainingSeconds;
      const updatedPomo = {
        ...currentPomo,
        isRunning: false,
        targetEndTime: null,
        remainingSeconds: remaining,
      };
      await storageService.setPomodoro(updatedPomo);
      if (chrome.alarms) {
        chrome.alarms.clear(ALARM_POMODORO_NAME);
      }
      return { success: true, pomodoro: updatedPomo };
    }

    case 'RESET_POMODORO': {
      const currentPomo = await storageService.getPomodoro();
      const updatedPomo = {
        ...currentPomo,
        isRunning: false,
        targetEndTime: null,
        remainingSeconds: currentPomo.durationSeconds,
      };
      await storageService.setPomodoro(updatedPomo);
      if (chrome.alarms) {
        chrome.alarms.clear(ALARM_POMODORO_NAME);
      }
      return { success: true, pomodoro: updatedPomo };
    }

    case 'SET_POMODORO_PRESET': {
      const payload = (message as any).payload || {};
      const durationSeconds = payload.durationSeconds || 1500;
      const preset = payload.preset || 'focus_25';
      const currentPomo = await storageService.getPomodoro();
      const updatedPomo = {
        ...currentPomo,
        preset,
        durationSeconds,
        remainingSeconds: durationSeconds,
        isRunning: false,
        targetEndTime: null,
      };
      await storageService.setPomodoro(updatedPomo);
      if (chrome.alarms) {
        chrome.alarms.clear(ALARM_POMODORO_NAME);
      }
      return { success: true, pomodoro: updatedPomo };
    }

    case 'GET_POMODORO': {
      const pomo = await storageService.getPomodoro();
      return { success: true, pomodoro: pomo };
    }

    default:
      console.warn('[Locus SW] Unhandled message type:', type);
      return { error: `Unhandled message type: ${type}` };
  }
}
