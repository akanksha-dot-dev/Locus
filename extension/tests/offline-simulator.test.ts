import { describe, it, expect } from 'vitest';
import {
  generateOfflineSimulation,
  stringToSeed,
  createMulberry32,
} from '../src/services/offline-simulator';

describe('Deterministic Offline Simulator', () => {
  it('generates deterministic simulation given identical seed and city', () => {
    const sim1 = generateOfflineSimulation({ city: 'Mumbai', seed: 12345 });
    const sim2 = generateOfflineSimulation({ city: 'Mumbai', seed: 12345 });

    expect(sim1.response.city).toBe('Mumbai');
    expect(sim2.response.city).toBe('Mumbai');
    expect(sim1.response.weather_score).toBe(sim2.response.weather_score);
    expect(sim1.response.temperature_c).toBe(sim2.response.temperature_c);
    expect(sim1.response.go_to_office).toBe(sim2.response.go_to_office);
    expect(sim1.response.office_reason).toBe(sim2.response.office_reason);
    expect(sim1.scheduleBlocks).toEqual(sim2.scheduleBlocks);
  });

  it('populates all 38 fields required by AgentResponse without throwing', () => {
    const cities = ['Mumbai', 'Bengaluru', 'San Francisco', 'London', 'Tokyo', 'UnknownCity'];

    for (const city of cities) {
      const result = generateOfflineSimulation({ city });
      const res = result.response;

      expect(res.user_request).toBeDefined();
      expect(res.user_email).toBeDefined();
      expect(res.city).toBe(city);
      expect(res.weather_data).toBeDefined();
      expect(res.weather_summary).toBeDefined();
      expect(typeof res.temperature_c).toBe('number');
      expect(typeof res.feels_like_c).toBe('number');
      expect(typeof res.humidity).toBe('number');
      expect(typeof res.wind_speed).toBe('number');
      expect(res.weather_condition).toBeDefined();
      expect(res.weather_icon).toBeDefined();
      expect(Array.isArray(res.weather_alerts)).toBe(true);
      expect(res.forecast_summary).toBeDefined();

      expect(Array.isArray(res.gmail_events)).toBe(true);
      expect(typeof res.gmail_summary).toBe('string');
      expect(typeof res.has_outdoor_plans).toBe('boolean');
      expect(typeof res.has_travel_plans).toBe('boolean');

      expect(Array.isArray(res.jira_tickets)).toBe(true);
      expect(typeof res.jira_estimated_hours).toBe('number');
      expect(typeof res.jira_summary).toBe('string');

      expect(Array.isArray(res.github_prs)).toBe(true);
      expect(typeof res.github_estimated_hours).toBe('number');
      expect(typeof res.github_summary).toBe('string');

      expect(typeof res.weather_score).toBe('number');
      expect(res.weather_score).toBeGreaterThanOrEqual(0);
      expect(res.weather_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(res.recommendations)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(res.risk_level);
      expect(res.outfit_suggestion).toBeDefined();
      expect(Array.isArray(res.activity_adjustments)).toBe(true);
      expect(res.ai_summary).toBeDefined();
      expect(typeof res.should_alert).toBe('boolean');
      expect(['office', 'wfh', 'hybrid']).toContain(res.go_to_office);
      expect(res.office_reason).toBeDefined();

      expect(Array.isArray(res.day_plan_timeline)).toBe(true);
      expect(res.day_plan_timeline.length).toBeGreaterThan(0);
      expect(typeof res.estimated_productive_hours).toBe('number');

      expect(res.notion_page_url).toBeDefined();
      expect(typeof res.notion_logged).toBe('boolean');
      expect(typeof res.slack_message_sent).toBe('boolean');
      expect(typeof res.email_sent).toBe('boolean');

      expect(Array.isArray(res.execution_log)).toBe(true);
      expect(res.processed_at).toBeDefined();

      // Schedule blocks parsed
      expect(result.scheduleBlocks.length).toBeGreaterThan(0);
      expect(result.scheduleBlocks[0]!.title).toBeDefined();
    }
  });

  it('mulberry32 PRNG produces values in [0, 1)', () => {
    const rng = createMulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('stringToSeed generates consistent integers', () => {
    expect(stringToSeed('hello')).toBe(stringToSeed('hello'));
    expect(stringToSeed('Mumbai')).not.toBe(stringToSeed('London'));
  });

  it('produces distinct climatology and schedule locations for different world cities', () => {
    const london = generateOfflineSimulation({ city: 'London' });
    const dubai = generateOfflineSimulation({ city: 'Dubai' });
    const custom = generateOfflineSimulation({ city: 'Reykjavik' });

    expect(london.response.city).toBe('London');
    expect(dubai.response.city).toBe('Dubai');
    expect(custom.response.city).toBe('Reykjavik');

    // Temperatures should differ (Dubai hot vs London cool)
    expect(dubai.response.temperature_c).toBeGreaterThan(london.response.temperature_c);

    // Block locations reflect respective cities
    expect(london.scheduleBlocks[0]?.location).toContain('London');
    expect(dubai.scheduleBlocks[0]?.location).toContain('Dubai');
    expect(custom.scheduleBlocks[0]?.location).toContain('Reykjavik');
  });
});
