import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isSoundEnabled, playSuccessChime, playTactileTick, setSoundEnabled } from '../src/utils/audio';

describe('Web Audio Synthesizer Unit Tests', () => {
  beforeEach(() => {
    setSoundEnabled(true);
  });

  it('correctly manages sound enabled / disabled toggle', () => {
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('runs safely in headless / non-browser environment without throwing', () => {
    expect(() => playTactileTick(800)).not.toThrow();
    expect(() => playSuccessChime()).not.toThrow();
  });

  it('respects soundEnabled = false by suppressing playback', () => {
    setSoundEnabled(false);
    expect(() => playTactileTick(400)).not.toThrow();
    expect(() => playSuccessChime()).not.toThrow();
  });
});
