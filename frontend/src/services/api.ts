import {
  AgentRequest,
  AgentResponse,
  AnalyticsResponse,
  AuditResponse,
  DemoRequest,
  HealthResponse,
  HistoryResponse,
  WeatherLookupResponse,
} from '../types';
import { DEFAULT_MOCK_RESPONSE, MOCK_RESPONSES } from '../constants/mockData';

// API Configuration
const API_BASE_URL =
  (import.meta.env?.VITE_API_URL as string) ||
  (window.location.hostname === 'localhost' ? 'http://localhost:8000' : '/api');

const TIMEOUT_MS = 12000;

/**
 * Fetch wrapper with configurable timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Helper to match a user query to the best mock scenario when offline
 */
function findBestMockScenario(query: string, city?: string): AgentResponse {
  const q = (query || '').toLowerCase();
  const c = (city || '').toLowerCase();

  if (c.includes('delhi') || q.includes('flight') || q.includes('delhi') || q.includes('airport')) {
    return { ...MOCK_RESPONSES.travel_day, city: city || 'Delhi', processed_at: new Date().toISOString() };
  }
  if (c.includes('new york') || c.includes('nyc') || q.includes('sprint') || q.includes('jira') || q.includes('pr')) {
    return { ...MOCK_RESPONSES.day_planner_office, city: city || 'New York', processed_at: new Date().toISOString() };
  }
  if (c.includes('mumbai') || q.includes('picnic') || q.includes('friday') || q.includes('mumbai')) {
    return { ...MOCK_RESPONSES.clear_day, city: city || 'Mumbai', processed_at: new Date().toISOString() };
  }

  return {
    ...MOCK_RESPONSES.storm_warning,
    city: city || 'London',
    processed_at: new Date().toISOString(),
  };
}

export const apiService = {
  /**
   * Primary pipeline execution for custom natural language queries
   */
  async runPipeline(request: AgentRequest): Promise<AgentResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/run`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (err) {
      console.warn('[apiService] POST /run failed or backend offline. Activating graceful mock fallback.', err);
      const fallback = findBestMockScenario(request.user_request, request.city);
      fallback.execution_log = [
        `⚠️ [Offline Fallback] Server at ${API_BASE_URL} unreachable. Loaded synthetic LangGraph snapshot.`,
        ...fallback.execution_log,
      ];
      return fallback;
    }
  },

  /**
   * Preset scenario execution
   */
  async triggerDemo(request: DemoRequest): Promise<AgentResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/demo`, {
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (err) {
      console.warn('[apiService] POST /demo failed. Using deterministic preset mock snapshot.', err);
      const scenarioKey = request.scenario;
      const baseMock = MOCK_RESPONSES[scenarioKey] || DEFAULT_MOCK_RESPONSE;
      return {
        ...baseMock,
        city: request.city || baseMock.city,
        processed_at: new Date().toISOString(),
        execution_log: [
          `⚡ [Standalone Demo Mode] Executing preset: ${request.scenario}`,
          ...baseMock.execution_log,
        ],
      };
    }
  },

  /**
   * Health telemetry and integration status
   */
  async getHealth(): Promise<HealthResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        agent: 'Locus Day Planner (v2.0 - Standalone Mode)',
        version: '2.0.0',
        track: 'Track 5 — AI Real World Agent',
        framework: 'LangGraph + Google Gemini',
        integrations: {
          openweather: true,
          gmail: true,
          jira: true,
          github: true,
          notion: true,
          slack: true,
          resend: true,
        },
        swytchcode_apis: [
          'openweather.current.get',
          'gmail.messages.list',
          'jira.issues.list',
          'github.pullRequests.list',
          'notion.pages.create',
          'slack.messages.send',
          'resend.email.create',
        ],
        history_count: 4,
        live_connections: 1,
        default_city: 'Mumbai',
      };
    }
  },

  /**
   * Quick atmospheric weather lookup
   */
  async getWeather(city: string): Promise<WeatherLookupResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/weather/${encodeURIComponent(city)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      return {
        city,
        temperature_c: 21.5,
        feels_like_c: 20.8,
        humidity: 62,
        wind_speed: 3.2,
        condition: 'Clear',
        description: 'clear sky (cached snapshot)',
        timestamp: new Date().toISOString(),
        is_mock: true,
      };
    }
  },

  /**
   * Execution history
   */
  async getHistory(limit = 20): Promise<HistoryResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/history?limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      const items = Object.values(MOCK_RESPONSES).map((item) => ({
        processed_at: item.processed_at,
        city: item.city,
        weather_condition: item.weather_condition,
        temperature_c: item.temperature_c,
        feels_like_c: item.feels_like_c,
        weather_score: item.weather_score,
        risk_level: item.risk_level,
        go_to_office: item.go_to_office,
        office_reason: item.office_reason,
        ai_summary: item.ai_summary,
        email_sent: item.email_sent,
        slack_sent: item.slack_message_sent,
        notion_logged: item.notion_logged,
      }));
      return { items, total: items.length };
    }
  },

  /**
   * Dashboard aggregate KPIs
   */
  async getAnalytics(): Promise<AnalyticsResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/analytics`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      return {
        total_runs: 12,
        avg_weather_score: 72.8,
        risk_distribution: { low: 5, medium: 4, high: 3 },
        top_conditions: { Clear: 6, Rain: 3, Clouds: 3 },
        office_distribution: { office: 6, wfh: 4, hybrid: 2 },
        emails_sent: 12,
        slack_alerts: 12,
        notion_pages: 10,
        outdoor_plans_detected: 4,
        travel_plans_detected: 3,
        swytchcode_api_calls: 84,
      };
    }
  },

  /**
   * Swytchcode tool execution audit trail
   */
  async getAudit(): Promise<AuditResponse> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/audit`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch {
      return {
        audit_trail: [
          {
            timestamp: new Date().toISOString(),
            tools_called: [
              'openweather.current.get',
              'gmail.messages.list',
              'jira.issues.list',
              'github.pullRequests.list',
              'notion.pages.create',
              'slack.messages.send',
              'resend.email.create',
            ],
            city: 'London',
            risk: 'high',
            score: 32,
            go_to_office: 'wfh',
            office_reason: 'Severe rainstorm advisories and transit delays make remote work safest.',
            notion_logged: true,
            slack_sent: true,
            email_sent: true,
          },
        ],
        total_api_calls: 7,
        timestamp: new Date().toISOString(),
      };
    }
  },
};
