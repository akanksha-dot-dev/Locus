/**
 * Locus Chrome Extension Companion — RFC 5545 iCalendar (.ics) Generator
 * Generates valid iCalendar v2.0 files for 1-click day plan schedule export.
 * Adheres strictly to RFC 5545 specification.
 */

import { ScheduleBlock } from '../types/index';

/**
 * Escapes characters for iCalendar text fields according to RFC 5545 Section 3.3.11:
 * - Backslash (\) -> \\
 * - Semicolon (;) -> \;
 * - Comma (,) -> \,
 * - Newline (\n) -> \n
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats a Date object to RFC 5545 UTC timestamp format (YYYYMMDDTHHMMSSZ).
 */
export function formatIcsUtc(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const mins = pad(date.getUTCMinutes());
  const secs = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${mins}${secs}Z`;
}

/**
 * Formats a Date object to RFC 5545 local date-time format (YYYYMMDDTHHMMSS).
 */
export function formatIcsLocalDateTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `${year}${month}${day}T${hours}${mins}${secs}`;
}

/**
 * Parse time string like "09:00", "09:00 AM", "14:30 - 15:30" relative to a base date.
 */
export function parseBlockTime(
  timeStr: string | undefined,
  baseDate: Date = new Date()
): { start: Date; end: Date } {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  if (!timeStr) {
    // Default 1-hour block starting at current hour
    start.setMinutes(0, 0, 0);
    end.setTime(start.getTime() + 60 * 60 * 1000);
    return { start, end };
  }

  // Check for range like "09:00 - 10:30" or "09:00-10:00"
  const rangeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(?:AM|PM)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (rangeMatch && rangeMatch[1] && rangeMatch[2] && rangeMatch[3] && rangeMatch[4]) {
    let startH = parseInt(rangeMatch[1], 10);
    const startM = parseInt(rangeMatch[2], 10);
    let endH = parseInt(rangeMatch[3], 10);
    const endM = parseInt(rangeMatch[4], 10);

    const isPm = timeStr.toUpperCase().includes('PM');
    if (isPm && startH < 12 && !timeStr.toUpperCase().includes('AM')) {
      startH += 12;
    }
    if (isPm && endH < 12) {
      endH += 12;
    }

    start.setHours(startH, startM, 0, 0);
    end.setHours(endH, endM, 0, 0);
    if (end.getTime() <= start.getTime()) {
      end.setTime(start.getTime() + 60 * 60 * 1000);
    }
    return { start, end };
  }

  // Single time match like "09:00" or "9:00 AM"
  const singleMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (singleMatch && singleMatch[1] && singleMatch[2]) {
    let h = parseInt(singleMatch[1], 10);
    const m = parseInt(singleMatch[2], 10);
    const ampm = singleMatch[3]?.toUpperCase();

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    start.setHours(h, m, 0, 0);
    end.setTime(start.getTime() + 60 * 60 * 1000); // 1-hour default duration
    return { start, end };
  }

  // Fallback
  start.setMinutes(0, 0, 0);
  end.setTime(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

/**
 * Generates an RFC 5545 compliant VCALENDAR string from ScheduleBlock[].
 */
export function generateIcsCalendar(
  blocks: ScheduleBlock[],
  options: { calendarName?: string; baseDate?: Date } = {}
): string {
  const calName = escapeIcsText(options.calendarName || 'Locus Day Plan');
  const baseDate = options.baseDate || new Date();
  const now = new Date();
  const dtStamp = formatIcsUtc(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Locus Day Planner//Chrome Extension Companion//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:UTC',
  ];

  blocks.forEach((block, index) => {
    const { start, end } = parseBlockTime(block.time, baseDate);
    const dtStart = formatIcsLocalDateTime(start);
    const dtEnd = formatIcsLocalDateTime(end);
    const uid = `locus-${block.id || index}-${baseDate.toISOString().slice(0, 10)}@locus.local`;
    const summary = escapeIcsText(block.title || block.activity || `Task #${index + 1}`);
    const category = escapeIcsText((block.category || 'WORK').toUpperCase());
    const description = escapeIcsText(
      `Category: ${block.category || 'General'}\nStatus: ${block.completed ? 'Completed' : 'Pending'}\nManaged by Locus Day Planner`
    );

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`CATEGORIES:${category}`);
    lines.push(`STATUS:${block.completed ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}

/**
 * Triggers a browser download of the generated .ics file.
 */
export function downloadIcsFile(
  blocks: ScheduleBlock[],
  filename?: string
): void {
  const today = new Date().toISOString().slice(0, 10);
  const name = filename || `locus-day-plan-${today}.ics`;
  const icsContent = generateIcsCalendar(blocks);

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
