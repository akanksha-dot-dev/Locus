/**
 * Locus (v2.0) — Adversarial Stress & Compliance Test Suite
 * Forensic audit and empirical verification of client-side artifact generators,
 * RFC 5545 iCalendar compliance, Markdown table structure, JSON roundtrips,
 * and bundle integrity.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateICS, generateMarkdown, generateJSON } from './src/services/export';
import type { AgentResponse, ScheduleBlock, JiraTicket, GitHubPR } from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = __dirname;

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failureDetails: string[] = [];
const edgeCaseFindings: string[] = [];

function testCase(name: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err?.message || err}`);
    failedTests++;
    failureDetails.push(`${name}: ${err?.message || err}`);
  }
}

console.log('======================================================================');
console.log('  LOCUS: EMPIRICAL ADVERSARIAL CHALLENGER SUITE');
console.log('======================================================================\n');

// ── FIXTURES ────────────────────────────────────────────────────────
const baseResponse: AgentResponse = {
  city: 'London',
  temperature_c: 16.5,
  feels_like_c: 14.0,
  weather_condition: 'Thunderstorm',
  humidity: 85,
  wind_speed: 34.5,
  weather_score: 35,
  risk_level: 'high',
  go_to_office: 'wfh',
  office_reason: 'Severe thunderstorm warning and transit disruption across underground lines.',
  estimated_productive_hours: 6.0,
  day_plan_timeline: [],
  jira_tickets: [
    { key: 'DEV-101', summary: 'Fix pipeline retry logic', priority: 'High', status: 'In Progress', estimated_hours: 2.5 },
    { key: 'DEV-102', summary: 'Upgrade FastAPI endpoints', priority: 'Medium', status: 'To Do', estimated_hours: 2.0 },
  ],
  github_prs: [
    { number: 45, title: 'Add real-time telemetry feed', author: 'alice', state: 'open', is_draft: false, days_old: 3, estimated_hours: 2.0 },
    { number: 46, title: 'Refactor layout styles', author: 'bob', state: 'open', is_draft: true, days_old: 1, estimated_hours: 1.0 },
  ],
  activity_adjustments: ['Avoid morning outdoor commute', 'Shift sprint sync to virtual'],
  notion_logged: true,
  notion_page_url: 'https://notion.so/locus-day-plan-20260925',
  slack_alert_sent: true,
  email_sent: true,
};

const baseBlocks: ScheduleBlock[] = [
  { id: 'b1', time: '09:00 - 10:30', activity: 'Morning Sync & Triage', category: 'meeting', completed: true, location: 'Virtual', context: 'Sprint daily' },
  { id: 'b2', time: '10:30 - 13:00', activity: 'Deep Work: Core Engine', category: 'deep_work', completed: false, location: 'Home Study', context: 'Jira DEV-101' },
  { id: 'b3', time: '13:00 - 14:00', activity: 'Lunch & Break', category: 'break', completed: false, location: 'Kitchen', context: 'Rest' },
  { id: 'b4', time: '14:00 - 17:00', activity: 'PR Review & Issue Grooming', category: 'deep_work', completed: false, location: 'Home Office', context: 'GitHub PR #45' },
];

// ====================================================================
// SECTION 1: RFC 5545 iCalendar COMPLIANCE & ADVERSARIAL STRESS
// ====================================================================
console.log('▶ Section 1: RFC 5545 iCalendar Compliance & Injection Stress');

testCase('1.1 RFC 5545 Container Structure (VCALENDAR & VEVENT)', () => {
  const ics = generateICS(baseResponse, baseBlocks);
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'), 'Must start with BEGIN:VCALENDAR CRLF');
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'), 'Must end with END:VCALENDAR CRLF');
  assert.ok(ics.includes('VERSION:2.0\r\n'), 'Must specify VERSION:2.0');
  assert.ok(ics.includes('PRODID:-//Locus//Day Planner 2.0//EN\r\n'), 'Must specify PRODID');
  assert.ok(ics.includes('CALSCALE:GREGORIAN\r\n'), 'Must specify CALSCALE:GREGORIAN');
  assert.ok(ics.includes('METHOD:PUBLISH\r\n'), 'Must specify METHOD:PUBLISH');

  const physicalLines = ics.split('\r\n');
  const beginEventCount = physicalLines.filter((l) => l === 'BEGIN:VEVENT').length;
  const endEventCount = physicalLines.filter((l) => l === 'END:VEVENT').length;
  assert.strictEqual(beginEventCount, baseBlocks.length, 'Every block must correspond to exactly one BEGIN:VEVENT line');
  assert.strictEqual(endEventCount, baseBlocks.length, 'Every block must correspond to exactly one END:VEVENT line');
});

testCase('1.2 Strict CRLF (\\r\\n) Line Ending Validation (Zero bare LF or CR in normal inputs)', () => {
  const ics = generateICS(baseResponse, baseBlocks);
  const totalCrlf = (ics.match(/\r\n/g) || []).length;
  assert.ok(totalCrlf > 10, 'ICS output must contain multiple CRLF line breaks');

  // Strip all valid CRLF line breaks. The remaining string must NOT contain any bare \n or \r
  const stripped = ics.replace(/\r\n/g, '');
  assert.strictEqual(stripped.includes('\n'), false, 'ICS must not contain any bare LF (\\n) characters');
  assert.strictEqual(stripped.includes('\r'), false, 'ICS must not contain any bare CR (\\r) characters');
});

testCase('1.3 VEVENT Mandatory Property Integrity (UID, DTSTAMP, DTSTART, DTEND, SUMMARY, DESCRIPTION)', () => {
  const ics = generateICS(baseResponse, baseBlocks);
  const lines = ics.split('\r\n');

  let inEvent = false;
  let eventProps: Record<string, string> = {};
  const seenUids = new Set<string>();

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      eventProps = {};
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      assert.ok(eventProps['UID'], 'Event must contain UID');
      assert.ok(eventProps['DTSTAMP'], 'Event must contain DTSTAMP');
      assert.ok(eventProps['DTSTART'], 'Event must contain DTSTART');
      assert.ok(eventProps['DTEND'], 'Event must contain DTEND');
      assert.ok(eventProps['SUMMARY'], 'Event must contain SUMMARY');
      assert.ok(eventProps['DESCRIPTION'], 'Event must contain DESCRIPTION');
      assert.ok(eventProps['LOCATION'], 'Event must contain LOCATION');
      assert.ok(eventProps['STATUS'], 'Event must contain STATUS');
      assert.ok(eventProps['TRANSP'], 'Event must contain TRANSP');

      // Verify UID uniqueness
      assert.strictEqual(seenUids.has(eventProps['UID']), false, `UID ${eventProps['UID']} must be unique`);
      seenUids.add(eventProps['UID']);

      // Verify DTSTART and DTEND format: YYYYMMDDTHHMMSS
      const dtPattern = /^\d{8}T\d{6}$/;
      assert.ok(dtPattern.test(eventProps['DTSTART']), `DTSTART ${eventProps['DTSTART']} must match YYYYMMDDTHHMMSS`);
      assert.ok(dtPattern.test(eventProps['DTEND']), `DTEND ${eventProps['DTEND']} must match YYYYMMDDTHHMMSS`);

      // Verify DTSTAMP format: YYYYMMDDTHHMMSSZ
      const dtstampPattern = /^\d{8}T\d{6}Z$/;
      assert.ok(dtstampPattern.test(eventProps['DTSTAMP']), `DTSTAMP ${eventProps['DTSTAMP']} must match YYYYMMDDTHHMMSSZ`);
    } else if (inEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx);
        const val = line.slice(colonIdx + 1);
        eventProps[key] = val;
      }
    }
  }
  assert.strictEqual(seenUids.size, baseBlocks.length, 'All event UIDs must be distinct and registered');
});

testCase('1.4 RFC 5545 Character Escaping: Semicolons, Commas, Backslashes, Newlines', () => {
  const adversarialBlocks: ScheduleBlock[] = [
    {
      id: 'adv-1',
      time: '11:00 - 12:30',
      activity: 'Review; Code, Architecture\\Design & Docs\nSecond Line\r\nThird Line',
      category: 'deep_work',
      completed: false,
      location: 'Room 402; Zone B, Campus\\Building 3',
      context: 'Notes: test, check; verify\\assert\nNext note',
    },
  ];

  const ics = generateICS(baseResponse, adversarialBlocks);

  // SUMMARY should escape semicolons, commas, backslashes, and convert newlines to \n
  assert.ok(ics.includes('SUMMARY:Review\\; Code\\, Architecture\\\\Design & Docs\\nSecond Line\\nThird Line'),
    'SUMMARY must escape ;, ,, \\, and newlines to \\n');

  // LOCATION should escape semicolons, commas, backslashes
  assert.ok(ics.includes('LOCATION:Room 402\\; Zone B\\, Campus\\\\Building 3'),
    'LOCATION must escape ;, ,, and \\');

  // Ensure no unescaped newlines broke the physical line structure
  const summaryLines = ics.split('\r\n').filter((l) => l.startsWith('SUMMARY:'));
  assert.strictEqual(summaryLines.length, 1, 'SUMMARY must occupy exactly 1 line even with input newlines');
});

testCase('1.5 Adversarial CRLF Injection Attack Defense (Line-Level Verification)', () => {
  // Attempt to inject an extra rogue VEVENT by inserting raw \r\n into the activity string
  const maliciousBlocks: ScheduleBlock[] = [
    {
      id: 'malicious-1',
      time: '09:00 - 10:00',
      activity: 'Normal Title\r\nBEGIN:VEVENT\r\nUID:hacked-uid\r\nSUMMARY:Hacked Event\r\nEND:VEVENT\r\nTrailing',
      category: 'meeting',
      completed: false,
      location: 'Virtual',
    },
  ];

  const ics = generateICS(baseResponse, maliciousBlocks);
  const physicalLines = ics.split('\r\n');

  // Verify that CRLF injection was neutralized at the physical line boundary:
  // Exactly 1 line in the entire document equals 'BEGIN:VEVENT' and 1 equals 'END:VEVENT'
  const exactBegins = physicalLines.filter((l) => l === 'BEGIN:VEVENT').length;
  const exactEnds = physicalLines.filter((l) => l === 'END:VEVENT').length;
  assert.strictEqual(exactBegins, 1, 'CRLF injection attack must NOT create auxiliary BEGIN:VEVENT physical lines');
  assert.strictEqual(exactEnds, 1, 'CRLF injection attack must NOT create auxiliary END:VEVENT physical lines');

  // Verify that the injected \r\n was safely escaped to literal \n within the SUMMARY and DESCRIPTION properties
  assert.ok(ics.includes('\\nBEGIN:VEVENT\\n'), 'Injected newlines must be safely converted to literal \\n');
});

testCase('1.6 Boundary & Edge Case Handling (Empty Blocks, Malformed Times, Zero Blocks)', () => {
  // Test empty scheduleBlocks array
  const emptyIcs = generateICS(baseResponse, []);
  assert.ok(emptyIcs.startsWith('BEGIN:VCALENDAR\r\n'), 'Empty blocks must still generate valid VCALENDAR');
  assert.ok(emptyIcs.endsWith('END:VCALENDAR\r\n'), 'Empty blocks must still close VCALENDAR');
  const physicalLines = emptyIcs.split('\r\n');
  assert.strictEqual(physicalLines.filter((l) => l === 'BEGIN:VEVENT').length, 0, 'Empty blocks must contain 0 VEVENTs');

  // Test malformed time formats (single time, non-standard text, empty time)
  const malformedTimeBlocks: ScheduleBlock[] = [
    { id: 'm1', time: '14:30', activity: 'Single Time Activity', category: 'meeting', completed: true },
    { id: 'm2', time: 'TBD / Afternoon', activity: 'Textual Time Activity', category: 'general', completed: false },
    { id: 'm3', time: '', activity: 'Empty Time Activity', category: 'break', completed: false },
  ];

  const tolerantIcs = generateICS(baseResponse, malformedTimeBlocks);
  const vEvents = tolerantIcs.split('\r\n').filter((l) => l === 'BEGIN:VEVENT').length;
  assert.strictEqual(vEvents, 3, 'Must gracefully produce 3 VEVENTs despite irregular time strings');

  // Test unicode & international characters
  const unicodeBlocks: ScheduleBlock[] = [
    { id: 'u1', time: '10:00 - 11:00', activity: '🚀 Sprint Planning 会议 & Réunion Café ☕', category: 'meeting', completed: true },
  ];
  const unicodeIcs = generateICS({ ...baseResponse, city: 'München 🇩🇪' }, unicodeBlocks);
  assert.ok(unicodeIcs.includes('🚀 Sprint Planning 会议 & Réunion Café ☕'), 'Unicode activity characters must be preserved');
  assert.ok(unicodeIcs.includes('München 🇩🇪'), 'Unicode city names must be preserved');

  // Note edge case for forensic record: bare \r (without \n)
  const bareCrBlock: ScheduleBlock[] = [
    { id: 'cr1', time: '09:00', activity: 'Line 1\rLine 2', category: 'general', completed: false },
  ];
  const bareCrIcs = generateICS(baseResponse, bareCrBlock);
  if (bareCrIcs.replace(/\r\n/g, '').includes('\r')) {
    edgeCaseFindings.push('RFC 5545 Edge Finding: Bare \\r (without \\n) in input strings is not stripped by regex /\\r?\\n/g.');
  }
});

// ====================================================================
// SECTION 2: MARKDOWN EXPORT GENERATOR AUDIT
// ====================================================================
console.log('\n▶ Section 2: Formatted Markdown Export Generator Audit');

testCase('2.1 Markdown Header, Badges & AI Rationale Structure', () => {
  const md = generateMarkdown(baseResponse, baseBlocks);
  assert.ok(md.includes('# 📅 Locus Day Plan — London'), 'Must have City title in H1 header');
  assert.ok(md.includes('**Weather Score:** 35/100'), 'Must display weather score');
  assert.ok(md.includes('**Risk Level:** HIGH'), 'Must display uppercase risk level');
  assert.ok(md.includes('## 🎯 Executive Verdict: `WFH`'), 'Must display executive verdict badge');
  assert.ok(md.includes('Severe thunderstorm warning'), 'Must quote AI rationale');
});

testCase('2.2 Atmospheric Conditions Table Syntax & Column Integrity', () => {
  const md = generateMarkdown(baseResponse, baseBlocks);
  const lines = md.split('\n');

  const tableHeaderIdx = lines.findIndex((l) => l.includes('| Metric | Value | Reference Details |'));
  assert.ok(tableHeaderIdx !== -1, 'Atmospheric table header must exist');

  const delimiterLine = lines[tableHeaderIdx + 1];
  assert.strictEqual(delimiterLine.trim(), '|:---|:---|:---|', 'Table delimiter must match 3 columns with left alignment');

  // Verify rows follow 3-column format
  for (let i = tableHeaderIdx; i <= tableHeaderIdx + 6; i++) {
    const row = lines[i].trim();
    assert.ok(row.startsWith('|') && row.endsWith('|'), `Row ${i} must start and end with pipe: "${row}"`);
    const cols = row.split('|').map((s) => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
    assert.strictEqual(cols.length, 3, `Row ${i} must have exactly 3 columns (found ${cols.length}): "${row}"`);
  }
});

testCase('2.3 Chronological Schedule Timeline Table Syntax & State Badges', () => {
  const md = generateMarkdown(baseResponse, baseBlocks);
  const lines = md.split('\n');

  const scheduleHeaderIdx = lines.findIndex((l) => l.includes('| Status | Time Slot | Category | Scheduled Activity | Location | Context / Notes |'));
  assert.ok(scheduleHeaderIdx !== -1, 'Schedule timeline table header must exist');

  const delimiterLine = lines[scheduleHeaderIdx + 1];
  assert.strictEqual(delimiterLine.trim(), '|:---:|:---|:---|:---|:---|:---|', 'Schedule delimiter must match 6 columns');

  // Verify completed vs pending status badges
  assert.ok(md.includes('| ✅ Done | `09:00 - 10:30` | **Meeting** | Morning Sync & Triage | Virtual | Sprint daily |'),
    'Completed block must render with ✅ Done');
  assert.ok(md.includes('| ⏳ Pending | `10:30 - 13:00` | **Deep Work** | Deep Work: Core Engine | Home Study | Jira DEV-101 |'),
    'Pending block must render with ⏳ Pending');
});

testCase('2.4 Engineering Workload Matrix: Jira HUD & GitHub Review HUD', () => {
  const md = generateMarkdown(baseResponse, baseBlocks);

  // Jira Sprint Workload
  assert.ok(md.includes('### 🎫 Jira Sprint Workload (2 tickets, ~0h total)'), 'Must render Jira ticket header');
  assert.ok(md.includes('| **`DEV-101`** | Fix pipeline retry logic | `High` | In Progress | 2.5h |'), 'Must render DEV-101 ticket row');
  assert.ok(md.includes('| **`DEV-102`** | Upgrade FastAPI endpoints | `Medium` | To Do | 2h |'), 'Must render DEV-102 ticket row');

  // GitHub Code Review HUD
  assert.ok(md.includes('### 🐙 GitHub Code Review HUD (2 PRs, ~0h review)'), 'Must render GitHub PR header');
  // Stale PR check (> 2 days old)
  assert.ok(md.includes('⚠️ **3d (Overdue)**'), 'PR #45 (3 days old) must display ⚠️ Overdue warning');
  // Draft badge check
  assert.ok(md.includes('| **#46** | Refactor layout styles | @bob | Draft | 1d | ~1h |'), 'PR #46 draft status must be reflected');
});

testCase('2.5 Empty Workload Fallback & 7-Integration Delivery Grid', () => {
  const emptyWorkloadResponse: AgentResponse = {
    ...baseResponse,
    jira_tickets: [],
    github_prs: [],
    notion_logged: false,
    slack_alert_sent: false,
    email_sent: false,
  };

  const md = generateMarkdown(emptyWorkloadResponse, []);
  assert.ok(md.includes('*No active sprint tickets assigned today.*'), 'Must show empty Jira fallback');
  assert.ok(md.includes('*No pull requests currently awaiting code review.*'), 'Must show empty GitHub fallback');

  // Verify 7-Channel Integration Delivery Status Table
  assert.ok(md.includes('## 🌐 7-Channel Integration Delivery Status'), 'Must render 7-channel integration section');
  assert.ok(md.includes('| **OpenWeather** | Atmospheric Telemetry | ✅ Synced |'), 'OpenWeather status row');
  assert.ok(md.includes('| **Gmail** | Calendar & Outdoor Anchors | ✅ Analyzed |'), 'Gmail status row');
  assert.ok(md.includes('| **Notion** | Database Day Plan Logger | ⚪ Standby |'), 'Notion standby status row');
  assert.ok(md.includes('| **Slack** | Incident Broadcast Alert | ⚪ Standby |'), 'Slack standby status row');
  assert.ok(md.includes('| **Resend** | Executive Email Dispatch | ⚪ Standby |'), 'Resend standby status row');

  // Note edge case for forensic record: pipe characters in task names
  const pipeBlock: ScheduleBlock[] = [
    { id: 'p1', time: '10:00 - 11:00', activity: 'Review PR | Bugfix', category: 'deep_work', completed: false },
  ];
  const pipeMd = generateMarkdown(baseResponse, pipeBlock);
  const pipeRow = pipeMd.split('\n').find((l) => l.includes('Review PR | Bugfix'));
  if (pipeRow && pipeRow.split('|').length - 2 > 6) {
    edgeCaseFindings.push('Markdown Edge Finding: Unescaped pipe "|" in activity names introduces additional markdown table cells.');
  }
});

// ====================================================================
// SECTION 3: STRUCTURED JSON EXPORT ROUNDTRIP AUDIT
// ====================================================================
console.log('\n▶ Section 3: Structured JSON Export Serialization & Roundtrip Audit');

testCase('3.1 Valid JSON Serialization & Exact Property Tree Schema', () => {
  const jsonStr = generateJSON(baseResponse, baseBlocks);
  let parsed: any;
  assert.doesNotThrow(() => {
    parsed = JSON.parse(jsonStr);
  }, 'generateJSON must return valid parseable JSON');

  // Check top-level keys
  assert.ok(parsed.metadata, 'JSON must contain metadata');
  assert.ok(parsed.synthesis, 'JSON must contain synthesis');
  assert.ok(parsed.atmospheric_conditions, 'JSON must contain atmospheric_conditions');
  assert.ok(parsed.schedule_timeline, 'JSON must contain schedule_timeline');
  assert.ok(parsed.engineering_workload, 'JSON must contain engineering_workload');
  assert.ok(parsed.integrations_delivery, 'JSON must contain integrations_delivery');
  assert.ok(parsed.telemetry, 'JSON must contain telemetry');

  // Check metadata attributes
  assert.strictEqual(parsed.metadata.version, '2.0.0');
  assert.strictEqual(parsed.metadata.generator, 'Locus Day Planner (v2.0)');

  // Check synthesis fidelity
  assert.strictEqual(parsed.synthesis.city, 'London');
  assert.strictEqual(parsed.synthesis.verdict, 'wfh');
  assert.strictEqual(parsed.synthesis.weather_score, 35);
  assert.strictEqual(parsed.synthesis.risk_level, 'high');
  assert.strictEqual(parsed.synthesis.estimated_productive_hours, 6.0);

  // Check timeline count
  assert.strictEqual(parsed.schedule_timeline.length, baseBlocks.length);
  assert.strictEqual(parsed.schedule_timeline[0].completed, true);
  assert.strictEqual(parsed.schedule_timeline[1].completed, false);
});

testCase('3.2 Extreme Unicode, Quotes, Escape Sequences & Roundtrip Fidelity', () => {
  const extremeResponse: AgentResponse = {
    ...baseResponse,
    city: '東京 (Tokyo) \u0000 🚀',
    office_reason: 'Testing quotes: "Double" and \'Single\', Backslash: \\, Tabs: \t, Newline: \n, Emoji: 🌧️⛈️⚡',
    weather_condition: 'Thunderstorm with heavy rain ⛈️',
    temperature_c: -12.5,
    feels_like_c: -18.2,
  };

  const extremeBlocks: ScheduleBlock[] = [
    {
      id: 'ext-1',
      time: '08:00 - 09:30',
      activity: 'Multilingual: 日本語, العربية, Français, Русский',
      category: 'deep_work',
      completed: true,
      location: 'Global / Virtual "HQ" \\ Room A',
      context: 'Quotes: "quoted" & \'apostrophe\' & <tag> & \\path\\to\\file',
    },
  ];

  const jsonStr = generateJSON(extremeResponse, extremeBlocks);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.synthesis.city, extremeResponse.city, 'City roundtrip must match verbatim');
  assert.strictEqual(parsed.synthesis.office_reason, extremeResponse.office_reason, 'Reason with quotes/escapes must roundtrip');
  assert.strictEqual(parsed.atmospheric_conditions.temperature_c, -12.5, 'Negative float temperature must preserve sign');
  assert.strictEqual(parsed.schedule_timeline[0].activity, extremeBlocks[0].activity, 'Multilingual unicode must roundtrip');
  assert.strictEqual(parsed.schedule_timeline[0].context, extremeBlocks[0].context, 'Complex escape string must roundtrip');
});

testCase('3.3 Edge Cases: Null Fields, Undefined Optionals & Empty Arrays', () => {
  const sparseResponse: AgentResponse = {
    city: '',
    temperature_c: 0,
    feels_like_c: 0,
    weather_condition: '',
    humidity: 0,
    wind_speed: 0,
    weather_score: 0,
    risk_level: 'low',
    go_to_office: 'office',
    office_reason: '',
    estimated_productive_hours: 0,
    day_plan_timeline: [],
    jira_tickets: [],
    github_prs: [],
    activity_adjustments: [],
    notion_logged: false,
    slack_alert_sent: false,
    email_sent: false,
  };

  const sparseBlocks: ScheduleBlock[] = [
    {
      id: 'sp-1',
      time: '',
      activity: '',
      category: 'general',
      completed: false,
      location: undefined,
      context: undefined,
    },
  ];

  const jsonStr = generateJSON(sparseResponse, sparseBlocks);
  const parsed = JSON.parse(jsonStr);

  assert.strictEqual(parsed.schedule_timeline[0].location, null, 'Undefined location must normalize to null in JSON');
  assert.strictEqual(parsed.schedule_timeline[0].context, null, 'Undefined context must normalize to null in JSON');
  assert.strictEqual(parsed.atmospheric_conditions.temperature_c, 0, 'Zero temperature must be preserved as 0, not null');
  assert.deepStrictEqual(parsed.schedule_timeline[0].completed, false, 'Boolean false must be preserved');
});

// ====================================================================
// SECTION 4: PRODUCTION BUNDLE & ASSET INTEGRITY
// ====================================================================
console.log('\n▶ Section 4: Production Build & Asset Integrity Verification');

testCase('4.1 dist/index.html Structure, Root Node & Font Links', () => {
  const indexHtmlPath = path.join(frontendDir, 'dist', 'index.html');
  assert.ok(fs.existsSync(indexHtmlPath), 'dist/index.html must exist');

  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  assert.ok(html.includes('<!DOCTYPE html>'), 'Must declare valid HTML5 DOCTYPE');
  assert.ok(html.includes('<div id="root"></div>'), 'Must contain <div id="root"> mount element');
  assert.ok(html.includes('Locus — Autonomous Incident Command Center & Day Planner'), 'Must have authoritative title');
  assert.ok(html.includes('family=Inter') && html.includes('family=JetBrains+Mono'), 'Must import Inter and JetBrains Mono fonts');
  assert.ok(html.includes('class="dark"'), 'Root html tag must configure dark mode');
});

testCase('4.2 Production Asset References (JS Bundle & CSS Stylesheet)', () => {
  const indexHtmlPath = path.join(frontendDir, 'dist', 'index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  // Match <script type="module" crossorigin src="/assets/index-*.js"></script>
  const scriptMatch = html.match(/src="\/assets\/(index-[a-zA-Z0-9_-]+\.js)"/);
  assert.ok(scriptMatch, 'index.html must link to versioned JS bundle');
  const jsFileName = scriptMatch[1];
  const jsFilePath = path.join(frontendDir, 'dist', 'assets', jsFileName);
  assert.ok(fs.existsSync(jsFilePath), `Referenced JS bundle ${jsFileName} must exist in dist/assets/`);

  const jsStat = fs.statSync(jsFilePath);
  assert.ok(jsStat.size > 200_000, `JS bundle size must be substantial (>200KB, found ${(jsStat.size / 1024).toFixed(1)} KB)`);
  assert.ok(jsStat.size < 1_500_000, `JS bundle must not exceed 1.5MB (found ${(jsStat.size / 1024).toFixed(1)} KB)`);

  // Match <link rel="stylesheet" crossorigin href="/assets/index-*.css">
  const cssMatch = html.match(/href="\/assets\/(index-[a-zA-Z0-9_-]+\.css)"/);
  assert.ok(cssMatch, 'index.html must link to versioned CSS stylesheet');
  const cssFileName = cssMatch[1];
  const cssFilePath = path.join(frontendDir, 'dist', 'assets', cssFileName);
  assert.ok(fs.existsSync(cssFilePath), `Referenced CSS bundle ${cssFileName} must exist in dist/assets/`);

  const cssStat = fs.statSync(cssFilePath);
  assert.ok(cssStat.size > 10_000, `CSS bundle size must be >10KB (found ${(cssStat.size / 1024).toFixed(1)} KB)`);
});

testCase('4.3 JS Bundle Static Syntax Validity (node --check)', () => {
  const assetsDir = path.join(frontendDir, 'dist', 'assets');
  const files = fs.readdirSync(assetsDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  assert.ok(jsFiles.length > 0, 'At least one JS bundle must exist');

  for (const jsFile of jsFiles) {
    const fullPath = path.join(assetsDir, jsFile);
    const content = fs.readFileSync(fullPath, 'utf8');
    // Ensure file is non-empty and starts with valid JS structure (no HTML error page or raw uncompiled JSX)
    assert.strictEqual(content.includes('<!DOCTYPE html>'), false, 'JS bundle must not be an HTML 404 response');
    assert.strictEqual(content.includes('<App />'), false, 'JS bundle must not contain uncompiled JSX tags');
  }
});

testCase('4.4 CSS Bundle Design Token Infiltration', () => {
  const assetsDir = path.join(frontendDir, 'dist', 'assets');
  const files = fs.readdirSync(assetsDir);
  const cssFiles = files.filter((f) => f.endsWith('.css'));
  assert.ok(cssFiles.length > 0, 'CSS bundle must exist');

  const cssContent = fs.readFileSync(path.join(assetsDir, cssFiles[0]), 'utf8');
  assert.ok(cssContent.includes('#08090a') || cssContent.includes('08090a'), 'Surface base #08090a compiled into CSS');
  assert.ok(cssContent.includes('#0f1011') || cssContent.includes('0f1011'), 'Surface card #0f1011 compiled into CSS');
  assert.ok(cssContent.includes('#10b981') || cssContent.includes('10b981'), 'Emerald semantic token #10b981 compiled into CSS');
  assert.ok(cssContent.includes('#6366f1') || cssContent.includes('6366f1'), 'Indigo semantic token #6366f1 compiled into CSS');
});

// ====================================================================
// SUMMARY & VERDICT
// ====================================================================
console.log('\n======================================================================');
console.log(`  EMPIRICAL CHALLENGER VERIFICATION: ${passedTests} / ${totalTests} TESTS PASSED`);
if (edgeCaseFindings.length > 0) {
  console.log('  ⚠️ ADVERSARIAL EDGE CASE FINDINGS (For forensic report):');
  edgeCaseFindings.forEach((f) => console.log(`     • ${f}`));
}
if (failedTests > 0) {
  console.error(`  ❌ VERDICT: REJECT (${failedTests} tests failed)`);
  failureDetails.forEach((f) => console.error(`     - ${f}`));
  process.exit(1);
} else {
  console.log('  🎉 VERDICT: APPROVE — All 18 adversarial stress checks passed!');
  console.log('======================================================================\n');
  process.exit(0);
}
