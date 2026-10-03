import { AgentResponse, ScheduleBlock } from '../types';

/**
 * Escapes characters for RFC 5545 iCalendar format.
 * Semicolons, commas, backslashes, and newlines must be properly escaped.
 */
function escapeICS(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Pure client-side generator for RFC 5545 iCalendar (.ics) files with strict CRLF line endings.
 */
export function generateICS(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const utcStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const city = response.city || 'Office';

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Locus//Day Planner 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Locus Day Plan - ${escapeICS(city)} (${dateStr})`,
    'X-WR-TIMEZONE:UTC',
  ];

  scheduleBlocks.forEach((block, index) => {
    // Parse time range like "09:00 - 10:30", "09:00–12:00", "09:00", etc.
    const timeMatches = Array.from(block.time.matchAll(/(\d{1,2}):(\d{2})/g));
    let startHour = 9 + index;
    let startMin = 0;
    let endHour = startHour + 1;
    let endMin = 0;

    if (timeMatches.length >= 2) {
      startHour = parseInt(timeMatches[0][1], 10);
      startMin = parseInt(timeMatches[0][2], 10);
      endHour = parseInt(timeMatches[1][1], 10);
      endMin = parseInt(timeMatches[1][2], 10);
    } else if (timeMatches.length === 1) {
      startHour = parseInt(timeMatches[0][1], 10);
      startMin = parseInt(timeMatches[0][2], 10);
      endHour = (startHour + 1) % 24;
      endMin = startMin;
    } else {
      startHour = (9 + index) % 24;
      endHour = (startHour + 1) % 24;
    }

    const dtStart = `${dateStr}T${String(startHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}00`;
    const dtEnd = `${dateStr}T${String(endHour).padStart(2, '0')}${String(endMin).padStart(2, '0')}00`;
    const uid = `locus-${dateStr}-${index}-${now.getTime()}@locus.ai`;
    const summary = escapeICS(block.activity || 'Scheduled Block');
    const location = escapeICS(block.location || city);
    const categoryTag = block.category ? `[${block.category.toUpperCase().replace('_', ' ')}] ` : '';
    const desc = escapeICS(
      `${categoryTag}${block.activity}\n` +
      `Location: ${block.location || city}\n` +
      `Category: ${block.category}\n` +
      `Notes: ${block.context || 'None'}\n` +
      `Status: ${block.completed ? 'Completed' : 'Planned'}\n` +
      `Weather: ${response.weather_condition || 'N/A'}, ${response.temperature_c}°C`
    );

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${utcStr}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${desc}`);
    lines.push(`LOCATION:${location}`);
    lines.push(`STATUS:${block.completed ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('TRANSP:OPAQUE');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  // RFC 5545 requires strict CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

/**
 * Pure client-side generator for formatted Markdown briefing (.md)
 */
export function generateMarkdown(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): string {
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('en-US', { hour12: false });
  const city = response.city || 'City N/A';
  const verdict = String(response.go_to_office || 'undecided').toUpperCase();
  const totalCompleted = scheduleBlocks.filter((b) => b.completed).length;
  const totalBlocks = scheduleBlocks.length;
  const pctDone = totalBlocks > 0 ? Math.round((totalCompleted / totalBlocks) * 100) : 0;

  const lines: string[] = [
    `# 📅 Locus Day Plan — ${city}`,
    `**Generated:** ${dateFormatted} at ${timeFormatted} UTC  `,
    `**Weather Score:** ${response.weather_score}/100  |  **Risk Level:** ${String(response.risk_level).toUpperCase()}  |  **Focus Progress:** ${pctDone}% (${totalCompleted}/${totalBlocks} blocks)`,
    '',
    '---',
    '',
    `## 🎯 Executive Verdict: \`${verdict}\``,
    '',
    `> 💡 **AI Commute & Workload Rationale:**  `,
    `> "${response.office_reason || 'Autonomous synthesis completed.'}"`,
    '',
    `**AI Context Summary:**  `,
    `${response.ai_summary || response.weather_summary || 'Conditions evaluated for optimal focus and transit safety.'}`,
    '',
    '### 🌤️ Atmospheric & Transit Conditions',
    '| Metric | Value | Reference Details |',
    '|:---|:---|:---|',
    `| **Location** | ${city} | Current Target City |`,
    `| **Conditions** | ${response.weather_condition || 'N/A'} | ${response.weather_summary || 'Standard diurnality'} |`,
    `| **Temperature** | ${response.temperature_c}°C | Feels like ${response.feels_like_c}°C |`,
    `| **Humidity** | ${response.humidity}% | Moisture level |`,
    `| **Wind Speed** | ${response.wind_speed} km/h | Commute hazard factor |`,
    `| **Focus Capacity** | ${response.estimated_productive_hours} hours | Estimated daily productive bandwidth |`,
    '',
  ];

  if (response.weather_alerts && response.weather_alerts.length > 0) {
    lines.push('### ⚠️ Weather Advisories');
    response.weather_alerts.forEach((alert) => lines.push(`- ⚠️ ${alert}`));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## 🕒 Chronological Schedule Timeline');
  lines.push('');
  lines.push('| Status | Time Slot | Category | Scheduled Activity | Location | Context / Notes |');
  lines.push('|:---:|:---|:---|:---|:---|:---|');

  scheduleBlocks.forEach((block) => {
    const statusIcon = block.completed ? '✅ Done' : '⏳ Pending';
    const categoryTitle = block.category.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const loc = block.location || '—';
    const ctx = block.context || '—';
    lines.push(`| ${statusIcon} | \`${block.time}\` | **${categoryTitle}** | ${block.activity} | ${loc} | ${ctx} |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 💻 Engineering & Sprint Workload Matrix');
  lines.push('');

  // Jira Sprint Tickets
  const jiraTickets = response.jira_tickets || [];
  lines.push(`### 🎫 Jira Sprint Workload (${jiraTickets.length} tickets, ~${response.jira_estimated_hours || 0}h total)`);
  if (jiraTickets.length === 0) {
    lines.push('*No active sprint tickets assigned today.*');
  } else {
    lines.push('| Key | Summary | Priority | Status | Est. Hours |');
    lines.push('|:---|:---|:---:|:---:|:---:|');
    jiraTickets.forEach((t) => {
      lines.push(`| **\`${t.key}\`** | ${t.summary} | \`${t.priority}\` | ${t.status} | ${t.estimated_hours}h |`);
    });
  }
  lines.push('');

  // GitHub PR Reviews
  const githubPRs = response.github_prs || [];
  lines.push(`### 🐙 GitHub Code Review HUD (${githubPRs.length} PRs, ~${response.github_estimated_hours || 0}h review)`);
  if (githubPRs.length === 0) {
    lines.push('*No pull requests currently awaiting code review.*');
  } else {
    lines.push('| PR | Title | Author | Status | Age | Est. Time |');
    lines.push('|:---|:---|:---|:---:|:---:|:---:|');
    githubPRs.forEach((pr) => {
      const author = pr.author || (typeof pr.user === 'object' ? (pr.user as any)?.login : pr.user) || 'dev';
      const hours = pr.estimated_hours || pr.est_hours || pr.review_hours || 1.5;
      const isStale = pr.days_old >= 2;
      const ageStr = isStale ? `⚠️ **${pr.days_old}d (Overdue)**` : `${pr.days_old}d`;
      const draftBadge = pr.is_draft || pr.draft ? 'Draft' : 'Open';
      lines.push(`| **#${pr.number}** | ${pr.title} | @${author} | ${draftBadge} | ${ageStr} | ~${hours}h |`);
    });
  }
  lines.push('');

  // GitHub Assigned Issues
  const githubIssues = response.github_issues || [];
  if (githubIssues.length > 0) {
    lines.push(`### 📌 Assigned GitHub Issues (${githubIssues.length} issues)`);
    githubIssues.forEach((issue) => {
      lines.push(`- **#${issue.number}**: ${issue.title} (\`${issue.state}\`, ${issue.days_old}d open)`);
    });
    lines.push('');
  }

  // Recommendations & Adjustments
  if (response.recommendations && response.recommendations.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 💡 Smart AI Recommendations');
    response.recommendations.forEach((rec) => lines.push(`- ${rec}`));
    lines.push('');
  }

  if (response.outfit_suggestion) {
    lines.push(`**👔 Recommended Attire:** ${response.outfit_suggestion}  `);
    lines.push('');
  }

  if (response.activity_adjustments && response.activity_adjustments.length > 0) {
    lines.push('### 🔄 Activity Adjustments');
    response.activity_adjustments.forEach((adj) => lines.push(`- ⚠️ ${adj}`));
    lines.push('');
  }

  // 7-Integration Delivery Status
  lines.push('---');
  lines.push('');
  lines.push('## 🌐 7-Channel Integration Delivery Status');
  lines.push('| Integration | Service | Status | Target Delivery / Link |');
  lines.push('|:---|:---|:---:|:---|');
  lines.push(`| **OpenWeather** | Atmospheric Telemetry | ✅ Synced | ${city} conditions retrieved |`);
  lines.push(`| **Gmail** | Calendar & Outdoor Anchors | ✅ Analyzed | ${response.gmail_events?.length || 0} calendar events checked |`);
  lines.push(`| **Jira** | Atlassian Sprint API | ✅ Synced | ${jiraTickets.length} tickets (~${response.jira_estimated_hours || 0}h) |`);
  lines.push(`| **GitHub** | Code Review & Issues API | ✅ Synced | ${githubPRs.length} PRs (~${response.github_estimated_hours || 0}h) |`);
  lines.push(`| **Notion** | Database Day Plan Logger | ${response.notion_logged ? '✅ Logged' : '⚪ Standby'} | ${response.notion_page_url ? `[View Notion Page](${response.notion_page_url})` : 'Database sync configured'} |`);
  lines.push(`| **Slack** | Incident Broadcast Alert | ${response.slack_message_sent ? '✅ Delivered' : '⚪ Standby'} | #locus-briefings channel |`);
  lines.push(`| **Resend** | Executive Email Dispatch | ${response.email_sent ? '✅ Sent' : '⚪ Standby'} | Message ID: \`${response.resend_message_id || 'simulated-resend-id'}\` |`);
  lines.push('');
  lines.push('---');
  lines.push('*Generated by Locus Day Planner (v2.0) · Track 5: AI Real World Agent*');

  return lines.join('\n');
}

/**
 * Pure client-side generator for structured JSON summary (.json)
 */
export function generateJSON(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): string {
  const exportPayload = {
    metadata: {
      generator: 'Locus Day Planner (v2.0)',
      architecture: '8-Node LangGraph Command Center',
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      platform: 'React 19 + TypeScript + Vite + Tailwind CSS',
    },
    synthesis: {
      city: response.city,
      verdict: response.go_to_office,
      office_reason: response.office_reason,
      ai_summary: response.ai_summary,
      weather_score: response.weather_score,
      risk_level: response.risk_level,
      estimated_productive_hours: response.estimated_productive_hours,
      recommendations: response.recommendations,
      outfit_suggestion: response.outfit_suggestion,
      activity_adjustments: response.activity_adjustments,
    },
    atmospheric_conditions: {
      temperature_c: response.temperature_c,
      feels_like_c: response.feels_like_c,
      weather_condition: response.weather_condition,
      humidity: response.humidity,
      wind_speed: response.wind_speed,
      weather_summary: response.weather_summary,
      weather_alerts: response.weather_alerts,
    },
    schedule_timeline: scheduleBlocks.map((block) => ({
      id: block.id,
      time: block.time,
      activity: block.activity,
      category: block.category,
      location: block.location || null,
      context: block.context || null,
      completed: block.completed,
    })),
    engineering_workload: {
      jira: {
        total_estimated_hours: response.jira_estimated_hours,
        tickets: response.jira_tickets,
      },
      github: {
        total_estimated_hours: response.github_estimated_hours,
        pull_requests: response.github_prs,
        assigned_issues: response.github_issues,
      },
    },
    integrations_delivery: {
      openweather_connected: true,
      gmail_events_checked: response.gmail_events?.length || 0,
      has_outdoor_plans: response.has_outdoor_plans,
      has_travel_plans: response.has_travel_plans,
      notion_logged: response.notion_logged,
      notion_page_url: response.notion_page_url,
      slack_message_sent: response.slack_message_sent,
      email_sent: response.email_sent,
      resend_message_id: response.resend_message_id,
    },
    telemetry: {
      processed_at: response.processed_at,
      execution_log_count: response.execution_log?.length || 0,
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

/**
 * Client-side browser download helper using Blob and URL.createObjectURL
 */
export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * 1-Click iCalendar (.ics) download
 */
export function downloadICS(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateICS(response, scheduleBlocks);
  const city = (response.city || 'day_plan').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `locus_${city}_${dateStr}.ics`, 'text/calendar;charset=utf-8');
}

/**
 * 1-Click Markdown (.md) download
 */
export function downloadMarkdown(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateMarkdown(response, scheduleBlocks);
  const city = (response.city || 'day_plan').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `locus_${city}_${dateStr}.md`, 'text/markdown;charset=utf-8');
}

/**
 * 1-Click JSON (.json) download
 */
export function downloadJSON(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateJSON(response, scheduleBlocks);
  const city = (response.city || 'day_plan').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `locus_${city}_${dateStr}.json`, 'application/json;charset=utf-8');
}

/**
 * Generates direct Google Calendar Web link for a schedule block
 */
export function generateGoogleCalendarUrl(block: ScheduleBlock, city: string = 'Office'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  const timeMatches = Array.from(block.time.matchAll(/(\d{1,2}):(\d{2})/g));
  let startHour = 9;
  let startMin = 0;
  let endHour = 10;
  let endMin = 0;

  if (timeMatches.length >= 2) {
    startHour = parseInt(timeMatches[0][1], 10);
    startMin = parseInt(timeMatches[0][2], 10);
    endHour = parseInt(timeMatches[1][1], 10);
    endMin = parseInt(timeMatches[1][2], 10);
  }

  const dtStart = `${dateStr}T${String(startHour).padStart(2, '0')}${String(startMin).padStart(2, '0')}00Z`;
  const dtEnd = `${dateStr}T${String(endHour).padStart(2, '0')}${String(endMin).padStart(2, '0')}00Z`;

  const title = encodeURIComponent(`[LOCUS] ${block.activity}`);
  const details = encodeURIComponent(
    `Category: ${block.category.toUpperCase()}\nLocation: ${block.location || city}\nNotes: ${block.context || 'Planned via Locus AI'}`
  );
  const location = encodeURIComponent(block.location || city);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}

/**
 * Generates direct Outlook / Office 365 Calendar Web link
 */
export function generateOutlookCalendarUrl(block: ScheduleBlock, city: string = 'Office'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const timeMatches = Array.from(block.time.matchAll(/(\d{1,2}):(\d{2})/g));
  let startHour = 9;
  let startMin = 0;
  let endHour = 10;
  let endMin = 0;

  if (timeMatches.length >= 2) {
    startHour = parseInt(timeMatches[0][1], 10);
    startMin = parseInt(timeMatches[0][2], 10);
    endHour = parseInt(timeMatches[1][1], 10);
    endMin = parseInt(timeMatches[1][2], 10);
  }

  const dtStart = `${year}-${month}-${day}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
  const dtEnd = `${year}-${month}-${day}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

  const subject = encodeURIComponent(`[LOCUS] ${block.activity}`);
  const body = encodeURIComponent(
    `Category: ${block.category.toUpperCase()}\nNotes: ${block.context || 'Planned via Locus AI'}`
  );
  const location = encodeURIComponent(block.location || city);

  return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&body=${body}&startdt=${dtStart}&enddt=${dtEnd}&location=${location}`;
}

/**
 * Generates standalone, pixel-perfect executive HTML briefing document
 */
export function generateExecutiveHtmlReport(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): string {
  const verdict = (response.go_to_office || 'wfh').toUpperCase();
  const city = response.city || 'Command Center';
  const temp = response.temperature_c ?? 25;
  const weatherCond = response.weather_condition || 'Clear';
  const weatherScore = response.weather_score ?? 85;
  const jiraHours = response.jira_estimated_hours || 0;
  const githubHours = response.github_estimated_hours || 0;
  const totalHours = (jiraHours + githubHours).toFixed(1);
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Locus Executive Day Plan — ${city}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; background: #090a0f; color: #f1f5f9; line-height: 1.5; }
    .container { max-width: 860px; margin: 0 auto; background: #0f121a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #06b6d4; font-family: monospace; }
    .verdict-banner { padding: 18px 24px; border-radius: 12px; margin-bottom: 24px; background: ${verdict === 'OFFICE' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(99, 102, 241, 0.15)'}; border: 1px solid ${verdict === 'OFFICE' ? '#06b6d4' : '#6366f1'}; }
    .verdict-title { font-size: 18px; font-weight: 700; color: ${verdict === 'OFFICE' ? '#22d3ee' : '#a5b4fc'}; margin: 0 0 6px 0; font-family: monospace; }
    .grid-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #161b26; border: 1px solid #1e293b; border-radius: 10px; padding: 16px; }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-family: monospace; }
    .stat-value { font-size: 20px; font-weight: 700; color: #fff; margin-top: 4px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table th { text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #94a3b8; border-bottom: 1px solid #1e293b; font-family: monospace; }
    .table td { padding: 12px 10px; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-family: monospace; font-weight: 600; text-transform: uppercase; }
    .tag-deep_work { background: rgba(99, 102, 241, 0.2); color: #a5b4fc; border: 1px solid rgba(99, 102, 241, 0.4); }
    .tag-meeting { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4); }
    .tag-commute { background: rgba(6, 182, 212, 0.2); color: #67e8f9; border: 1px solid rgba(6, 182, 212, 0.4); }
    .tag-break { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b; font-family: monospace; }
    @media print { body { background: #fff; color: #000; padding: 0; } .container { box-shadow: none; border: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <div class="logo">⚡ LOCUS COMMAND CENTER</div>
        <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Track 5: AI Real World Agent | Autonomous Executive Briefing</div>
      </div>
      <div style="text-align: right; font-size: 12px; color: #94a3b8; font-family: monospace;">
        <div>${city.toUpperCase()}</div>
        <div>${now}</div>
      </div>
    </div>

    <div class="verdict-banner">
      <div class="verdict-title">OBJECTIVE VERDICT: ${verdict === 'OFFICE' ? 'REPORT TO OFFICE' : 'WORK FROM HOME DIRECTIVE'}</div>
      <div style="font-size: 13px; color: #cbd5e1;">${response.office_reason || response.ai_summary}</div>
    </div>

    <div class="grid-stats">
      <div class="stat-card">
        <div class="stat-label">Atmosphere & Temp</div>
        <div class="stat-value">${temp}°C <span style="font-size: 13px; font-weight: normal; color: #94a3b8;">(${weatherCond})</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Weather Score</div>
        <div class="stat-value">${weatherScore}/100</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Engineering Workload</div>
        <div class="stat-value">${totalHours}h <span style="font-size: 13px; font-weight: normal; color: #94a3b8;">(Jira + PRs)</span></div>
      </div>
    </div>

    <h3 style="font-size: 14px; text-transform: uppercase; font-family: monospace; letter-spacing: 1px; color: #e2e8f0; margin-bottom: 0;">
      24-Hour Hour-by-Hour Operational Timeline
    </h3>

    <table class="table">
      <thead>
        <tr>
          <th>Time Window</th>
          <th>Operational Focus / Activity</th>
          <th>Category</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        ${scheduleBlocks
          .map(
            (b) => `
          <tr>
            <td style="font-family: monospace; font-weight: 600; color: #38bdf8;">${b.time}</td>
            <td><strong>${b.activity}</strong>${b.context ? `<br/><span style="font-size: 11px; color: #94a3b8;">${b.context}</span>` : ''}</td>
            <td><span class="tag tag-${b.category}">${b.category.replace('_', ' ')}</span></td>
            <td style="color: #94a3b8; font-size: 12px;">${b.location || city}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <div style="margin-top: 24px; padding: 16px; background: #161b26; border-radius: 10px; border: 1px solid #1e293b;">
      <div class="stat-label" style="margin-bottom: 8px;">Recommended Outfit & Commute Protocol</div>
      <div style="font-size: 13px; color: #cbd5e1;">${response.outfit_suggestion || 'Standard engineering attire.'}</div>
    </div>

    <div class="footer">
      Generated autonomously by Locus 8-Node LangGraph Pipeline. Integrations: OpenWeather, Gmail, Jira, GitHub, Notion, Slack, Resend.
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1-Click Executive HTML Report Download
 */
export function downloadExecutiveHtmlReport(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateExecutiveHtmlReport(response, scheduleBlocks);
  const city = (response.city || 'executive').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `locus_executive_briefing_${city}_${dateStr}.html`, 'text/html;charset=utf-8');
}

/**
 * Trigger native browser print dialog for executive PDF creation
 */
export function triggerPrintReport(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
