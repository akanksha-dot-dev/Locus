import { describe, it, expect } from 'vitest';
import { POMODORO_PRESETS } from '../src/types/index';

describe('Pomodoro Engine Presets & Configs', () => {
  it('defines 4 canonical focus & break presets', () => {
    expect(POMODORO_PRESETS).toHaveLength(4);

    const focus25 = POMODORO_PRESETS.find((p) => p.id === 'focus_25');
    expect(focus25).toBeDefined();
    expect(focus25?.durationSeconds).toBe(1500);

    const deep50 = POMODORO_PRESETS.find((p) => p.id === 'deep_50');
    expect(deep50).toBeDefined();
    expect(deep50?.durationSeconds).toBe(3000);

    const break5 = POMODORO_PRESETS.find((p) => p.id === 'short_break_5');
    expect(break5).toBeDefined();
    expect(break5?.durationSeconds).toBe(300);

    const rest15 = POMODORO_PRESETS.find((p) => p.id === 'long_break_15');
    expect(rest15).toBeDefined();
    expect(rest15?.durationSeconds).toBe(900);
  });
});
