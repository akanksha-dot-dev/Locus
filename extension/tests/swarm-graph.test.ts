import { describe, it, expect } from 'vitest';
import { SWARM_NODES, SwarmVisualizer } from '../src/components/swarm-graph';

describe('LangGraph Multi-Agent Swarm Visualizer', () => {
  it('defines the 8 canonical LangGraph autonomous agent nodes', () => {
    expect(SWARM_NODES).toHaveLength(8);
    const expectedIds = ['weather', 'gmail', 'jira', 'github', 'ai_advisor', 'notion', 'slack', 'resend'];
    for (const id of expectedIds) {
      const match = SWARM_NODES.find((n) => n.id === id);
      expect(match).toBeDefined();
      expect(match?.name).toBeTruthy();
      expect(match?.icon).toBeTruthy();
    }
  });

  it('manages node states and transitions through lifecycle', () => {
    const mockContainer = {} as HTMLElement;
    const visualizer = new SwarmVisualizer(mockContainer);

    expect(visualizer.getNodeState('weather')?.status).toBe('idle');

    visualizer.updateNode('weather', 'running', 'Fetching rain index', 150);
    expect(visualizer.getNodeState('weather')?.status).toBe('running');
    expect(visualizer.getNodeState('weather')?.durationMs).toBe(150);

    visualizer.updateNode('weather', 'completed', 'Sunny 28C', 320);
    expect(visualizer.getNodeState('weather')?.status).toBe('completed');
    expect(visualizer.getNodeState('weather')?.durationMs).toBe(320);

    visualizer.setAllCompleted();
    for (const node of SWARM_NODES) {
      expect(visualizer.getNodeState(node.id)?.status).toBe('completed');
    }

    visualizer.resetAll('idle');
    for (const node of SWARM_NODES) {
      expect(visualizer.getNodeState(node.id)?.status).toBe('idle');
    }
  });
});
