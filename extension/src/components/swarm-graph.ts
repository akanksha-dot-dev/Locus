/**
 * Locus LangGraph Multi-Agent Swarm Visualizer Component
 * Native DOM rendering for the 8-node LangGraph autonomous agent topology.
 */

export interface SwarmNodeDef {
  id: string;
  name: string;
  icon: string;
  role: string;
}

export type SwarmNodeStatus = 'idle' | 'running' | 'completed' | 'error';

export interface SwarmNodeState {
  status: SwarmNodeStatus;
  durationMs?: number;
  detail?: string;
}

export const SWARM_NODES: SwarmNodeDef[] = [
  { id: 'weather', name: 'Weather', icon: '⛅', role: 'Atmospheric & commute feed' },
  { id: 'gmail', name: 'Gmail/Cal', icon: '📅', role: 'Agenda & calendar ingest' },
  { id: 'jira', name: 'Jira Sprint', icon: '📋', role: 'High-priority sprint items' },
  { id: 'github', name: 'GitHub PRs', icon: '🐙', role: 'Code review bottlenecks' },
  { id: 'ai_advisor', name: 'Gemini AI', icon: '🧠', role: 'Disposition & day synthesis' },
  { id: 'notion', name: 'Notion Sync', icon: '📝', role: 'Living day plan page' },
  { id: 'slack', name: 'Slack Dispatch', icon: '💬', role: 'Team channel notifications' },
  { id: 'resend', name: 'Executive Brief', icon: '✉️', role: 'Morning digest delivery' },
];

export class SwarmVisualizer {
  private container: HTMLElement;
  private states: Map<string, SwarmNodeState> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.resetAll('idle');
  }

  public resetAll(status: SwarmNodeStatus = 'idle'): void {
    for (const node of SWARM_NODES) {
      this.states.set(node.id, { status });
    }
    this.render();
  }

  public setAllCompleted(): void {
    for (const node of SWARM_NODES) {
      this.states.set(node.id, { status: 'completed' });
    }
    this.render();
  }

  public updateNode(nodeId: string, status: SwarmNodeStatus, detail?: string, durationMs?: number): void {
    this.states.set(nodeId, { status, detail, durationMs });
    this.render();
  }

  public getNodeState(nodeId: string): SwarmNodeState | undefined {
    return this.states.get(nodeId);
  }

  public getAllStates(): Map<string, SwarmNodeState> {
    return this.states;
  }

  public render(): void {
    if (typeof document === 'undefined' || !this.container) return;
    this.container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'swarm-grid';

    for (const node of SWARM_NODES) {
      const state = this.states.get(node.id) || { status: 'idle' };
      const nodeEl = document.createElement('div');
      nodeEl.className = `swarm-node ${state.status}`;
      nodeEl.dataset.nodeId = node.id;

      let statusText = 'Ready';
      if (state.status === 'running') statusText = 'Running...';
      if (state.status === 'completed') statusText = state.durationMs ? `${state.durationMs}ms ✓` : 'Synced ✓';
      if (state.status === 'error') statusText = 'Failed ✕';

      nodeEl.innerHTML = `
        <div class="swarm-node-icon">${node.icon}</div>
        <div class="swarm-node-info">
          <div class="swarm-node-name">${node.name}</div>
          <div class="swarm-node-status">${statusText}</div>
        </div>
      `;
      grid.appendChild(nodeEl);
    }

    this.container.appendChild(grid);
  }
}
