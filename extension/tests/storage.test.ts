import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../src/services/storage';
import { ScheduleBlock, DetectedContext } from '../src/types/index';

describe('Storage Service (In-Memory Fallback & API)', () => {
  beforeEach(async () => {
    await storageService.reset();
  });

  it('initializes with default state when empty', async () => {
    const state = await storageService.getState();
    expect(state.schemaVersion).toBe(1);
    expect(state.lastResponse).toBeNull();
    expect(state.scheduleBlocks).toEqual([]);
    expect(state.isOffline).toBe(false);
    expect(state.settings.defaultCity).toBe('Mumbai');
  });

  it('sets and retrieves schedule blocks', async () => {
    const testBlocks: ScheduleBlock[] = [
      { id: '1', time: '09:00', title: 'Standup', completed: false, category: 'meeting' },
      { id: '2', time: '11:00', title: 'Bug triage', completed: true, category: 'deep_work' },
    ];

    await storageService.setScheduleBlocks(testBlocks);
    const state = await storageService.getState();
    expect(state.scheduleBlocks.length).toBe(2);
    expect(state.scheduleBlocks[0]!.title).toBe('Standup');
    expect(state.scheduleBlocks[1]!.completed).toBe(true);
  });

  it('toggles block completion status by ID', async () => {
    const testBlocks: ScheduleBlock[] = [
      { id: 'block-1', time: '09:00', title: 'Task 1', completed: false, category: 'general' },
      { id: 'block-2', time: '10:00', title: 'Task 2', completed: false, category: 'general' },
    ];
    await storageService.setScheduleBlocks(testBlocks);

    // Toggle block-1 to completed
    const updated = await storageService.toggleBlockCompletion('block-1', true);
    expect(updated[0]!.completed).toBe(true);
    expect(updated[1]!.completed).toBe(false);

    // Verify persisted
    const state = await storageService.getState();
    expect(state.scheduleBlocks[0]!.completed).toBe(true);
  });

  it('sets and retrieves active tab context', async () => {
    const context: DetectedContext = {
      source: 'jira',
      id: 'LOCUS-101',
      title: 'Fix Redis connection leak',
      url: 'https://locus.atlassian.net/browse/LOCUS-101',
      timestamp: Date.now(),
    };

    await storageService.setActiveContext(context);
    const active = await storageService.getActiveContext();
    expect(active).toBeDefined();
    expect(active?.id).toBe('LOCUS-101');
    expect(active?.source).toBe('jira');

    // Clear context
    await storageService.clearActiveContext();
    const cleared = await storageService.getActiveContext();
    expect(cleared).toBeNull();
  });

  it('updates settings cleanly without clobbering existing settings', async () => {
    await storageService.updateSettings({ defaultCity: 'Bengaluru', autoOpenSidePanel: true });
    const settings = await storageService.getSettings();
    expect(settings.defaultCity).toBe('Bengaluru');
    expect(settings.autoOpenSidePanel).toBe(true);
    expect(settings.syncIntervalMinutes).toBe(5); // Retained default
  });

  it('handles offline status flags and rationale', async () => {
    await storageService.setOfflineStatus(true, 'simulated', 'Network disconnected');
    const state = await storageService.getState();
    expect(state.isOffline).toBe(true);
    expect(state.offlineSource).toBe('simulated');
    expect(state.offlineReason).toBe('Network disconnected');
  });
});
