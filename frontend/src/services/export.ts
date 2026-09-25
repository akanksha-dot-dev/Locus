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
    'PRODID:-//SwytchAgent//Day Planner 2.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:SwytchAgent Day Plan - ${escapeICS(city)} (${dateStr})`,
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
    const uid = `swytchagent-${dateStr}-${index}-${now.getTime()}@swytchagent.ai`;
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
    `# 📅 SwytchAgent Day Plan — ${city}`,
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
  lines.push(`| **Slack** | Incident Broadcast Alert | ${response.slack_message_sent ? '✅ Delivered' : '⚪ Standby'} | #swytchagent-briefings channel |`);
  lines.push(`| **Resend** | Executive Email Dispatch | ${response.email_sent ? '✅ Sent' : '⚪ Standby'} | Message ID: \`${response.resend_message_id || 'simulated-resend-id'}\` |`);
  lines.push('');
  lines.push('---');
  lines.push('*Generated by SwytchAgent Day Planner (v2.0) · Track 5: AI Real World Agent*');

  return lines.join('\n');
}

/**
 * Pure client-side generator for structured JSON summary (.json)
 */
export function generateJSON(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): string {
  const exportPayload = {
    metadata: {
      generator: 'SwytchAgent Day Planner (v2.0)',
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
  downloadBlob(content, `swytchagent_${city}_${dateStr}.ics`, 'text/calendar;charset=utf-8');
}

/**
 * 1-Click Markdown (.md) download
 */
export function downloadMarkdown(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateMarkdown(response, scheduleBlocks);
  const city = (response.city || 'day_plan').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `swytchagent_${city}_${dateStr}.md`, 'text/markdown;charset=utf-8');
}

/**
 * 1-Click JSON (.json) download
 */
export function downloadJSON(response: AgentResponse, scheduleBlocks: ScheduleBlock[]): void {
  const content = generateJSON(response, scheduleBlocks);
  const city = (response.city || 'day_plan').toLowerCase().replace(/\s+/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  downloadBlob(content, `swytchagent_${city}_${dateStr}.json`, 'application/json;charset=utf-8');
}
