import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  AgentResponse,
  ConnectionStatus,
  NodeStatus,
  ScheduleBlock,
  ScheduleCategory,
  TerminalLog,
  TopologyNode,
  WSEvent,
  WSStepEvent,
  WSAgentCompleteEvent,
  WSErrorEvent,
} from '../types';
import { DEFAULT_MOCK_RESPONSE, INITIAL_TOPOLOGY_NODES, MOCK_RESPONSES } from '../constants/mockData';
import { apiService } from '../services/api';
import { wsClient } from '../services/websocket';

const STORAGE_KEY_SNAPSHOT = 'locus_latest_snapshot';
const STORAGE_KEY_MUTED = 'locus_audio_muted';

export interface AgentContextType {
  activeAgentResponse: AgentResponse;
  isRunning: boolean;
  activeNodeIndex: number;
  completedNodes: string[];
  nodes: TopologyNode[];
  wsStatus: ConnectionStatus;
  terminalLogs: TerminalLog[];
  isTerminalOpen: boolean;
  selectedNode: TopologyNode | null;
  isOfflineMode: boolean;
  isMuted: boolean;
  scheduleBlocks: ScheduleBlock[];
  completedCount: number;
  totalBlocksCount: number;
  progressPercentage: number;

  // Actions
  runCustomQuery: (query: string, city?: string, email?: string) => Promise<void>;
  runScenario: (scenarioKey: string, city?: string) => Promise<void>;
  toggleTaskCompletion: (blockId: string) => void;
  updateScheduleBlock: (blockId: string, updates: Partial<ScheduleBlock>) => void;
  reorderScheduleBlocks: (sourceIndex: number, destIndex: number) => void;
  addScheduleBlock: (newBlock: Omit<ScheduleBlock, 'id'>) => void;
  resetSchedule: () => void;
  clearLogs: () => void;
  setIsTerminalOpen: (open: boolean) => void;
  setSelectedNode: (node: TopologyNode | null) => void;
  setIsMuted: (muted: boolean) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

/**
 * Normalizes day_plan_timeline items (which may be strings or objects) into ScheduleBlock
 */
function normalizeTimeline(items: (string | ScheduleBlock)[]): ScheduleBlock[] {
  if (!items || !Array.isArray(items)) return [];

  return items.map((item, idx) => {
    if (typeof item === 'object' && item !== null && 'id' in item) {
      return item as ScheduleBlock;
    }

    const rawStr = typeof item === 'string' ? item : JSON.stringify(item);
    // Parse format: "09:00–12:00: [Jira] Fix bug" or "09:00 - 12:00: Activity"
    const match = rawStr.match(/^([\d]{1,2}:[\d]{2}(?:\s*[-–—]\s*[\d]{1,2}:[\d]{2})?)\s*[:|-]\s*(.+)$/);
    const time = match ? match[1].trim() : `Slot ${idx + 1}`;
    const activity = match ? match[2].trim() : rawStr;

    // Detect category heuristic
    const lower = activity.toLowerCase();
    let category: ScheduleCategory = 'general';
    if (lower.includes('jira') || lower.includes('github') || lower.includes('code') || lower.includes('fix') || lower.includes('dev')) {
      category = 'deep_work';
    } else if (lower.includes('standup') || lower.includes('sync') || lower.includes('meeting') || lower.includes('demo')) {
      category = 'meeting';
    } else if (lower.includes('commute') || lower.includes('transit') || lower.includes('airport') || lower.includes('flight') || lower.includes('walk')) {
      category = 'commute';
    } else if (lower.includes('lunch') || lower.includes('break') || lower.includes('chai') || lower.includes('picnic')) {
      category = 'break';
    }

    return {
      id: `block-${idx}`,
      time,
      activity,
      category,
      completed: false,
    };
  });
}

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Initial State Hydration with LocalStorage Fallback
  const [activeAgentResponse, setActiveAgentResponse] = useState<AgentResponse>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY_SNAPSHOT);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.city && parsed.go_to_office) {
          if (parsed.city === 'London' || parsed.city === 'Mumbai') {
            return DEFAULT_MOCK_RESPONSE;
          }
          return parsed;
        }
      }
    } catch {
      // Fallback to initial mock snapshot
    }
    return DEFAULT_MOCK_RESPONSE;
  });

  const [originalSnapshot, setOriginalSnapshot] = useState<AgentResponse>(() => DEFAULT_MOCK_RESPONSE);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeNodeIndex, setActiveNodeIndex] = useState<number>(-1);
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [nodes, setNodes] = useState<TopologyNode[]>(() => INITIAL_TOPOLOGY_NODES);
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('connecting');
  const [terminalLogs, setTerminalLogs] = useState<TerminalLog[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isMuted, setIsMutedState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEY_MUTED) === 'true';
  });

  // Schedule Blocks derived from activeAgentResponse
  const scheduleBlocks = useMemo(() => {
    return normalizeTimeline(activeAgentResponse.day_plan_timeline);
  }, [activeAgentResponse.day_plan_timeline]);

  const completedCount = useMemo(() => scheduleBlocks.filter((b) => b.completed).length, [scheduleBlocks]);
  const totalBlocksCount = scheduleBlocks.length;
  const progressPercentage = totalBlocksCount > 0 ? Math.round((completedCount / totalBlocksCount) * 100) : 0;

  // Add Terminal Log Helper
  const addLog = useCallback(
    (type: TerminalLog['type'], source: string, message: string, latencyMs?: number, payload?: any) => {
      const newLog: TerminalLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type,
        source,
        message,
        latencyMs,
        payload,
      };
      setTerminalLogs((prev) => [...prev.slice(-300), newLog]);
    },
    []
  );

  // Mute control
  const setIsMuted = useCallback((muted: boolean) => {
    setIsMutedState(muted);
    localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
  }, []);

  // Update specific node in topology graph
  const updateNodeStatus = useCallback((nodeId: string, status: NodeStatus, latencyMs?: number, payload?: any) => {
    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            status,
            latencyMs: latencyMs ?? n.latencyMs,
            payload: payload ?? n.payload,
          };
        }
        return n;
      })
    );
  }, []);

  // Reset all topology nodes to idle
  const resetTopologyNodes = useCallback(() => {
    setNodes(INITIAL_TOPOLOGY_NODES.map((n) => ({ ...n, status: 'idle', latencyMs: undefined, payload: undefined })));
    setCompletedNodes([]);
    setActiveNodeIndex(-1);
  }, []);

  // Connect WebSocket on Mount
  useEffect(() => {
    const unsubStatus = wsClient.onStatusChange((status) => {
      setWsStatus(status);
      setIsOfflineMode(status === 'disconnected');
      addLog(
        status === 'connected' ? 'success' : status === 'reconnecting' ? 'ws' : 'info',
        'WebSocket',
        `Connection state changed to: ${status.toUpperCase()}`
      );
    });

    const unsubEvent = wsClient.onEvent((event: WSEvent) => {
      handleIncomingWsEvent(event);
    });

    wsClient.connect();

    // Initial Health Check
    apiService.getHealth().then((health) => {
      addLog('info', 'System', `Locus v${health.version} initialized. Health status: ${health.status}`);
    });

    return () => {
      unsubStatus();
      unsubEvent();
      wsClient.disconnect();
    };
  }, []);

  // Sync latest snapshot to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SNAPSHOT, JSON.stringify(activeAgentResponse));
    } catch {
      // Ignore quota exceeded errors
    }
  }, [activeAgentResponse]);

  // Handle incoming WebSocket events
  const handleIncomingWsEvent = useCallback(
    (event: WSEvent) => {
      switch (event.type) {
        case 'connected':
          addLog('ws', 'WebSocket', event.message);
          break;

        case 'step_complete': {
          const stepEv = event as WSStepEvent;
          const nodeIdx = INITIAL_TOPOLOGY_NODES.findIndex((n) => n.id === stepEv.step);
          if (nodeIdx !== -1) {
            setActiveNodeIndex(nodeIdx + 1 < INITIAL_TOPOLOGY_NODES.length ? nodeIdx + 1 : -1);
            setCompletedNodes((prev) => Array.from(new Set([...prev, stepEv.step])));
            updateNodeStatus(stepEv.step, 'completed', stepEv.latencyMs, stepEv.data);
          }
          addLog(
            'tool',
            `LangGraph [${stepEv.step}]`,
            `Step completed in ${stepEv.latencyMs || 0}ms`,
            stepEv.latencyMs,
            stepEv.data
          );
          break;
        }

        case 'agent_complete': {
          const completeEv = event as WSAgentCompleteEvent;
          setIsRunning(false);
          setActiveNodeIndex(-1);
          addLog(
            'verdict',
            'Decision Engine',
            `Verdict: ${completeEv.go_to_office.toUpperCase()} | Score: ${completeEv.score}/100 | Risk: ${completeEv.risk}`
          );
          break;
        }

        case 'pipeline_error': {
          const errorEv = event as WSErrorEvent;
          setIsRunning(false);
          setActiveNodeIndex(-1);
          addLog('error', 'Pipeline Error', errorEv.error);
          break;
        }
      }
    },
    [addLog, updateNodeStatus]
  );

  // Trigger scenario
  const runScenario = useCallback(
    async (scenarioKey: string, city?: string) => {
      setIsRunning(true);
      resetTopologyNodes();
      wsClient.markPipelineStart();
      addLog('info', 'Command', `Triggered preset scenario: "${scenarioKey}" for city: ${city || 'default'}`);

      // Set first node to running
      setActiveNodeIndex(0);
      updateNodeStatus('weather', 'running');

      try {
        let cancelSimulation: (() => void) | null = null;

        // If WS is disconnected, run simulated stream
        if (wsClient.getStatus() !== 'connected') {
          cancelSimulation = wsClient.simulateOfflineRun(
            scenarioKey,
            (step) => handleIncomingWsEvent(step),
            (complete) => handleIncomingWsEvent(complete)
          );
        }

        const result = await apiService.triggerDemo({ scenario: scenarioKey, city });
        setActiveAgentResponse(result);
        setOriginalSnapshot(result);
        setIsRunning(false);
        setActiveNodeIndex(-1);

        // Mark all remaining nodes as completed
        setNodes((prev) => prev.map((n) => ({ ...n, status: 'completed' })));
        setCompletedNodes(INITIAL_TOPOLOGY_NODES.map((n) => n.id));
      } catch (err: any) {
        setIsRunning(false);
        setActiveNodeIndex(-1);
        addLog('error', 'API Failure', err.message || 'Execution error');
      }
    },
    [addLog, handleIncomingWsEvent, resetTopologyNodes, updateNodeStatus]
  );

  // Trigger custom natural language query
  const runCustomQuery = useCallback(
    async (query: string, city?: string, email?: string) => {
      setIsRunning(true);
      resetTopologyNodes();
      wsClient.markPipelineStart();
      addLog('info', 'Natural Language', `Running prompt: "${query}" (City: ${city || 'auto'})`);

      setActiveNodeIndex(0);
      updateNodeStatus('weather', 'running');

      try {
        let cancelSimulation: (() => void) | null = null;
        if (wsClient.getStatus() !== 'connected') {
          cancelSimulation = wsClient.simulateOfflineRun(
            'day_planner_office',
            (step) => handleIncomingWsEvent(step),
            (complete) => handleIncomingWsEvent(complete)
          );
        }

        const result = await apiService.runPipeline({ user_request: query, city, user_email: email });
        setActiveAgentResponse(result);
        setOriginalSnapshot(result);
        setIsRunning(false);
        setActiveNodeIndex(-1);

        setNodes((prev) => prev.map((n) => ({ ...n, status: 'completed' })));
        setCompletedNodes(INITIAL_TOPOLOGY_NODES.map((n) => n.id));
      } catch (err: any) {
        setIsRunning(false);
        setActiveNodeIndex(-1);
        addLog('error', 'Execution Error', err.message || 'Pipeline execution failed');
      }
    },
    [addLog, handleIncomingWsEvent, resetTopologyNodes, updateNodeStatus]
  );

  // Toggle task completion
  const toggleTaskCompletion = useCallback((blockId: string) => {
    setActiveAgentResponse((prev) => {
      const currentBlocks = normalizeTimeline(prev.day_plan_timeline);
      const updated = currentBlocks.map((b) => (b.id === blockId ? { ...b, completed: !b.completed } : b));
      return { ...prev, day_plan_timeline: updated };
    });
  }, []);

  // Update schedule block details
  const updateScheduleBlock = useCallback((blockId: string, updates: Partial<ScheduleBlock>) => {
    setActiveAgentResponse((prev) => {
      const currentBlocks = normalizeTimeline(prev.day_plan_timeline);
      const updated = currentBlocks.map((b) => (b.id === blockId ? { ...b, ...updates } : b));
      return { ...prev, day_plan_timeline: updated };
    });
  }, []);

  // Reorder schedule blocks
  const reorderScheduleBlocks = useCallback((sourceIndex: number, destIndex: number) => {
    setActiveAgentResponse((prev) => {
      const currentBlocks = normalizeTimeline(prev.day_plan_timeline);
      if (sourceIndex < 0 || sourceIndex >= currentBlocks.length || destIndex < 0 || destIndex >= currentBlocks.length) {
        return prev;
      }
      const cloned = [...currentBlocks];
      const [moved] = cloned.splice(sourceIndex, 1);
      cloned.splice(destIndex, 0, moved);
      return { ...prev, day_plan_timeline: cloned };
    });
  }, []);

  // Add custom focus block
  const addScheduleBlock = useCallback((newBlock: Omit<ScheduleBlock, 'id'>) => {
    setActiveAgentResponse((prev) => {
      const currentBlocks = normalizeTimeline(prev.day_plan_timeline);
      const block: ScheduleBlock = {
        ...newBlock,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      };
      return { ...prev, day_plan_timeline: [...currentBlocks, block] };
    });
  }, []);

  // Reset schedule back to raw Gemini plan
  const resetSchedule = useCallback(() => {
    if (originalSnapshot) {
      setActiveAgentResponse((prev) => ({
        ...prev,
        day_plan_timeline: originalSnapshot.day_plan_timeline,
      }));
      addLog('info', 'Schedule', 'Restored schedule back to raw Gemini AI synthesis');
    }
  }, [addLog, originalSnapshot]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setTerminalLogs([]);
  }, []);

  const value: AgentContextType = {
    activeAgentResponse,
    isRunning,
    activeNodeIndex,
    completedNodes,
    nodes,
    wsStatus,
    terminalLogs,
    isTerminalOpen,
    selectedNode,
    isOfflineMode,
    isMuted,
    scheduleBlocks,
    completedCount,
    totalBlocksCount,
    progressPercentage,
    runCustomQuery,
    runScenario,
    toggleTaskCompletion,
    updateScheduleBlock,
    reorderScheduleBlocks,
    addScheduleBlock,
    resetSchedule,
    clearLogs,
    setIsTerminalOpen,
    setSelectedNode,
    setIsMuted,
  };

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
};

export const useAgent = (): AgentContextType => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};
