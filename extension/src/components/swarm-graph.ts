/**
 * Locus LangGraph Multi-Agent Swarm Visualizer Component
 * Native DOM rendering for the 8-node LangGraph autonomous agent topology
 * with an interactive Node Inspector drawer and real-time telemetry.
 */

export interface SwarmNodeDef {
  id: string;
  name: string;
  icon: string;
  role: string;
  capability: string;
}

export type SwarmNodeStatus = 'idle' | 'running' | 'completed' | 'error';

export interface SwarmNodeState {
  status: SwarmNodeStatus;
  durationMs?: number;
  detail?: string;
}

export const SWARM_NODES: SwarmNodeDef[] = [
  {
    id: 'weather',
    name: 'Weather',
    icon: '⛅',
    role: 'Atmospheric & commute feed',
    capability: 'Fetches real-time precipitation, temp, and wind from OpenWeatherMap; scores commute risk (0-100).',
  },
  {
    id: 'gmail',
    name: 'Gmail/Cal',
    icon: '📅',
    role: 'Agenda & calendar ingest',
    capability: 'Scans upcoming Google Calendar commitments and inbox snippets to identify flight/travel or outdoor clashes.',
  },
  {
    id: 'jira',
    name: 'Jira Sprint',
    icon: '📋',
    role: 'High-priority sprint items',
    capability: 'Queries active Jira sprints for assigned tickets, priority levels, story points, and estimated focus hours.',
  },
  {
    id: 'github',
    name: 'GitHub PRs',
    icon: '🐙',
    role: 'Code review bottlenecks',
    capability: 'Inspects open PRs and issues across repositories; flags stale reviews (>3 days) and review workloads.',
  },
  {
    id: 'ai_advisor',
    name: 'Gemini AI',
    icon: '🧠',
    role: 'Disposition & day synthesis',
    capability: 'Executes Gemini 2.5 Flash reasoning to determine Office vs WFH verdict, attire, and optimal 24h block schedule.',
  },
  {
    id: 'notion',
    name: 'Notion Sync',
    icon: '📝',
    role: 'Living day plan page',
    capability: 'Automatically provisions and formats an executive daily debrief page in Notion with all schedule blocks.',
  },
  {
    id: 'slack',
    name: 'Slack Dispatch',
    icon: '💬',
    role: 'Team channel notifications',
    capability: 'Broadcasts daily standup verdict and core focus objectives to the designated team Slack channel.',
  },
  {
    id: 'resend',
    name: 'Executive Brief',
    icon: '✉️',
    role: 'Morning digest delivery',
    capability: 'Compiles and delivers an executive HTML morning briefing digest via Resend API to the user inbox.',
  },
];

export class SwarmVisualizer {
  private container: HTMLElement;
  private states: Map<string, SwarmNodeState> = new Map();
  private selectedNodeId: string | null = null;
  public onNodeClick?: (nodeId: string) => void;

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

  public selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    this.render();
  }

  public render(): void {
    if (typeof document === 'undefined' || !this.container) return;
    this.container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'swarm-grid';

    for (const node of SWARM_NODES) {
      const state = this.states.get(node.id) || { status: 'idle' };
      const isSelected = this.selectedNodeId === node.id;
      const nodeEl = document.createElement('div');
      nodeEl.className = `swarm-node ${state.status} ${isSelected ? 'selected' : ''}`;
      nodeEl.dataset.nodeId = node.id;
      nodeEl.style.cursor = 'pointer';

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

      nodeEl.addEventListener('click', () => {
        this.selectedNodeId = this.selectedNodeId === node.id ? null : node.id;
        this.render();
        if (this.onNodeClick) this.onNodeClick(node.id);
      });

      grid.appendChild(nodeEl);
    }

    this.container.appendChild(grid);

    // If a node is selected, render the Node Inspector drawer
    if (this.selectedNodeId) {
      const selected = SWARM_NODES.find((n) => n.id === this.selectedNodeId);
      const state = this.states.get(this.selectedNodeId);
      if (selected) {
        const inspector = document.createElement('div');
        inspector.className = 'node-inspector-drawer';
        inspector.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 16px;">${selected.icon}</span>
              <strong style="font-size: 12px; color: var(--text-primary);">${selected.name} Agent</strong>
            </div>
            <span class="badge ${state?.status === 'completed' ? 'badge-office' : state?.status === 'running' ? 'badge-hybrid' : 'badge-wfh'}">${(state?.status || 'idle').toUpperCase()}</span>
          </div>
          <p style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">${selected.capability}</p>
          <div style="display: flex; gap: 8px; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 4px;">
            <span>Role: ${selected.role}</span>
            ${state?.durationMs ? `<span>Latency: ${state.durationMs}ms</span>` : ''}
          </div>
        `;
        this.container.appendChild(inspector);
      }
    }
  }
}
