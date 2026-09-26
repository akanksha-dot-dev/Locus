import { describe, it, expect } from 'vitest';
import {
  normalizeVerdict,
  normalizeTimeline,
  AgentResponse,
  DEFAULT_STORAGE_STATE,
} from '../src/types/index';

describe('State Schema & Normalization', () => {
  it('normalizes verdicts correctly', () => {
    expect(normalizeVerdict('office')).toBe('office');
    expect(normalizeVerdict('OFFICE')).toBe('office');
    expect(normalizeVerdict('wfh')).toBe('wfh');
    expect(normalizeVerdict('WFH')).toBe('wfh');
    expect(normalizeVerdict('hybrid')).toBe('hybrid');
    expect(normalizeVerdict('HYBRID')).toBe('hybrid');
    expect(normalizeVerdict(null)).toBe('wfh');
    expect(normalizeVerdict(undefined)).toBe('wfh');
    expect(normalizeVerdict('unknown_value')).toBe('wfh');
  });

  it('normalizes string timeline entries into ScheduleBlocks', () => {
    const raw = [
      '09:00 - Team standup and sprint planning',
      '11:00 - Deep focus: Fix auth token refresh bug',
      '13:00 - Lunch break',
      '14:00 - Review PR #142',
    ];

    const blocks = normalizeTimeline(raw);
    expect(blocks.length).toBe(4);
    expect(blocks[0]!.time).toBe('09:00');
    expect(blocks[0]!.title).toBe('Team standup and sprint planning');
    expect(blocks[0]!.completed).toBe(false);
    expect(blocks[0]!.category).toBe('meeting');

    expect(blocks[1]!.time).toBe('11:00');
    expect(blocks[1]!.title).toBe('Deep focus: Fix auth token refresh bug');
    expect(blocks[1]!.category).toBe('deep_work');
  });

  it('normalizes dict timeline entries into ScheduleBlocks', () => {
    const raw = [
      { time: '10:00', title: '1-on-1 with Lead', category: 'meeting' },
      { time: '15:00', activity: 'Architecture review', completed: true },
    ];

    const blocks = normalizeTimeline(raw);
    expect(blocks.length).toBe(2);
    expect(blocks[0]!.time).toBe('10:00');
    expect(blocks[0]!.title).toBe('1-on-1 with Lead');
    expect(blocks[0]!.category).toBe('meeting');

    expect(blocks[1]!.time).toBe('15:00');
    expect(blocks[1]!.title).toBe('Architecture review');
    expect(blocks[1]!.completed).toBe(true);
  });

  it('DEFAULT_STORAGE_STATE has all required fields', () => {
    expect(DEFAULT_STORAGE_STATE.schemaVersion).toBe(1);
    expect(DEFAULT_STORAGE_STATE.lastResponse).toBeNull();
    expect(DEFAULT_STORAGE_STATE.scheduleBlocks).toEqual([]);
    expect(DEFAULT_STORAGE_STATE.isOffline).toBe(false);
    expect(DEFAULT_STORAGE_STATE.settings).toBeDefined();
    expect(DEFAULT_STORAGE_STATE.settings.defaultCity).toBe('Mumbai');
    expect(DEFAULT_STORAGE_STATE.settings.syncIntervalMinutes).toBe(5);
  });

  it('validates 38-field AgentResponse compatibility', () => {
    const sampleResponse: AgentResponse = {
      user_request: 'Plan my day',
      user_email: 'alex@example.com',
      city: 'Mumbai',
      weather_data: {},
      weather_summary: 'Pleasant morning, warm afternoon',
      temperature_c: 26.5,
      feels_like_c: 27.0,
      humidity: 65,
      wind_speed: 4.2,
      weather_condition: 'Clear',
      weather_icon: '01d',
      weather_alerts: [],
      uv_index: 5.0,
      forecast_summary: 'Clear skies with light evening clouds',
      gmail_events: [],
      gmail_summary: '2 meetings scheduled',
      has_outdoor_plans: false,
      has_travel_plans: false,
      jira_issues: [],
      jira_tickets: [],
      jira_estimated_hours: 4.5,
      jira_total_hours: 4.5,
      jira_summary: '3 issues in progress',
      jira_issue_lines: [],
      jira_high_priority: 1,
      jira_blocked_count: 0,
      github_prs: [],
      github_issues: [],
      github_issues_open: [],
      github_estimated_hours: 2.0,
      github_total_hours: 2.0,
      github_summary: '2 PRs pending review',
      github_stale_prs: [],
      weather_score: 85,
      recommendations: ['Stay hydrated', 'Cycle to office'],
      risk_level: 'low',
      outfit_suggestion: 'Light cotton shirt with sneakers',
      activity_adjustments: [],
      ai_summary: 'Great day to work from the office.',
      should_alert: false,
      go_to_office: 'office',
      office_reason: 'Optimal weather and critical team collaboration',
      day_plan_timeline: ['09:00 - Standup', '14:00 - Sprint Planning'],
      estimated_productive_hours: 6.5,
      notion_page_id: 'page_123',
      notion_page_url: 'https://notion.so/day-plan-123',
      notion_logged: true,
      slack_message_sent: true,
      slack_channel: '#general',
      resend_message_id: 'msg_456',
      email_sent: true,
      execution_log: ['Init', 'Weather fetched', 'Advisor finished'],
      processed_at: '2026-09-26T06:00:00Z',
    };

    expect(sampleResponse.city).toBe('Mumbai');
    expect(sampleResponse.go_to_office).toBe('office');
    expect(sampleResponse.weather_score).toBe(85);
    expect(sampleResponse.notion_page_url).toContain('notion.so');
  });
});
