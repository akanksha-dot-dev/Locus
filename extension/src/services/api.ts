/**
 * Locus Chrome Extension Companion — REST API Client
 * Milestone 2: Backend REST API contracts, timeout handling, error normalization.
 * 
 * Interfaces with the local Locus backend at http://localhost:8000
 * Endpoints:
 *   POST /run            — Full 8-Node LangGraph Day Planner pipeline
 *   POST /demo           — Scenario preset pipeline
 *   GET  /weather/{city} — Quick atmospheric lookup with OpenWeather fallback
 *   GET  /history        — Past pipeline execution history
 *   GET  /analytics      — Aggregate execution metrics
 *   GET  /health         — Backend liveness & integration status check
 */

import {
  AgentRequest,
  AgentResponse,
  AnalyticsResponse,
  DemoScenario,
  DemoScenarioRequest,
  HealthResponse,
  HistoryResponse,
  QuickWeatherResponse,
  RiskLevel,
  WeatherSnapshot,
  normalizeTimeline,
  normalizeVerdict,
} from '../types/index';

// ── 1. Error Classification & Types ──────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly endpoint: string;
  public readonly isTimeout: boolean;
  public readonly isNetworkError: boolean;
  public readonly isServerError: boolean;
  public readonly isClientError: boolean;
  public readonly isNotFound: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      endpoint: string;
      isTimeout?: boolean;
      isNetworkError?: boolean;
      details?: unknown;
    }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.endpoint = options.endpoint;
    this.isTimeout = Boolean(options.isTimeout);
    this.isNetworkError = Boolean(options.isNetworkError);
    this.isServerError = this.status >= 500 && this.status < 600;
    this.isClientError = this.status >= 400 && this.status < 500;
    this.isNotFound = this.status === 404;
    this.details = options.details;

    // Restore prototype chain in transpiled ES5/ES6
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

// ── 2. Timeouts & Defaults ───────────────────────────────────────────────────

export const DEFAULT_BACKEND_URL = 'http://localhost:8000';
export const PIPELINE_TIMEOUT_MS = 45000; // 45s for full 8-node LangGraph Gemini execution
export const FAST_QUERY_TIMEOUT_MS = 5000; // 5s for health, weather, history, analytics

// ── 3. Normalization Utilities ───────────────────────────────────────────────

/**
 * Normalizes raw or partial backend response to guarantee all 38 fields exist
 * and timeline blocks / verdicts are strictly typed.
 */
export function normalizeAgentResponse(raw: any): AgentResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Cannot normalize invalid AgentResponse payload (non-object)');
  }

  const rawOffice = raw.go_to_office || 'wfh';
  const normalizedOffice = normalizeVerdict(rawOffice);

  // Normalize day plan timeline
  const rawTimeline = Array.isArray(raw.day_plan_timeline) ? raw.day_plan_timeline : [];
  const normalizedTimeline = normalizeTimeline(rawTimeline);

  return {
    // Atmospheric & Weather Data
    city: String(raw.city || 'Mumbai'),
    weather_summary: String(raw.weather_summary || 'Weather data unavailable'),
    temperature_c: typeof raw.temperature_c === 'number' ? raw.temperature_c : Number(raw.temperature_c ?? 25),
    feels_like_c: typeof raw.feels_like_c === 'number' ? raw.feels_like_c : (raw.feels_like_c !== null && raw.feels_like_c !== undefined ? Number(raw.feels_like_c) : null),
    humidity: typeof raw.humidity === 'number' ? raw.humidity : Number(raw.humidity ?? 50),
    wind_speed: typeof raw.wind_speed === 'number' ? raw.wind_speed : Number(raw.wind_speed ?? 0),
    weather_condition: String(raw.weather_condition || 'Clear'),
    weather_icon: raw.weather_icon ? String(raw.weather_icon) : null,
    weather_score: typeof raw.weather_score === 'number' ? Math.round(raw.weather_score) : Number(raw.weather_score ?? 70),
    risk_level: (raw.risk_level || 'low') as RiskLevel,
    forecast_summary: String(raw.forecast_summary || ''),
    weather_alerts: Array.isArray(raw.weather_alerts) ? raw.weather_alerts.map(String) : [],

    // AI Synthesis & Office Decision
    ai_summary: String(raw.ai_summary || ''),
    go_to_office: normalizedOffice,
    office_reason: raw.office_reason !== undefined && raw.office_reason !== null ? String(raw.office_reason) : null,
    estimated_productive_hours: typeof raw.estimated_productive_hours === 'number'
      ? raw.estimated_productive_hours
      : Number(raw.estimated_productive_hours ?? 6.0),
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String) : [],
    outfit_suggestion: String(raw.outfit_suggestion || 'Comfortable attire recommended'),
    activity_adjustments: Array.isArray(raw.activity_adjustments) ? raw.activity_adjustments.map(String) : [],

    // Gmail Context
    gmail_events: Array.isArray(raw.gmail_events) ? raw.gmail_events : [],
    gmail_summary: raw.gmail_summary ? String(raw.gmail_summary) : null,
    has_outdoor_plans: Boolean(raw.has_outdoor_plans),
    has_travel_plans: Boolean(raw.has_travel_plans),

    // Jira Workload
    jira_tickets: Array.isArray(raw.jira_tickets) ? raw.jira_tickets : [],
    jira_estimated_hours: typeof raw.jira_estimated_hours === 'number' ? raw.jira_estimated_hours : Number(raw.jira_estimated_hours ?? 0),
    jira_summary: raw.jira_summary ? String(raw.jira_summary) : null,

    // GitHub Workload
    github_prs: Array.isArray(raw.github_prs) ? raw.github_prs : [],
    github_issues: Array.isArray(raw.github_issues) ? raw.github_issues : [],
    github_estimated_hours: typeof raw.github_estimated_hours === 'number' ? raw.github_estimated_hours : Number(raw.github_estimated_hours ?? 0),
    github_summary: raw.github_summary ? String(raw.github_summary) : null,

    // Integrations & Artifacts
    day_plan_timeline: normalizedTimeline,
    notion_logged: Boolean(raw.notion_logged),
    notion_page_url: raw.notion_page_url ? String(raw.notion_page_url) : null,
    slack_message_sent: Boolean(raw.slack_message_sent),
    email_sent: Boolean(raw.email_sent),
    resend_message_id: raw.resend_message_id ? String(raw.resend_message_id) : null,

    // Telemetry & Log
    execution_log: Array.isArray(raw.execution_log) ? raw.execution_log.map(String) : [],
    processed_at: String(raw.processed_at || new Date().toISOString()),
  };
}

/**
 * Transforms QuickWeatherResponse into compact WeatherSnapshot
 */
export function quickWeatherToSnapshot(w: QuickWeatherResponse): WeatherSnapshot {
  const isBad = ['Rain', 'Thunderstorm', 'Snow', 'Tornado'].includes(w.condition) || w.temperature_c > 38 || w.temperature_c < 5;
  const isFair = ['Mist', 'Haze', 'Clouds', 'Drizzle'].includes(w.condition);
  const score = isBad ? 25 : (isFair ? 55 : 85);
  const risk: RiskLevel = isBad ? 'high' : (isFair ? 'medium' : 'low');

  return {
    city: w.city,
    weatherScore: score,
    temperatureC: w.temperature_c,
    riskLevel: risk,
    condition: w.condition,
    feelsLikeC: w.feels_like_c,
    humidity: w.humidity,
    windSpeed: w.wind_speed,
    icon: w.icon_url,
    summary: w.description,
  };
}

// ── 4. ApiService Implementation ─────────────────────────────────────────────

export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BACKEND_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, ''); // Strip trailing slashes
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = (url || DEFAULT_BACKEND_URL).replace(/\/+$/, '');
  }

  /**
   * Internal fetch wrapper providing timeout aborting and structured error translation.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = FAST_QUERY_TIMEOUT_MS
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    let isTimeout = false;

    const timeoutId = setTimeout(() => {
      isTimeout = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });

      if (!response.ok) {
        let details: any = null;
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

        try {
          details = await response.json();
          if (details && details.detail) {
            errorMessage = typeof details.detail === 'string'
              ? details.detail
              : JSON.stringify(details.detail);
          }
        } catch {
          // Response body was not JSON, fallback to status text
        }

        throw new ApiError(errorMessage, {
          status: response.status,
          endpoint,
          details,
        });
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      if (isTimeout || err?.name === 'AbortError') {
        throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, {
          endpoint,
          isTimeout: true,
        });
      }

      // General network error (e.g. Connection Refused when backend is offline)
      throw new ApiError(err?.message || `Network error connecting to ${endpoint}`, {
        endpoint,
        isNetworkError: true,
        details: err,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * GET /health — Checks server liveness and integration states.
   */
  public async checkHealth(timeoutMs: number = FAST_QUERY_TIMEOUT_MS): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health', { method: 'GET' }, timeoutMs);
  }

  /**
   * POST /run — Runs the full 8-node LangGraph Day Planner pipeline.
   */
  public async runPipeline(
    request: AgentRequest,
    timeoutMs: number = PIPELINE_TIMEOUT_MS
  ): Promise<AgentResponse> {
    const raw = await this.request<any>(
      '/run',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      timeoutMs
    );
    return normalizeAgentResponse(raw);
  }

  /**
   * POST /demo — Runs a preset demo scenario.
   */
  public async runDemo(
    scenario: DemoScenario | string,
    city?: string,
    userEmail?: string,
    timeoutMs: number = PIPELINE_TIMEOUT_MS
  ): Promise<AgentResponse> {
    const payload: DemoScenarioRequest = {
      scenario,
      city,
      user_email: userEmail,
    };
    const raw = await this.request<any>(
      '/demo',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      timeoutMs
    );
    return normalizeAgentResponse(raw);
  }

  /**
   * GET /weather/{city} — Quick atmospheric weather lookup.
   */
  public async getWeather(
    city: string,
    timeoutMs: number = FAST_QUERY_TIMEOUT_MS
  ): Promise<QuickWeatherResponse> {
    const encoded = encodeURIComponent(city.trim());
    return this.request<QuickWeatherResponse>(`/weather/${encoded}`, { method: 'GET' }, timeoutMs);
  }

  /**
   * GET /history — Past pipeline runs in reverse chronological order.
   */
  public async getHistory(
    limit: number = 20,
    timeoutMs: number = FAST_QUERY_TIMEOUT_MS
  ): Promise<HistoryResponse> {
    return this.request<HistoryResponse>(`/history?limit=${limit}`, { method: 'GET' }, timeoutMs);
  }

  /**
   * GET /analytics — Aggregate system execution metrics.
   */
  public async getAnalytics(timeoutMs: number = FAST_QUERY_TIMEOUT_MS): Promise<AnalyticsResponse> {
    return this.request<AnalyticsResponse>('/analytics', { method: 'GET' }, timeoutMs);
  }
}

// Export default singleton instance
export const apiService = new ApiService();
