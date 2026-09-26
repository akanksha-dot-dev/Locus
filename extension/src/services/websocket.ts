/**
 * Locus Chrome Extension Companion — WebSocket Client Service
 * Manifest V3 Service Worker / UI WebSocket client with exponential backoff & jitter.
 * Target Endpoint: ws://localhost:8000/ws
 */

import { ConnectionStatus, RiskLevel } from '../types/index';

export type WebSocketStatus = ConnectionStatus;

export const WS_STATUS = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting',
  DISCONNECTED: 'disconnected',
} as const;

export type WsStepName =
  | 'weather'
  | 'gmail'
  | 'jira'
  | 'github'
  | 'ai_advisor'
  | 'notion'
  | 'slack'
  | 'resend';

export interface WsConnectedPayload {
  type: 'connected';
  message: string;
  recent_runs: number;
  [key: string]: unknown;
}

export interface WsStepCompletePayload {
  type: 'step_complete';
  step: WsStepName | string;
  data: {
    city?: string;
    condition?: string;
    temp?: number;
    feels_like?: number;
    events?: number;
    outdoor?: boolean;
    travel?: boolean;
    tickets?: number;
    hours?: number;
    prs?: number;
    issues?: number;
    score?: number;
    risk?: RiskLevel;
    go_to_office?: string;
    office_reason?: string;
    should_alert?: boolean;
    logged?: boolean;
    url?: string;
    sent?: boolean;
    msg_id?: string;
    [key: string]: unknown;
  };
}

export interface WsAgentCompletePayload {
  type: 'agent_complete';
  city?: string;
  risk?: RiskLevel;
  score?: number;
  go_to_office?: string;
  office_reason?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface WsPipelineErrorPayload {
  type: 'pipeline_error';
  error: string;
  timestamp?: string;
}

export type WsServerMessage =
  | WsConnectedPayload
  | WsStepCompletePayload
  | WsAgentCompletePayload
  | WsPipelineErrorPayload
  | { type: string; [key: string]: unknown };

export interface WebSocketConfig {
  url: string;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitterRatio: number;
  maxRetries: number;
  heartbeatIntervalMs: number;
  debug: boolean;
}

export const DEFAULT_WS_CONFIG: WebSocketConfig = {
  url: 'ws://localhost:8000/ws',
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2.0,
  jitterRatio: 0.2, // +/- 20% randomized jitter
  maxRetries: Infinity,
  heartbeatIntervalMs: 25000, // 25s keepalive ping
  debug: false,
};

export type StatusListener = (status: WebSocketStatus, prevStatus: WebSocketStatus) => void;
export type MessageListener = (message: WsServerMessage) => void;
export type AgentCompleteListener = (payload: WsAgentCompletePayload) => void;
export type StepCompleteListener = (payload: WsStepCompletePayload) => void;
export type ErrorListener = (error: Event | Error) => void;

/**
 * Calculates exponential backoff delay with randomized jitter.
 * Result is strictly clamped within [initialDelayMs, maxDelayMs].
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 30000,
  backoffFactor: number = 2.0,
  jitterRatio: number = 0.2
): number {
  const exponential = initialDelayMs * Math.pow(backoffFactor, attempt);
  const capped = Math.min(maxDelayMs, exponential);
  const jitterMultiplier = 1 + (Math.random() * 2 - 1) * jitterRatio;
  const jittered = Math.round(capped * jitterMultiplier);
  return Math.max(initialDelayMs, Math.min(maxDelayMs, jittered));
}

export class LocusWebSocketClient {
  private config: WebSocketConfig;
  private socket: WebSocket | null = null;
  private status: WebSocketStatus = 'disconnected';
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: number = 0;
  private isExplicitDisconnect: boolean = false;

  private statusListeners = new Set<StatusListener>();
  private messageListeners = new Set<MessageListener>();
  private agentCompleteListeners = new Set<AgentCompleteListener>();
  private stepCompleteListeners = new Set<StepCompleteListener>();
  private errorListeners = new Set<ErrorListener>();

  constructor(options: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_WS_CONFIG, ...options };
  }

  public connect(): void {
    if (this.status === 'connected' || this.status === 'connecting') {
      return;
    }

    this.isExplicitDisconnect = false;
    this.clearReconnectTimer();
    this.setStatus('connecting');

    try {
      this.socket = new WebSocket(this.config.url);
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (err) {
      this.handleClose(new CloseEvent('close', { code: 1006, reason: String(err) }));
    }
  }

  public disconnect(): void {
    this.isExplicitDisconnect = true;
    this.clearReconnectTimer();
    this.clearHeartbeat();

    if (this.socket) {
      try {
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close(1000, 'Client closed connection');
        }
      } catch {
        // Suppress
      } finally {
        this.socket = null;
      }
    }

    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  public send(data: string | object): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      this.socket.send(payload);
      return true;
    } catch {
      return false;
    }
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.setStatus('connected');
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const rawText = String(event.data);
      if (rawText === 'pong' || rawText === 'ping') return;

      const parsed: WsServerMessage = JSON.parse(rawText);

      for (const listener of this.messageListeners) {
        try { listener(parsed); } catch (err) { console.error(err); }
      }

      if (parsed.type === 'agent_complete') {
        for (const listener of this.agentCompleteListeners) {
          try { listener(parsed as WsAgentCompletePayload); } catch (err) { console.error(err); }
        }
      } else if (parsed.type === 'step_complete') {
        for (const listener of this.stepCompleteListeners) {
          try { listener(parsed as WsStepCompletePayload); } catch (err) { console.error(err); }
        }
      }
    } catch {
      // Non-JSON frames ignored
    }
  }

  private handleClose(event: CloseEvent): void {
    this.clearHeartbeat();
    this.socket = null;

    if (this.isExplicitDisconnect) {
      this.setStatus('disconnected');
      return;
    }

    if (this.reconnectAttempts >= this.config.maxRetries) {
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.scheduleReconnect();
  }

  private handleError(event: Event): void {
    for (const listener of this.errorListeners) {
      try { listener(event); } catch (err) { console.error(err); }
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    const delay = calculateBackoff(
      this.reconnectAttempts,
      this.config.initialDelayMs,
      this.config.maxDelayMs,
      this.config.backoffFactor,
      this.config.jitterRatio
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitDisconnect) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    if (this.config.heartbeatIntervalMs <= 0) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatIntervalMs);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setStatus(newStatus: WebSocketStatus): void {
    if (this.status === newStatus) return;
    const prevStatus = this.status;
    this.status = newStatus;

    for (const listener of this.statusListeners) {
      try { listener(newStatus, prevStatus); } catch (err) { console.error(err); }
    }
  }

  public getStatus(): WebSocketStatus { return this.status; }
  public getAttempts(): number { return this.reconnectAttempts; }
  public isConnected(): boolean { return this.status === 'connected'; }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  public onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  public onAgentComplete(listener: AgentCompleteListener): () => void {
    this.agentCompleteListeners.add(listener);
    return () => this.agentCompleteListeners.delete(listener);
  }

  public onStepComplete(listener: StepCompleteListener): () => void {
    this.stepCompleteListeners.add(listener);
    return () => this.stepCompleteListeners.delete(listener);
  }

  public onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }
}

export const wsClient = new LocusWebSocketClient();
