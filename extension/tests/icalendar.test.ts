import { describe, it, expect } from 'vitest';
import {
  generateIcsCalendar,
  escapeIcsText,
  formatIcsUtc,
  formatIcsLocalDateTime,
  parseBlockTime,
} from '../src/services/icalendar';
import { ScheduleBlock } from '../src/types/index';

describe('RFC 5545 iCalendar (.ics) Generator', () => {
  it('escapes special characters correctly according to RFC 5545', () => {
    expect(escapeIcsText('Hello, world; test\\foo\nbar')).toBe(
      'Hello\\, world\\; test\\\\foo\\nbar'
    );
    expect(escapeIcsText('')).toBe('');
  });

  it('formats dates into standard RFC 5545 UTC timestamp strings', () => {
    const d = new Date(Date.UTC(2026, 8, 26, 12, 30, 45)); // Sept 26, 2026
    expect(formatIcsUtc(d)).toBe('20260926T123045Z');
  });

  it('formats dates into local date-time strings without Z suffix', () => {
    const d = new Date(2026, 8, 26, 9, 15, 0);
    const formatted = formatIcsLocalDateTime(d);
    expect(formatted).toMatch(/^20260926T\d{6}$/);
  });

  it('parses range time strings like "09:00 - 10:30"', () => {
    const baseDate = new Date(2026, 8, 26);
    const { start, end } = parseBlockTime('09:00 - 10:30', baseDate);

    expect(start.getHours()).toBe(9);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(10);
    expect(end.getMinutes()).toBe(30);
    expect(end.getTime() - start.getTime()).toBe(90 * 60 * 1000);
  });

  it('parses single time string with default 1-hour block', () => {
    const baseDate = new Date(2026, 8, 26);
    const { start, end } = parseBlockTime('14:00', baseDate);

    expect(start.getHours()).toBe(14);
    expect(start.getMinutes()).toBe(0);
    expect(end.getHours()).toBe(15);
    expect(end.getMinutes()).toBe(0);
  });

  it('generates fully valid RFC 5545 VCALENDAR structure', () => {
    const blocks: ScheduleBlock[] = [
      {
        id: 'block-1',
        time: '09:00 - 10:00',
        title: 'Morning Standup & Triage',
        category: 'meeting',
        completed: true,
      },
      {
        id: 'block-2',
        time: '10:30 - 12:30',
        title: 'Deep Focus: Build MV3 Extension',
        category: 'deep_work',
        completed: false,
      },
    ];

    const ics = generateIcsCalendar(blocks, { calendarName: 'Locus Day Plan' });

    // Validate VCALENDAR envelope
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Locus Day Planner//Chrome Extension Companion//EN');
    expect(ics).toContain('CALSCALE:GREGORIAN');
    expect(ics).toContain('METHOD:PUBLISH');
    expect(ics).toContain('X-WR-CALNAME:Locus Day Plan');
    expect(ics).toContain('END:VCALENDAR');

    // Validate VEVENT entries
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Morning Standup & Triage');
    expect(ics).toContain('STATUS:COMPLETED');
    expect(ics).toContain('SUMMARY:Deep Focus: Build MV3 Extension');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('CATEGORIES:MEETING');
    expect(ics).toContain('CATEGORIES:DEEP_WORK');
    expect(ics).toContain('END:VEVENT');

    // CRLF line endings required by RFC 5545
    expect(ics).toContain('\r\n');
  });
});
