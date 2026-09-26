/**
 * Locus Chrome Extension Companion — Core Schemas & Types
 * Track 5: AI Real World Agent | Manifest V3 Companion
 * 
 * Exhaustive TypeScript definitions matching backend server.py,
 * storage schema, message bus contracts, and normalization utilities.
 */

// ── 1. Core Literals & Enums ─────────────────────────────────────────────────

export type Verdict = 'office' | 'wfh' | 'hybrid';
export type DecisionType = 'office' | 'wfh' | 'hybrid' | 'undecided';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ScheduleCategory = 'deep_work' | 'meeting' | 'commute' | 'break' | 'general';
export type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type OfflineSource = 'cached' | 'simulated' | 'none';
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export type DemoScenario =
  | 'day_planner_office'
  | 'outdoor_picnic'
  | 'travel_day'
  | 'storm_warning'
  | 'clear_day'
  | 'work_from_home';

// ── 2. Entity Models ─────────────────────────────────────────────────────────

/**
 * Normalized 24-hour schedule item.
 * Supports both title and activity for bidirectional frontend/backend interop.
 */
export interface ScheduleBlock {
  id: string;
  time: string;              // e.g. "09:00–11:00" or "Slot 1"
  startTime?: string;        // e.g. "09:00" (HH:mm)
  endTime?: string;          // e.g. "11:00" (HH:mm)
  title: string;             // Human-readable task/activity title
  activity?: string;          // Backwards compatibility alias for title
  category: ScheduleCategory;// Category for visual grouping & color coding
  completed: boolean;        // Completion check state
  location?: string;         // e.g. "Office Desk", "Home Office", "Meeting Room 2"
  context?: string;          // Associated Jira/GitHub/Gmail reference
}

/**
 * Jira ticket representation matching backend jira_workload.py
 */
export interface JiraTicket {
  key: string;
  summary: string;
  priority: PriorityLevel | string;
  status: string;
  issue_type?: string;
  estimated_hours: number;
  url?: string;
}

/**
 * GitHub Pull Request representation matching backend github_workload.py
 */
export interface GitHubPR {
  type?: 'PR' | string;
  number: number;
  title: string;
  author: string;
  user?: string;
  state: string;
  draft?: boolean;
  is_draft?: boolean;
  days_old: number;
  url?: string;
  html_url?: string;
  estimated_hours?: number;
  est_hours?: number;
  review_hours?: number;
}

/**
 * GitHub Issue representation matching backend github_workload.py
 */
export interface GitHubIssue {
  type?: 'Issue' | string;
  number: number;
  title: string;
  state: string;
  days_old: number;
  url?: string;
  html_url?: string;
  author?: string;
  user?: string;
  estimated_hours?: number;
  est_hours?: number;
  review_hours?: number;
}

/**
 * Gmail calendar event context matching backend gmail_reader.py
 */
export interface GmailEvent {
  subject: string;
  from: string;
  snippet: string;
  date?: string;
  has_outdoor?: boolean;
  has_travel?: boolean;
}

/**
 * Normalized compact weather snapshot for Popup HUD & widgets
 */
export interface WeatherSnapshot {
  city: string;
  weatherScore: number;       // 0-100 score
  temperatureC: number;       // Temperature in Celsius
  riskLevel: RiskLevel;       // Risk assessment
  condition: string;          // e.g. "Clear", "Rain", "Mist"
  feelsLikeC?: number;
  humidity?: number;
  windSpeed?: number;
  icon?: string | null;
  summary?: string;
}

// ── 3. Exhaustive Backend AgentResponse (38 Fields) & Request Payloads ────────

/**
 * Request payload for POST /run
 */
export interface AgentRequest {
  user_request: string;
  city?: string;
  user_email?: string;
}

/**
 * Request payload for POST /demo
 */
export interface DemoScenarioRequest {
  scenario: DemoScenario | string;
  city?: string;
  user_email?: string;
}

/**
 * Complete, exhaustive response schema from backend server.py (38 fields).
 * Matches FastAPI AgentResponse Pydantic model directly.
 */
export interface AgentResponse {
  // User & Request Context
  user_request?: string;
  user_email?: string;
  weather_data?: Record<string, unknown>;

  // 1-12: Atmospheric & Weather Data
  city: string;
  weather_summary: string;
  temperature_c: number;
  feels_like_c: number | null;
  humidity: number;
  wind_speed: number;
  weather_condition: string;
  weather_icon: string | null;
  weather_score: number;
  risk_level: RiskLevel;
  forecast_summary: string;
  weather_alerts: string[];
  uv_index?: number | null;

  // 13-19: AI Synthesis & Office Decision
  ai_summary: string;
  go_to_office: DecisionType | Verdict | string;
  office_reason: string | null;
  estimated_productive_hours: number;
  recommendations: string[];
  outfit_suggestion: string;
  activity_adjustments: string[];
  should_alert?: boolean;

  // 20-23: Gmail Context
  gmail_events: GmailEvent[];
  gmail_summary: string | null;
  has_outdoor_plans: boolean;
  has_travel_plans: boolean;

  // 24-26: Jira Workload
  jira_tickets: JiraTicket[];
  jira_issues?: JiraTicket[] | Record<string, unknown>[];
  jira_estimated_hours: number;
  jira_total_hours?: number;
  jira_summary: string | null;
  jira_issue_lines?: string[];
  jira_high_priority?: number;
  jira_blocked_count?: number;

  // 27-30: GitHub Workload
  github_prs: GitHubPR[];
  github_issues: GitHubIssue[];
  github_issues_open?: GitHubIssue[] | Record<string, unknown>[];
  github_estimated_hours: number;
  github_total_hours?: number;
  github_summary: string | null;
  github_stale_prs?: GitHubPR[] | Record<string, unknown>[];

  // 31-36: Integrations & Artifacts
  day_plan_timeline: (string | ScheduleBlock | Record<string, unknown>)[];
  notion_logged: boolean;
  notion_page_id?: string | null;
  notion_page_url: string | null;
  slack_message_sent: boolean;
  slack_channel?: string;
  email_sent: boolean;
  resend_message_id: string | null;

  // 37-38: Telemetry & Log
  execution_log: string[];
  processed_at: string;
}

/**
 * Raw response from GET /weather/{city}
 */
export interface QuickWeatherResponse {
  city: string;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  description: string;
  icon_url: string;
  timestamp: string;
  is_mock: boolean;
}

/**
 * Past execution item from GET /history
 */
export interface HistoryItem {
  processed_at: string;
  city: string;
  weather_condition: string;
  temperature_c: number;
  feels_like_c: number;
  weather_score: number;
  risk_level: RiskLevel | string;
  go_to_office: DecisionType | Verdict | string;
  office_reason: string;
  ai_summary: string;
  email_sent: boolean;
  slack_sent: boolean;
  notion_logged: boolean;
}

/**
 * Response from GET /history
 */
export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

/**
 * Response from GET /analytics
 */
export interface AnalyticsResponse {
  total_runs: number;
  avg_weather_score?: number;
  risk_distribution?: Record<string, number>;
  top_conditions?: Record<string, number>;
  office_distribution?: Record<string, number>;
  emails_sent?: number;
  slack_alerts?: number;
  notion_pages?: number;
  outdoor_plans_detected?: number;
  travel_plans_detected?: number;
  swytchcode_api_calls?: number;
  message?: string;
}

/**
 * Response from GET /health
 */
export interface HealthResponse {
  status: string;
  timestamp: string;
  agent: string;
  version: string;
  track: string;
  framework: string;
  integrations: Record<string, boolean>;
  swytchcode_apis: string[];
  history_count: number;
  live_connections: number;
  default_city: string;
}

// ── 4. Chrome Extension Settings & Storage Schema ───────────────────────────

/**
 * Extension user-configurable settings
 */
export interface ExtensionSettings {
  backendUrl: string;             // Base URL for backend, default "http://localhost:8000"
  defaultCity: string;            // Default city for queries, default "Mumbai"
  syncIntervalMinutes: number;    // Background alarm sync period, default 5
  notificationsEnabled: boolean;  // Schedule transition notifications
  badgeEnabled: boolean;          // Dynamic icon badge indicator
  autoOpenSidePanel?: boolean;    // Auto open side panel on browser actions
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  backendUrl: 'http://localhost:8000',
  defaultCity: 'Mumbai',
  syncIntervalMinutes: 5,
  notificationsEnabled: true,
  badgeEnabled: true,
};

/**
 * Context detected from active browser tab by content script
 */
export interface DetectedContext {
  source: 'jira' | 'github';
  id: string;                 // e.g. "PROJ-101" or "#42"
  title: string;              // Issue summary or PR title
  url: string;                // Full page URL
  timestamp?: number;         // Detected epoch timestamp (ms)
}

/**
 * Schema stored in chrome.storage.local
 */
export interface StorageState {
  schemaVersion?: number;
  lastResponse: AgentResponse | null;
  scheduleBlocks: ScheduleBlock[];
  activeContext: DetectedContext | null;
  settings: ExtensionSettings;
  isOffline: boolean;
  lastSyncedAt: number | null; // Epoch timestamp (ms) or null
  offlineSource?: OfflineSource;
  offlineReason?: string | null;
  error?: string | null;
}

export const DEFAULT_STORAGE_STATE: StorageState = {
  schemaVersion: 1,
  lastResponse: null,
  scheduleBlocks: [],
  activeContext: null,
  settings: DEFAULT_SETTINGS,
  isOffline: false,
  lastSyncedAt: null,
  offlineSource: 'none',
  offlineReason: null,
  error: null,
};

// ── 5. Message Bus Interfaces ────────────────────────────────────────────────

export type ExtensionMessageType =
  | 'CONTEXT_DETECTED'
  | 'SYNC_REQUEST'
  | 'STATE_UPDATED'
  | 'GET_STATE'
  | 'TOGGLE_BLOCK'
  | 'EXPORT_ICS'
  | 'OPEN_NOTION'
  | 'PING'
  | 'PONG';

export interface ContextDetectedMessage {
  type: 'CONTEXT_DETECTED';
  payload: DetectedContext;
}

export interface SyncRequestMessage {
  type: 'SYNC_REQUEST';
  payload?: {
    force?: boolean;
    city?: string;
    userRequest?: string;
  };
}

export interface StateUpdatedMessage {
  type: 'STATE_UPDATED';
  payload: StorageState;
}

export interface GetStateMessage {
  type: 'GET_STATE';
}

export interface ToggleBlockMessage {
  type: 'TOGGLE_BLOCK';
  payload: {
    blockId: string;
    completed: boolean;
  };
}

export interface ExportIcsMessage {
  type: 'EXPORT_ICS';
}

export interface OpenNotionMessage {
  type: 'OPEN_NOTION';
  payload?: {
    url?: string;
  };
}

export interface PingMessage {
  type: 'PING';
}

export interface PongMessage {
  type: 'PONG';
  timestamp: number;
}

export type ExtensionMessage =
  | ContextDetectedMessage
  | SyncRequestMessage
  | StateUpdatedMessage
  | GetStateMessage
  | ToggleBlockMessage
  | ExportIcsMessage
  | OpenNotionMessage
  | PingMessage
  | PongMessage;

// ── 6. Normalization Utilities ───────────────────────────────────────────────

/**
 * Normalizes backend go_to_office strings into strictly typed Verdict.
 * Handles synonyms and edge cases mirroring backend server.py normalize_office_decision.
 */
export function normalizeVerdict(val?: string | null): Verdict {
  if (!val) return 'wfh';
  const v = String(val).trim().toLowerCase();
  if (['office', 'yes', 'go_to_office', 'true', '1', 'commute'].includes(v)) {
    return 'office';
  }
  if (['hybrid', 'maybe', 'flexible', 'partial', 'flex'].includes(v)) {
    return 'hybrid';
  }
  return 'wfh';
}

/**
 * Parses time range string (e.g. "09:00–12:00" or "09:00 - 12:00") into startTime and endTime.
 */
export function parseTimeRange(timeStr: string): { startTime?: string; endTime?: string } {
  if (!timeStr) return {};
  const match = timeStr.match(/^(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (match && match[1] && match[2]) {
    return {
      startTime: match[1].padStart(5, '0'),
      endTime: match[2].padStart(5, '0'),
    };
  }
  return {};
}

/**
 * Categorizes an activity string using keywords.
 */
export function detectCategory(activity: string): ScheduleCategory {
  const lower = activity.toLowerCase();
  if (
    lower.includes('jira') ||
    lower.includes('github') ||
    lower.includes('code') ||
    lower.includes('fix') ||
    lower.includes('dev') ||
    lower.includes('pr review')
  ) {
    return 'deep_work';
  }
  if (
    lower.includes('standup') ||
    lower.includes('sync') ||
    lower.includes('meeting') ||
    lower.includes('demo') ||
    lower.includes('call')
  ) {
    return 'meeting';
  }
  if (
    lower.includes('commute') ||
    lower.includes('transit') ||
    lower.includes('airport') ||
    lower.includes('flight') ||
    lower.includes('walk') ||
    lower.includes('travel')
  ) {
    return 'commute';
  }
  if (
    lower.includes('lunch') ||
    lower.includes('break') ||
    lower.includes('chai') ||
    lower.includes('coffee') ||
    lower.includes('picnic') ||
    lower.includes('rest')
  ) {
    return 'break';
  }
  return 'general';
}

/**
 * Normalizes day_plan_timeline elements (which may be raw strings or objects)
 * into fully typed ScheduleBlock items.
 */
export function normalizeTimeline(
  items?: (string | ScheduleBlock | Record<string, any>)[]
): ScheduleBlock[] {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item, idx) => {
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, any>;
      const time = obj.time || `Slot ${idx + 1}`;
      const title = obj.title || obj.activity || `Task ${idx + 1}`;
      const { startTime, endTime } = parseTimeRange(time);
      return {
        id: obj.id || `block-${idx}-${Date.now()}`,
        time,
        startTime: obj.startTime || startTime,
        endTime: obj.endTime || endTime,
        title,
        activity: obj.activity || title,
        category: obj.category || detectCategory(title),
        completed: Boolean(obj.completed),
      };
    }

    const rawStr = typeof item === 'string' ? item : JSON.stringify(item);
    // Matches patterns like "09:00–12:00: [Jira] Fix bug" or "09:00 - 12:00: Activity"
    const match = rawStr.match(/^([\d]{1,2}:[\d]{2}(?:\s*[-–—]\s*[\d]{1,2}:[\d]{2})?)\s*[:|-]\s*(.+)$/);
    const time = match && match[1] ? match[1].trim() : `Slot ${idx + 1}`;
    const title = match && match[2] ? match[2].trim() : rawStr;
    const { startTime, endTime } = parseTimeRange(time);
    const category = detectCategory(title);

    return {
      id: `block-${idx}-${Date.now()}`,
      time,
      startTime,
      endTime,
      title,
      activity: title,
      category,
      completed: false,
    };
  });
}

/**
 * Extracts a compact WeatherSnapshot from an AgentResponse.
 */
export function toWeatherSnapshot(res: AgentResponse): WeatherSnapshot {
  return {
    city: res.city,
    weatherScore: res.weather_score,
    temperatureC: res.temperature_c,
    riskLevel: res.risk_level,
    condition: res.weather_condition,
    feelsLikeC: res.feels_like_c ?? undefined,
    humidity: res.humidity,
    windSpeed: res.wind_speed,
    icon: res.weather_icon,
    summary: res.weather_summary,
  };
}

// ── 7. WOW Edition: Pomodoro, Analytics & City Presets ───────────────────────

export type PomodoroPreset = 'focus_25' | 'deep_50' | 'short_break_5' | 'long_break_15';

export interface PomodoroPresetConfig {
  id: PomodoroPreset;
  label: string;
  durationSeconds: number;
}

export const POMODORO_PRESETS: PomodoroPresetConfig[] = [
  { id: 'focus_25', label: 'Focus 25m', durationSeconds: 25 * 60 },
  { id: 'deep_50', label: 'Deep 50m', durationSeconds: 50 * 60 },
  { id: 'short_break_5', label: 'Break 5m', durationSeconds: 5 * 60 },
  { id: 'long_break_15', label: 'Rest 15m', durationSeconds: 15 * 60 },
];

export interface PomodoroState {
  preset: PomodoroPreset;
  remainingSeconds: number;
  isRunning: boolean;
  completedSessions: number;
}

export const CITY_PRESETS = [
  'Mumbai',
  'Bengaluru',
  'London',
  'New York',
  'San Francisco',
  'Tokyo',
] as const;

export type CityPreset = typeof CITY_PRESETS[number];

export interface DayAnalytics {
  totalBlocks: number;
  completedBlocks: number;
  completionRate: number; // 0 - 100
  deepWorkHours: number;
  meetingHours: number;
  commuteHours: number;
  breakHours: number;
}

/**
 * Calculates real-time day plan analytics from schedule blocks.
 */
export function calculateDayAnalytics(blocks: ScheduleBlock[]): DayAnalytics {
  const totalBlocks = blocks.length;
  const completedBlocks = blocks.filter((b) => b.completed).length;
  const completionRate = totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0;

  let deepWorkHours = 0;
  let meetingHours = 0;
  let commuteHours = 0;
  let breakHours = 0;

  for (const b of blocks) {
    let hours = 1.0;
    if (b.time) {
      const match = b.time.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
      if (match && match[1] && match[2] && match[3] && match[4]) {
        const start = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        const end = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
        hours = Math.max(0.25, (end - start) / 60);
      }
    }
    if (b.category === 'deep_work') deepWorkHours += hours;
    else if (b.category === 'meeting') meetingHours += hours;
    else if (b.category === 'commute') commuteHours += hours;
    else if (b.category === 'break') breakHours += hours;
  }

  return {
    totalBlocks,
    completedBlocks,
    completionRate,
    deepWorkHours: Number(deepWorkHours.toFixed(1)),
    meetingHours: Number(meetingHours.toFixed(1)),
    commuteHours: Number(commuteHours.toFixed(1)),
    breakHours: Number(breakHours.toFixed(1)),
  };
}

