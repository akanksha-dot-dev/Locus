import React, { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { AgentProvider, useAgent } from './context/AgentContext';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { DecisionCard } from './components/hero/DecisionCard';
import { PresetShowcase } from './components/hero/PresetShowcase';
import { PromptBar } from './components/hero/PromptBar';
import { ProductiveHoursMeter } from './components/hero/ProductiveHoursMeter';
import { SwarmTopology } from './components/topology/SwarmTopology';
import { ScheduleTimeline } from './components/timeline/ScheduleTimeline';
import { WorkloadMatrix } from './components/workload/WorkloadMatrix';
import { ArtifactExportBar } from './components/artifacts/ArtifactExportBar';
import { IntegrationGrid } from './components/artifacts/IntegrationGrid';
import { TelemetryDrawer } from './components/telemetry/TelemetryDrawer';
import {
  Sparkles,
  Clock,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  Layers,
  CalendarDays,
  Briefcase,
  Download,
  Server,
  TrendingUp,
  Activity,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

// Framer Motion spring transition variants
const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 30,
    },
  },
};

function CommandCenterDashboard() {
  const {
    activeAgentResponse,
    isRunning,
    wsStatus,
    isOfflineMode,
    isMuted,
    setIsMuted,
    resetSchedule,
    runCustomQuery,
    runScenario,
  } = useAgent();

  const [systemTime, setSystemTime] = useState<string>('');
  const [showTempCurve, setShowTempCurve] = useState<boolean>(true);

  // Live Jitter-Free UTC Digital Clock with tabular-nums
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setSystemTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalWorkloadHours =
    (activeAgentResponse.jira_estimated_hours || 0) +
    (activeAgentResponse.github_estimated_hours || 0);

  return (
    <div className="min-h-screen bg-surface-base text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      {/* ── 1. Top Incident Command Navigation Bar ────────────────── */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface-card/90 backdrop-blur-md px-4 sm:px-6 py-3 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Operational Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-bold glow-indigo shadow-lg shadow-indigo-500/10">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white font-mono">
                  SWYTCHAGENT 2.0
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-semibold">
                  Track 5 AI Agent
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">
                Incident Command Center & Autonomous Day Planner
              </p>
            </div>
          </div>

          {/* Real-time Status Indicators */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Live UTC Monospace Clock with tabular-nums */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-elevated border border-hairline text-xs font-mono text-gray-300 tabular-nums select-none shadow-inner"
              title="Current Synchronized System Time (UTC)"
            >
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>{systemTime || '00:00:00 UTC'}</span>
            </div>

            {/* Live WebSocket Connection Status: 🟢 Connected / 🟡 Reconnecting / 🔴 Offline */}
            <div className="flex items-center select-none">
              {wsStatus === 'connected' ? (
                <Badge
                  variant="emerald"
                  size="sm"
                  dot
                  pulse
                  className="font-mono text-[11px] py-1 px-2.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                >
                  <span className="text-emerald-400 mr-1.5">🟢</span> CONNECTED
                </Badge>
              ) : wsStatus === 'reconnecting' ? (
                <Badge
                  variant="amber"
                  size="sm"
                  dot
                  pulse
                  className="font-mono text-[11px] py-1 px-2.5 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
                >
                  <span className="text-amber-400 mr-1.5">🟡</span> RECONNECTING
                </Badge>
              ) : (
                <Badge
                  variant="crimson"
                  size="sm"
                  dot
                  className="font-mono text-[11px] py-1 px-2.5 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                >
                  <span className="text-rose-400 mr-1.5">🔴</span> OFFLINE / STANDALONE
                </Badge>
              )}
            </div>

            {/* Sound Mute Switch with AudioContext State */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute cyber synthesizer cues' : 'Mute cyber synthesizer cues'}
              className="p-2 rounded-lg bg-surface-elevated border border-hairline hover:bg-surface-active text-gray-300 hover:text-white transition-all cursor-pointer select-none"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-gray-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            {/* Reset to AI Plan Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-gray-400" />}
              onClick={resetSchedule}
              title="Reset schedule and workspace to raw Gemini AI synthesis"
              className="hidden lg:inline-flex text-xs font-mono"
            >
              Reset Plan
            </Button>
          </div>
        </div>
      </header>

      {/* ── 2. Main Incident Command Center Surface ───────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Offline Resilient Simulation Notice Banner */}
        {isOfflineMode && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                Backend server currently offline at{' '}
                <code className="font-mono bg-black/40 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/20">
                  http://localhost:8000
                </code>
                . Running in standalone simulation mode with verified synthetic snapshot cache.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded text-amber-300 border border-amber-500/30 whitespace-nowrap">
                Zero-Downtime Fallback Active
              </span>
            </div>
          </div>
        )}

        {/* ── SECTION 1: HERO COMMAND CENTER & DECISION ENGINE ─────── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          aria-label="Hero Command Center and Autonomous Decision Engine"
          className="space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Autonomous Decision Verdict Card */}
            <div className="lg:col-span-7 flex flex-col space-y-4">
              <DecisionCard
                decision={activeAgentResponse.go_to_office}
                riskLevel={activeAgentResponse.risk_level}
                officeReason={activeAgentResponse.office_reason}
                aiSummary={activeAgentResponse.ai_summary}
                city={activeAgentResponse.city}
                temperature={activeAgentResponse.temperature_c}
                feelsLike={activeAgentResponse.feels_like_c}
                weatherScore={activeAgentResponse.weather_score}
                weatherCondition={activeAgentResponse.weather_condition}
                windSpeed={activeAgentResponse.wind_speed}
                humidity={activeAgentResponse.humidity}
                productiveHours={activeAgentResponse.estimated_productive_hours}
                workloadHours={totalWorkloadHours}
                showTemperatureCurve={showTempCurve}
                className="flex-1"
              />

              {/* Curve Toggle Ribbon */}
              <div className="flex items-center justify-between px-2 text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  24-Hour Diurnal Forecast Plotted
                </span>
                <button
                  type="button"
                  onClick={() => setShowTempCurve(!showTempCurve)}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  {showTempCurve ? 'Hide Curve' : 'Show 24h Curve'}
                </button>
              </div>
            </div>

            {/* Right 5 Columns: Natural Language Prompt + Presets + Focus Capacity */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* Natural Language Prompt Bar */}
              <PromptBar
                onSubmit={(query, city) => runCustomQuery(query, city)}
                isLoading={isRunning}
                defaultCity={activeAgentResponse.city}
              />

              {/* Focus Capacity Gauge */}
              <ProductiveHoursMeter
                productiveHours={activeAgentResponse.estimated_productive_hours}
                totalDayHours={8.0}
              />

              {/* 4 Preset Benchmark Scenarios Showcase */}
              <div className="rounded-2xl bg-surface-card border border-hairline p-4 shadow-lg flex-1 flex flex-col justify-between">
                <PresetShowcase
                  onSelectScenario={(scenarioKey, city) => runScenario(scenarioKey, city)}
                  isRunning={isRunning}
                  activeCity={activeAgentResponse.city}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── SECTION 2: 8-NODE SWARM TOPOLOGY VISUALIZER ───────────── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          aria-label="8-Node LangGraph Swarm Topology Visualizer"
        >
          <SwarmTopology />
        </motion.section>

        {/* ── SECTION 3: 24-HOUR VISUAL SCHEDULE TIMELINE ──────────── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          aria-label="24-Hour Visual Schedule Timeline"
        >
          <ScheduleTimeline />
        </motion.section>

        {/* ── SECTION 4: DUAL WORKLOAD COMMAND MATRIX ──────────────── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          aria-label="Dual Workload Command Matrix: Jira Sprint and GitHub Reviews"
        >
          <WorkloadMatrix />
        </motion.section>

        {/* ── SECTION 5: ARTIFACT GENERATOR & INTEGRATION GRID ──────── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          aria-label="Artifact Exports and 7-Channel Integration Matrix"
          className="space-y-6"
        >
          {/* 1-Click Multi-Channel Artifact Export Bar */}
          <ArtifactExportBar />

          {/* 7-Channel Delivery Health Grid */}
          <IntegrationGrid />
        </motion.section>
      </main>

      {/* ── 3. Streaming Cyberpunk Telemetry Terminal Drawer ──────── */}
      <TelemetryDrawer />

      {/* ── 4. Operational Footer ─────────────────────────────────── */}
      <footer className="border-t border-hairline bg-surface-card/60 py-6 px-4 sm:px-6 mt-12 text-xs text-gray-400 select-none pb-16 sm:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-300 font-mono">SwytchAgent Day Planner v2.0.0</span>
            <span className="text-gray-600">•</span>
            <span>Incident Command Center</span>
            <span className="text-gray-600">•</span>
            <span className="text-emerald-400/90 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High-Assurance AI Swarm
            </span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 font-mono text-[11px]">
            <span>Zero-CLS Hydration</span>
            <span>WebSocket + REST Dual-Transport</span>
            <span>100% Client-Side Exports</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AgentProvider>
      <CommandCenterDashboard />
    </AgentProvider>
  );
}
