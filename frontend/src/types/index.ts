// Core Enums & Literals
export type DecisionType = 'office' | 'wfh' | 'hybrid' | 'undecided';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type NodeStatus = 'idle' | 'running' | 'completed' | 'fallback' | 'error';
export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
export type ScheduleCategory = 'deep_work' | 'meeting' | 'commute' | 'break' | 'general';
export type PriorityLevel = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';

// Timeline Item
export interface ScheduleBlock {
  id: string;
  time: string;
  activity: string;
  category: ScheduleCategory;
  location?: string;
  context?: string;
  completed: boolean;
}

// Jira Ticket
export interface JiraTicket {
  key: string;
  summary: string;
  priority: PriorityLevel;
  status: string;
  issue_type?: string;
  estimated_hours: number;
}

// GitHub PR
export interface GitHubPR {
  type?: 'PR';
  number: number;
  title: string;
  author: string;
  user?: string;
  state: string;
  draft?: boolean;
  is_draft?: boolean;
  days_old: number;
  url?: string;
  estimated_hours?: number;
  est_hours?: number;
  review_hours?: number;
}

// GitHub Issue
export interface GitHubIssue {
  type?: 'Issue';
  number: number;
  title: string;
  state: string;
  days_old: number;
  url?: string;
  author?: string;
  est_hours?: number;
}

// Gmail Event Context
export interface GmailEvent {
  subject: string;
  from: string;
  snippet: string;
  date?: string;
  has_outdoor?: boolean;
  has_travel?: boolean;
}

// Exhaustive AgentResponse with all 38 backend fields guaranteed
export interface AgentResponse {
  // 1-12: Atmospheric & Weather Data
  city: string;
  weather_summary: string;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  wind_speed: number;
  weather_condition: string;
  weather_icon: string | null;
  weather_score: number;
  risk_level: RiskLevel;
  forecast_summary: string;
  weather_alerts: string[];

  // 13-19: AI Synthesis & Office Decision
  ai_summary: string;
  go_to_office: DecisionType;
  office_reason: string;
  estimated_productive_hours: number;
  recommendations: string[];
  outfit_suggestion: string;
  activity_adjustments: string[];

  // 20-23: Gmail Context
  gmail_events: GmailEvent[];
  gmail_summary: string | null;
  has_outdoor_plans: boolean;
  has_travel_plans: boolean;

  // 24-26: Jira Workload
  jira_tickets: JiraTicket[];
  jira_estimated_hours: number;
  jira_summary: string | null;

  // 27-30: GitHub Workload
  github_prs: GitHubPR[];
  github_issues: GitHubIssue[];
  github_estimated_hours: number;
  github_summary: string | null;

  // 31-36: Integrations & Artifacts
  day_plan_timeline: (string | ScheduleBlock)[];
  notion_logged: boolean;
  notion_page_url: string | null;
  slack_message_sent: boolean;
  email_sent: boolean;
  resend_message_id: string | null;

  // 37-38: Telemetry & Log
  execution_log: string[];
  processed_at: string;
}

// Node in 8-Node Swarm Topology
export interface TopologyNode {
  id: string;
  index: number;
  name: string;
  service: string;
  description: string;
  status: NodeStatus;
  latencyMs?: number;
  dataSummary?: string;
  payload?: any;
  iconName: string;
}

// WebSocket Event Structures
export interface WSStepEvent {
  type: 'step_complete';
  step: 'weather' | 'gmail' | 'jira' | 'github' | 'ai_advisor' | 'notion' | 'slack' | 'resend' | string;
  data: Record<string, any>;
  latencyMs?: number;
  timestamp?: string;
}

export interface WSAgentCompleteEvent {
  type: 'agent_complete';
  city: string;
  risk: RiskLevel | string;
  score: number;
  go_to_office: DecisionType | string;
  office_reason: string;
  timestamp?: string;
}

export interface WSErrorEvent {
  type: 'pipeline_error';
  error: string;
  timestamp?: string;
}

export interface WSConnectedEvent {
  type: 'connected';
  message: string;
  recent_runs?: number;
}

export type WSEvent = WSStepEvent | WSAgentCompleteEvent | WSErrorEvent | WSConnectedEvent;

// REST API Contracts
export interface AgentRequest {
  user_request: string;
  city?: string;
  user_email?: string;
}

export interface DemoRequest {
  scenario: string;
  city?: string;
  user_email?: string;
}

export interface HealthResponse {
  status: string;
  timestamp?: string;
  agent: string;
  version: string;
  track?: string;
  framework?: string;
  integrations: {
    openweather: boolean;
    gmail: boolean;
    jira: boolean;
    github: boolean;
    notion: boolean;
    slack: boolean;
    resend: boolean;
    [key: string]: boolean;
  };
  swytchcode_apis?: string[];
  history_count: number;
  live_connections?: number;
  default_city?: string;
}

export interface WeatherLookupResponse {
  city: string;
  temperature_c: number;
  feels_like_c: number;
  humidity: number;
  wind_speed: number;
  condition: string;
  description?: string;
  icon_url?: string;
  timestamp: string;
  is_mock: boolean;
}

export interface HistoryItem {
  processed_at: string;
  city: string;
  weather_condition: string;
  temperature_c: number;
  feels_like_c: number;
  weather_score: number;
  risk_level: RiskLevel;
  go_to_office: DecisionType;
  office_reason: string;
  ai_summary: string;
  email_sent: boolean;
  slack_sent: boolean;
  notion_logged: boolean;
  [key: string]: any;
}

export interface HistoryResponse {
  items: HistoryItem[];
  total: number;
}

export interface AnalyticsResponse {
  total_runs: number;
  avg_weather_score: number;
  risk_distribution: Record<string, number>;
  top_conditions: Record<string, number>;
  office_distribution: Record<string, number>;
  emails_sent: number;
  slack_alerts: number;
  notion_pages: number;
  outdoor_plans_detected: number;
  travel_plans_detected: number;
  swytchcode_api_calls: number;
}

export interface AuditItem {
  timestamp: string;
  tools_called: string[];
  city: string;
  risk: string;
  score: number;
  go_to_office: string;
  office_reason: string;
  notion_logged: boolean;
  slack_sent: boolean;
  email_sent: boolean;
}

export interface AuditResponse {
  audit_trail: AuditItem[];
  total_api_calls: number;
  timestamp: string;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'info' | 'ws' | 'tool' | 'verdict' | 'error' | 'success';
  source: string;
  message: string;
  latencyMs?: number;
  payload?: any;
}

// Preset Scenario definition
export interface PresetScenario {
  id: string;
  key: string;
  title: string;
  city: string;
  iconName: string;
  description: string;
  expectedVerdict: DecisionType;
  tag: string;
  query: string;
}
