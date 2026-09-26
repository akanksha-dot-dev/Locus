import { describe, it, expect } from 'vitest';
import { generateOfflineSimulation } from '../src/services/offline-simulator';
import { JudgeScenarioKey } from '../src/types/index';

describe('Judge Scenario Simulator (Track 5 Lab)', () => {
  it('handles monsoon_storm scenario correctly', () => {
    const sim = generateOfflineSimulation({
      city: 'Gurgaon',
      scenarioKey: 'monsoon_storm',
    });

    expect(sim.response.go_to_office).toBe('wfh');
    expect(sim.response.weather_summary.toLowerCase()).toContain('storm');
    expect(sim.response.weather_alerts.length).toBeGreaterThan(0);
    expect(sim.response.outfit_suggestion.toLowerCase()).toContain('rain');
    expect(sim.scheduleBlocks.some((b) => b.title.toLowerCase().includes('remote') || b.title.toLowerCase().includes('monsoon'))).toBe(true);
  });

  it('handles airport_transit scenario correctly', () => {
    const sim = generateOfflineSimulation({
      city: 'Delhi',
      scenarioKey: 'airport_transit',
    });

    expect(sim.response.go_to_office).toBe('wfh');
    expect(sim.response.has_travel_plans).toBe(true);
    expect(sim.response.office_reason?.toLowerCase()).toContain('flight');
    expect(sim.scheduleBlocks.some((b) => b.title.toLowerCase().includes('flight') || b.title.toLowerCase().includes('airport'))).toBe(true);
  });

  it('handles heatwave scenario correctly', () => {
    const sim = generateOfflineSimulation({
      city: 'Gurgaon',
      scenarioKey: 'heatwave',
    });

    expect(sim.response.go_to_office).toBe('wfh');
    expect(sim.response.temperature_c).toBeGreaterThanOrEqual(40);
    expect(sim.response.weather_alerts.length).toBeGreaterThan(0);
    expect(sim.response.outfit_suggestion.toLowerCase()).toContain('hydration');
  });

  it('handles sprint_crunch scenario correctly', () => {
    const sim = generateOfflineSimulation({
      city: 'Gurgaon',
      scenarioKey: 'sprint_crunch',
    });

    expect(sim.response.go_to_office).toBe('wfh');
    expect(sim.response.jira_estimated_hours).toBeGreaterThanOrEqual(5);
    expect(sim.scheduleBlocks.some((b) => b.title.toLowerCase().includes('sprint') || b.category === 'deep_work')).toBe(true);
  });

  it('handles normal scenario correctly', () => {
    const sim = generateOfflineSimulation({
      city: 'Gurgaon',
      scenarioKey: 'normal',
    });

    expect(sim.response.city).toBe('Gurgaon');
    expect(sim.scheduleBlocks.length).toBeGreaterThan(0);
    expect(sim.response.day_plan_timeline.length).toBeGreaterThan(0);
  });

  it('works seamlessly across all defined JudgeScenarioKey variants', () => {
    const scenarios: JudgeScenarioKey[] = ['normal', 'monsoon_storm', 'airport_transit', 'heatwave', 'sprint_crunch'];

    for (const key of scenarios) {
      const res = generateOfflineSimulation({ city: 'Bengaluru', scenarioKey: key });
      expect(res.response).toBeDefined();
      expect(res.scheduleBlocks.length).toBeGreaterThan(0);
      expect(['office', 'wfh', 'hybrid']).toContain(res.response.go_to_office);
    }
  });
});
