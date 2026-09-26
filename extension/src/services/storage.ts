/**
 * Locus Chrome Extension Companion — Type-Safe Storage Service
 * Milestone 2: chrome.storage.local wrapper, snapshot cache, settings, and activeContext hydration.
 * 
 * Provides:
 *   - Type-safe persistent storage wrapping chrome.storage.local
 *   - In-memory fallback for non-extension environments (Vitest/Node/dev scripts)
 *   - Graceful fallback merging with DEFAULT_STORAGE_STATE and DEFAULT_SETTINGS
 *   - Atomic updates for snapshot + timeline synchronization
 *   - Change subscription listener with cleanup
 */

import {
  AgentResponse,
  DEFAULT_POMODORO_STATE,
  DEFAULT_SETTINGS,
  DEFAULT_STORAGE_STATE,
  DetectedContext,
  ExtensionSettings,
  OfflineSource,
  PomodoroState,
  ScheduleBlock,
  StorageState,
  normalizeTimeline,
} from '../types/index';

// ── 1. In-Memory Mock Store for Non-Extension Environments ──────────────────

class InMemoryStorage {
  private store: Map<string, any> = new Map();

  async get(keys: string | string[] | null | Record<string, any>): Promise<Record<string, any>> {
    if (keys === null) {
      const obj: Record<string, any> = {};
      this.store.forEach((val, key) => {
        obj[key] = val;
      });
      return obj;
    }
    if (typeof keys === 'string') {
      return { [keys]: this.store.get(keys) };
    }
    if (Array.isArray(keys)) {
      const obj: Record<string, any> = {};
      for (const k of keys) {
        if (this.store.has(k)) obj[k] = this.store.get(k);
      }
      return obj;
    }
    if (typeof keys === 'object') {
      const obj: Record<string, any> = { ...keys };
      for (const k of Object.keys(keys)) {
        if (this.store.has(k)) obj[k] = this.store.get(k);
      }
      return obj;
    }
    return {};
  }

  async set(items: Record<string, any>): Promise<void> {
    for (const [k, v] of Object.entries(items)) {
      this.store.set(k, v);
    }
  }

  async remove(keys: string | string[]): Promise<void> {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) {
      this.store.delete(k);
    }
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

// ── 2. Storage Adapter ───────────────────────────────────────────────────────

class StorageAdapter {
  private inMemoryFallback: InMemoryStorage | null = null;

  private isChromeStorageAvailable(): boolean {
    return (
      typeof chrome !== 'undefined' &&
      Boolean(chrome.storage) &&
      Boolean(chrome.storage.local)
    );
  }

  private getFallback(): InMemoryStorage {
    if (!this.inMemoryFallback) {
      this.inMemoryFallback = new InMemoryStorage();
    }
    return this.inMemoryFallback;
  }

  async getRaw(keys: string | string[] | null): Promise<Record<string, any>> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.get(keys, (items) => {
          resolve(items || {});
        });
      });
    }
    return this.getFallback().get(keys);
  }

  async setRaw(items: Record<string, any>): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.set(items, () => {
          resolve();
        });
      });
    }
    return this.getFallback().set(items);
  }

  async clearRaw(): Promise<void> {
    if (this.isChromeStorageAvailable()) {
      return new Promise((resolve) => {
        chrome.storage.local.clear(() => {
          resolve();
        });
      });
    }
    return this.getFallback().clear();
  }

  addChangeListener(listener: (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => void): () => void {
    if (this.isChromeStorageAvailable() && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
    return () => {};
  }
}

// ── 3. High-Level StorageService Implementation ──────────────────────────────

export class StorageService {
  private adapter: StorageAdapter;

  constructor() {
    this.adapter = new StorageAdapter();
  }

  /**
   * Retrieves the full hydrated state, merging any missing fields with defaults.
   */
  async getState(): Promise<StorageState> {
    const raw = await this.adapter.getRaw(null);

    const mergedSettings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      ...(raw.settings || {}),
    };

    return {
      schemaVersion: raw.schemaVersion ?? DEFAULT_STORAGE_STATE.schemaVersion,
      lastResponse: raw.lastResponse || DEFAULT_STORAGE_STATE.lastResponse,
      scheduleBlocks: Array.isArray(raw.scheduleBlocks)
        ? raw.scheduleBlocks
        : DEFAULT_STORAGE_STATE.scheduleBlocks,
      activeContext: raw.activeContext || DEFAULT_STORAGE_STATE.activeContext,
      settings: mergedSettings,
      isOffline: typeof raw.isOffline === 'boolean' ? raw.isOffline : DEFAULT_STORAGE_STATE.isOffline,
      lastSyncedAt: typeof raw.lastSyncedAt === 'number' ? raw.lastSyncedAt : DEFAULT_STORAGE_STATE.lastSyncedAt,
      offlineSource: raw.offlineSource || DEFAULT_STORAGE_STATE.offlineSource,
      offlineReason: raw.offlineReason !== undefined ? raw.offlineReason : DEFAULT_STORAGE_STATE.offlineReason,
      pomodoro: raw.pomodoro || DEFAULT_POMODORO_STATE,
      error: raw.error !== undefined ? raw.error : DEFAULT_STORAGE_STATE.error,
    };
  }

  /**
   * Partially updates the persistent state.
   */
  async setState(partial: Partial<StorageState>): Promise<StorageState> {
    await this.adapter.setRaw(partial);
    return this.getState();
  }

  /**
   * Retrieves the cached snapshot (lastResponse) or null.
   */
  async getCachedSnapshot(): Promise<AgentResponse | null> {
    const raw = await this.adapter.getRaw('lastResponse');
    return raw.lastResponse || null;
  }

  /**
   * Atomically caches an AgentResponse snapshot, normalizes timeline schedule blocks,
   * updates the lastSyncedAt timestamp, and resets the offline error flag.
   */
  async setCachedSnapshot(
    response: AgentResponse,
    source: OfflineSource = 'none'
  ): Promise<void> {
    const normalizedBlocks = normalizeTimeline(response.day_plan_timeline);

    await this.adapter.setRaw({
      lastResponse: response,
      scheduleBlocks: normalizedBlocks,
      lastSyncedAt: Date.now(),
      isOffline: source !== 'none',
      offlineSource: source,
      error: null,
    });
  }

  /**
   * Retrieves current schedule blocks.
   */
  async getScheduleBlocks(): Promise<ScheduleBlock[]> {
    const raw = await this.adapter.getRaw('scheduleBlocks');
    return Array.isArray(raw.scheduleBlocks) ? raw.scheduleBlocks : [];
  }

  /**
   * Sets schedule blocks.
   */
  async setScheduleBlocks(blocks: ScheduleBlock[]): Promise<void> {
    await this.adapter.setRaw({ scheduleBlocks: blocks });
  }

  /**
   * Toggles completion status for a specific schedule block by ID.
   * Returns updated blocks array.
   */
  async toggleBlockCompletion(blockId: string, completed: boolean): Promise<ScheduleBlock[]> {
    const blocks = await this.getScheduleBlocks();
    const updated = blocks.map((b) => (b.id === blockId ? { ...b, completed } : b));
    await this.setScheduleBlocks(updated);
    return updated;
  }

  /**
   * Retrieves the currently detected context (Jira ticket or GitHub PR).
   */
  async getActiveContext(): Promise<DetectedContext | null> {
    const raw = await this.adapter.getRaw('activeContext');
    return raw.activeContext || null;
  }

  /**
   * Sets or clears the active browser context.
   */
  async setActiveContext(context: DetectedContext | null): Promise<void> {
    await this.adapter.setRaw({ activeContext: context });
  }

  /**
   * Explicitly clears active context.
   */
  async clearActiveContext(): Promise<void> {
    await this.adapter.setRaw({ activeContext: null });
  }

  /**
   * Retrieves extension settings with fallback defaults.
   */
  async getSettings(): Promise<ExtensionSettings> {
    const raw = await this.adapter.getRaw('settings');
    return {
      ...DEFAULT_SETTINGS,
      ...(raw.settings || {}),
    };
  }

  /**
   * Updates settings partially.
   */
  async updateSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    const current = await this.getSettings();
    const updated: ExtensionSettings = {
      ...current,
      ...partial,
    };
    await this.adapter.setRaw({ settings: updated });
    return updated;
  }

  /**
   * Alias for updateSettings.
   */
  async setSettings(partial: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
    return this.updateSettings(partial);
  }

  /**
   * Retrieves persistent Pomodoro state.
   */
  async getPomodoro(): Promise<PomodoroState> {
    const raw = await this.adapter.getRaw('pomodoro');
    return raw.pomodoro || DEFAULT_POMODORO_STATE;
  }

  /**
   * Persists Pomodoro state.
   */
  async setPomodoro(pomodoro: PomodoroState): Promise<void> {
    await this.adapter.setRaw({ pomodoro });
  }

  /**
   * Updates offline status flag, offline source indicator, and optional error message.
   */
  async setOfflineStatus(
    isOffline: boolean,
    source: OfflineSource = 'none',
    error: string | null = null
  ): Promise<void> {
    await this.adapter.setRaw({
      isOffline,
      offlineSource: isOffline ? source : 'none',
      offlineReason: isOffline ? error : null,
      error: isOffline ? error : null,
    });
  }

  /**
   * Resets storage completely to DEFAULT_STORAGE_STATE.
   */
  async clearStorage(): Promise<void> {
    await this.adapter.setRaw(DEFAULT_STORAGE_STATE);
  }

  /**
   * Alias for clearStorage() used in tests and resets.
   */
  async reset(): Promise<void> {
    await this.clearStorage();
  }

  /**
   * Subscribes to storage updates from chrome.storage.onChanged.
   * Invokes listener with the full hydrated state whenever the 'local' area changes.
   * Returns an unsubscribe callback function.
   */
  subscribe(listener: (state: StorageState) => void): () => void {
    return this.adapter.addChangeListener((changes, areaName) => {
      if (areaName === 'local') {
        this.getState().then(listener).catch(console.error);
      }
    });
  }
}

// Export default singleton instance
export const storageService = new StorageService();
