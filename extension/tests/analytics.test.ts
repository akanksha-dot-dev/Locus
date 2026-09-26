import { describe, it, expect } from 'vitest';
import { ScheduleBlock, calculateDayAnalytics } from '../src/types/index';

describe('Day Analytics Calculation Engine', () => {
  it('calculates 0% completion rate for empty schedule', () => {
    const analytics = calculateDayAnalytics([]);
    expect(analytics.totalBlocks).toBe(0);
    expect(analytics.completedBlocks).toBe(0);
    expect(analytics.completionRate).toBe(0);
    expect(analytics.deepWorkHours).toBe(0);
  });

  it('accurately calculates completion rate and category hour distributions', () => {
    const blocks: ScheduleBlock[] = [
      {
        id: '1',
        time: '09:00 - 11:00',
        title: 'Deep coding in Locus',
        category: 'deep_work',
        completed: true,
      },
      {
        id: '2',
        time: '11:00 - 12:00',
        title: 'Sprint standup',
        category: 'meeting',
        completed: true,
      },
      {
        id: '3',
        time: '12:00 - 12:30',
        title: 'Chai break',
        category: 'break',
        completed: false,
      },
      {
        id: '4',
        time: '14:00 - 16:00',
        title: 'PR code review and architectural refactor',
        category: 'deep_work',
        completed: false,
      },
    ];

    const analytics = calculateDayAnalytics(blocks);
    expect(analytics.totalBlocks).toBe(4);
    expect(analytics.completedBlocks).toBe(2);
    expect(analytics.completionRate).toBe(50); // 2 of 4 is 50%
    expect(analytics.deepWorkHours).toBe(4.0); // 2h + 2h
    expect(analytics.meetingHours).toBe(1.0);  // 1h
    expect(analytics.breakHours).toBe(0.5);    // 0.5h
  });
});
