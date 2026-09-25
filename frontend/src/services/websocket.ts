import { ConnectionStatus, WSEvent, WSStepEvent, WSAgentCompleteEvent } from '../types';
import { MOCK_RESPONSES } from '../constants/mockData';

const WS_URL =
  (import.meta.env?.VITE_WS_URL as string) ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${
    window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host
  }/ws`;

export type WebSocketEventHandler = (event: WSEvent) => void;
export type WebSocketStatusHandler = (status: ConnectionStatus) => void;

export class AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private retryCount = 0;
  private maxRetries = 10;
  private reconnectTimer: number | null = null;
  private pingIntervalTimer: number | null = null;
  private stepStartTime = Date.now();
  private pipelineStartTime = Date.now();

  private eventListeners: Set<WebSocketEventHandler> = new Set();
  private statusListeners: Set<WebSocketStatusHandler> = new Set();

  constructor(private url: string = WS_URL) {}

  /**
   * Register event listener
   */
  public onEvent(handler: WebSocketEventHandler): () => void {
    this.eventListeners.add(handler);
    return () => this.eventListeners.delete(handler);
  }

  /**
   * Register status change listener
   */
  public onStatusChange(handler: WebSocketStatusHandler): () => void {
    this.statusListeners.add(handler);
    handler(this.status);
    return () => this.statusListeners.delete(handler);
  }

  /**
   * Update internal connection state and notify listeners
   */
  private setStatus(newStatus: ConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((handler) => handler(newStatus));
    }
  }

  /**
   * Connect to WebSocket server
   */
  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus(this.retryCount > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.info('[WebSocket] Connected to', this.url);
        this.retryCount = 0;
        this.setStatus('connected');
        this.startHeartbeat();
      };

      this.ws.onmessage = (msg: MessageEvent) => {
        try {
          const data = JSON.parse(msg.data);
          const now = Date.now();

          // Compute granular step latency for swarm topology & terminal
          if (data.type === 'step_complete') {
            data.latencyMs = now - this.stepStartTime;
            this.stepStartTime = now;
          } else if (data.type === 'agent_complete') {
            data.totalLatencyMs = now - this.pipelineStartTime;
          }

          this.broadcastEvent(data);
        } catch (err) {
          console.error('[WebSocket] Message parse error:', err, msg.data);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[WebSocket] Transport error:', err);
        // Error triggers close handler automatically
      };
    } catch (err) {
      console.warn('[WebSocket] Init failed:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Reset step latency tracking stopwatch
   */
  public markPipelineStart() {
    this.pipelineStartTime = Date.now();
    this.stepStartTime = Date.now();
  }

  /**
   * Schedule reconnection with exponential backoff and randomized jitter
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.retryCount >= this.maxRetries) {
      console.warn('[WebSocket] Max reconnect attempts reached. Waiting in offline mode.');
      this.setStatus('disconnected');
      return;
    }

    const baseDelay = Math.min(1000 * Math.pow(1.5, this.retryCount), 10000);
    const jitter = Math.random() * 500;
    const delay = baseDelay + jitter;

    this.retryCount++;
    this.setStatus('reconnecting');

    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Periodic keep-alive ping
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingIntervalTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('ping');
      }
    }, 25000);
  }

  private stopHeartbeat() {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }

  /**
   * Dispatch parsed event to all registered listeners
   */
  private broadcastEvent(event: WSEvent) {
    this.eventListeners.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[WebSocket] Handler error:', err);
      }
    });
  }

  /**
   * Send arbitrary message over WebSocket
   */
  public send(payload: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
  }

  /**
   * Disconnect and cleanup
   */
  public disconnect() {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  /**
   * Offline simulation runner: Emulates 8-node LangGraph telemetry
   * when backend WebSocket is unreachable.
   */
  public simulateOfflineRun(
    scenarioKey: string,
    onStep: (event: WSStepEvent) => void,
    onComplete: (event: WSAgentCompleteEvent) => void
  ): () => void {
    let cancelled = false;
    const mock = MOCK_RESPONSES[scenarioKey] || MOCK_RESPONSES.storm_warning;

    const steps: Array<{ step: string; data: Record<string, any>; delay: number }> = [
      {
        step: 'weather',
        data: {
          city: mock.city,
          condition: mock.weather_condition,
          temp: mock.temperature_c,
          feels_like: mock.feels_like_c,
        },
        delay: 350,
      },
      {
        step: 'gmail',
        data: {
          events: mock.gmail_events.length,
          outdoor: mock.has_outdoor_plans,
          travel: mock.has_travel_plans,
        },
        delay: 400,
      },
      {
        step: 'jira',
        data: {
          tickets: mock.jira_tickets.length,
          hours: mock.jira_estimated_hours,
        },
        delay: 450,
      },
      {
        step: 'github',
        data: {
          prs: mock.github_prs.length,
          issues: mock.github_issues.length,
          hours: mock.github_estimated_hours,
        },
        delay: 420,
      },
      {
        step: 'ai_advisor',
        data: {
          score: mock.weather_score,
          risk: mock.risk_level,
          go_to_office: mock.go_to_office,
          office_reason: mock.office_reason,
          should_alert: mock.risk_level === 'high' || mock.risk_level === 'critical',
        },
        delay: 550,
      },
      {
        step: 'notion',
        data: {
          logged: mock.notion_logged,
          url: mock.notion_page_url,
        },
        delay: 380,
      },
      {
        step: 'slack',
        data: {
          sent: mock.slack_message_sent,
        },
        delay: 360,
      },
      {
        step: 'resend',
        data: {
          sent: mock.email_sent,
          msg_id: mock.resend_message_id,
        },
        delay: 350,
      },
    ];

    let currentStepIndex = 0;

    const executeNextStep = () => {
      if (cancelled) return;

      if (currentStepIndex < steps.length) {
        const item = steps[currentStepIndex];
        const stepEvent: WSStepEvent = {
          type: 'step_complete',
          step: item.step,
          data: item.data,
          latencyMs: item.delay,
          timestamp: new Date().toISOString(),
        };

        this.broadcastEvent(stepEvent);
        onStep(stepEvent);
        currentStepIndex++;

        setTimeout(executeNextStep, item.delay);
      } else {
        const completeEvent: WSAgentCompleteEvent = {
          type: 'agent_complete',
          city: mock.city,
          risk: mock.risk_level,
          score: mock.weather_score,
          go_to_office: mock.go_to_office,
          office_reason: mock.office_reason,
          timestamp: new Date().toISOString(),
        };

        this.broadcastEvent(completeEvent);
        onComplete(completeEvent);
      }
    };

    setTimeout(executeNextStep, 200);

    return () => {
      cancelled = true;
    };
  }
}

// Singleton WebSocket client instance
export const wsClient = new AgentWebSocketClient();
