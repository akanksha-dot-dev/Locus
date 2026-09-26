import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { AgentProvider, useAgent } from './context/AgentContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { TimezoneClock } from './components/common/TimezoneClock';
import { Track5Modal } from './components/common/Track5Modal';
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
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  Layers,
  CalendarDays,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Sun,
  Moon,
  Workflow,
  Radio,
  FileText,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Eye,
  Sliders,
  Sparkles,
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

type NavigationTab = 'overview' | 'pipeline' | 'schedule' | 'workload' | 'artifacts' | 'all';

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

  const { resolvedTheme, toggleTheme } = useTheme();

  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [showTrack5Modal, setShowTrack5Modal] = useState<boolean>(false);
  const [showTempCurve, setShowTempCurve] = useState<boolean>(true);

  // Collapsible Section State (users can minimize/maximize individual cards)
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    hero: false,
    pipeline: false,
    schedule: false,
    workload: false,
    artifacts: false,
  });

  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const totalWorkloadHours =
    (activeAgentResponse.jira_estimated_hours || 0) +
    (activeAgentResponse.github_estimated_hours || 0);

  // Tab Definitions
  const navTabs: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'overview', label: 'Command Center', icon: <Radio className="w-3.5 h-3.5" /> },
    { id: 'pipeline', label: 'Swarm Pipeline', icon: <Workflow className="w-3.5 h-3.5" />, badge: '4 Phases' },
    { id: 'schedule', label: 'Day Schedule', icon: <CalendarDays className="w-3.5 h-3.5" />, badge: '24h' },
    { id: 'workload', label: 'Workload Radar', icon: <Briefcase className="w-3.5 h-3.5" />, badge: `${totalWorkloadHours.toFixed(1)}h` },
    { id: 'artifacts', label: 'Artifacts & Dispatch', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'all', label: 'All Sections', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-surface-base text-content-primary flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-200 antialiased transition-colors duration-200">
      {/* ── 1. Top Incident Command Navigation Bar ────────────────── */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface-card/90 backdrop-blur-md px-3 sm:px-6 py-2.5 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Brand Identity & Track 5 Showcase Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-cyan-500/30 flex items-center justify-center glow-cyan shadow-sm bg-surface-card flex-shrink-0">
              <img src="/locus_logo.png" alt="Locus Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                  LOCUS
                </span>
                {/* Decluttered Track 5 Showcase Modal Launcher */}
                <button
                  type="button"
                  onClick={() => setShowTrack5Modal(true)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 hover:from-cyan-500/20 hover:to-indigo-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                  title="Open Hackathon Track 5 & Architecture Briefing"
                >
                  <Trophy className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Track 5 Showcase</span>
                </button>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-gray-400 hidden md:block">
                Autonomous Incident Command Center & Day Planner
              </p>
            </div>
          </div>

          {/* Right: Operational Controls & Status Capsule */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Synchronized Smart Timezone Clock with IST Default, Local, and UTC selector (tabular-nums) */}
            <TimezoneClock className="hidden sm:block tabular-nums" />

            {/* Live WebSocket Connection Status: 🟢 Connected / 🟡 Reconnecting / 🔴 Offline */}
            <div className="flex items-center select-none">
              {wsStatus === 'connected' ? (
                <Badge
                  variant="emerald"
                  size="sm"
                  dot
                  pulse
                  className="font-mono text-[10px] sm:text-[11px] py-1 px-2 sm:px-2.5 shadow-xs"
                >
                  <span className="text-emerald-500 dark:text-emerald-400 mr-1 sm:mr-1.5">🟢</span>
                  <span className="hidden xs:inline">CONNECTED</span>
                </Badge>
              ) : wsStatus === 'reconnecting' ? (
                <Badge
                  variant="amber"
                  size="sm"
                  dot
                  pulse
                  className="font-mono text-[10px] sm:text-[11px] py-1 px-2 sm:px-2.5 shadow-xs"
                >
                  <span className="text-amber-500 dark:text-amber-400 mr-1 sm:mr-1.5">🟡</span>
                  <span className="hidden xs:inline">RECONNECTING</span>
                </Badge>
              ) : (
                <Badge
                  variant="crimson"
                  size="sm"
                  dot
                  className="font-mono text-[10px] sm:text-[11px] py-1 px-2 sm:px-2.5 shadow-xs"
                >
                  <span className="text-rose-500 dark:text-rose-400 mr-1 sm:mr-1.5">🔴</span>
                  <span className="hidden xs:inline">OFFLINE</span>
                </Badge>
              )}
            </div>

            {/* Sound Mute Switch with AudioContext State */}
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute cyber synthesizer cues' : 'Mute cyber synthesizer cues'}
              className="p-1.5 sm:p-2 rounded-lg bg-surface-elevated border border-hairline hover:bg-surface-active text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer select-none shadow-xs"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400 dark:text-gray-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              )}
            </button>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label={`Toggle theme: current is ${resolvedTheme}`}
              className="p-1.5 sm:p-2 rounded-lg bg-surface-elevated border border-hairline hover:bg-surface-active text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-amber-400 transition-all cursor-pointer select-none shadow-xs"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Reset to AI Plan Button */}
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />}
              onClick={resetSchedule}
              title="Reset schedule and workspace to raw Gemini AI synthesis"
              className="hidden lg:inline-flex text-xs font-mono"
            >
              Reset Plan
            </Button>
          </div>
        </div>

        {/* ── Segmented Navigation View Switcher (Apple / Linear style) ── */}
        <div className="max-w-7xl mx-auto mt-2 pt-2 border-t border-hairline/60 overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-1 sm:gap-1.5 min-w-max" aria-label="Command Center Views">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer select-none relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/25'
                      : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-surface-elevated'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-indigo-500 dark:text-indigo-400'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-active text-slate-500 dark:text-gray-400 border border-hairline'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── 2. Main Incident Command Center Surface ───────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
        {/* Offline Resilient Simulation Notice Banner */}
        {isOfflineMode && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200 shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span>
                Backend server currently offline at{' '}
                <code className="font-mono bg-black/10 dark:bg-black/40 px-1.5 py-0.5 rounded text-amber-800 dark:text-amber-300 border border-amber-500/20">
                  http://localhost:8000
                </code>
                . Running in standalone simulation mode with verified synthetic snapshot cache.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded text-amber-800 dark:text-amber-300 border border-amber-500/30 whitespace-nowrap">
                Zero-Downtime Fallback Active
              </span>
            </div>
          </div>
        )}

        {/* ── SECTION 1: HERO COMMAND CENTER & DECISION ENGINE ─────── */}
        <div className={activeTab === 'overview' || activeTab === 'all' ? 'block' : 'hidden'}>
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            aria-label="Hero Command Center and Autonomous Decision Engine"
            className="space-y-4"
          >
            {/* Section Header Controls */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                  Autonomous Decision Engine & Input Surface
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('hero')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Minimize / Maximize Hero Surface"
                >
                  {collapsedSections.hero ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand Surface</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.hero && (
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
                  <div className="flex items-center justify-between px-2 text-xs font-mono text-slate-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      24-Hour Diurnal Forecast Plotted
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTempCurve(!showTempCurve)}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                    >
                      {showTempCurve ? 'Hide Curve' : 'Show 24h Curve'}
                    </button>
                  </div>
                </div>

                {/* Right 5 Columns: Natural Language Spotlight Prompt + Focus Capacity + Presets */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  {/* Spotlight Natural Language Prompt Bar with City Autocomplete */}
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
                  <div className="rounded-2xl bg-surface-card border border-hairline p-4 sm:p-5 shadow-lg flex-1 flex flex-col justify-between card-highlight-glow">
                    <PresetShowcase
                      onSelectScenario={(scenarioKey, city) => runScenario(scenarioKey, city)}
                      isRunning={isRunning}
                      activeCity={activeAgentResponse.city}
                    />
                  </div>
                </div>
              </div>
            )}
          </motion.section>
        </div>

        {/* ── SECTION 2: 4-PHASE LANGGRAPH SWARM PIPELINE ───────────── */}
        <div className={activeTab === 'pipeline' || activeTab === 'all' || activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            aria-label="4-Phase LangGraph Swarm Pipeline Visualizer"
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                  Swarm Execution Pipeline & Node Telemetry
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('pipeline')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Minimize / Maximize Swarm Pipeline"
                >
                  {collapsedSections.pipeline ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand Pipeline</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.pipeline && <SwarmTopology />}
          </motion.section>
        </div>

        {/* ── SECTION 3: 24-HOUR VISUAL SCHEDULE TIMELINE ──────────── */}
        <div className={activeTab === 'schedule' || activeTab === 'all' || activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            aria-label="24-Hour Visual Schedule Timeline"
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                  Adaptive Day Timeline & Slot Allocation
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('schedule')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Minimize / Maximize Schedule Timeline"
                >
                  {collapsedSections.schedule ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand Timeline</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.schedule && <ScheduleTimeline />}
          </motion.section>
        </div>

        {/* ── SECTION 4: DUAL WORKLOAD COMMAND MATRIX ──────────────── */}
        <div className={activeTab === 'workload' || activeTab === 'all' || activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            aria-label="Dual Workload Command Matrix: Jira Sprint and GitHub Reviews"
            className="space-y-3"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                  Engineering Workload Matrix (Jira & GitHub)
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('workload')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Minimize / Maximize Workload Matrix"
                >
                  {collapsedSections.workload ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand Matrix</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.workload && <WorkloadMatrix />}
          </motion.section>
        </div>

        {/* ── SECTION 5: ARTIFACT GENERATOR & INTEGRATION GRID ──────── */}
        <div className={activeTab === 'artifacts' || activeTab === 'all' || activeTab === 'overview' ? 'block' : 'hidden'}>
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            aria-label="Artifact Exports and 7-Channel Integration Matrix"
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                  Multi-Channel Dispatch & Export Ledger
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('artifacts')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Minimize / Maximize Artifact Exports"
                >
                  {collapsedSections.artifacts ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand Dispatch</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.artifacts && (
              <div className="space-y-6">
                {/* 1-Click Multi-Channel Artifact Export Bar */}
                <ArtifactExportBar />

                {/* 7-Channel Delivery Health Grid */}
                <IntegrationGrid />
              </div>
            )}
          </motion.section>
        </div>
      </main>

      {/* ── 3. Streaming Telemetry Inspector Slide-Over Drawer ────── */}
      <TelemetryDrawer />

      {/* ── 4. Hackathon Track 5 Showcase Modal ───────────────────── */}
      <Track5Modal
        isOpen={showTrack5Modal}
        onClose={() => setShowTrack5Modal(false)}
      />

      {/* ── 5. Operational Footer ─────────────────────────────────── */}
      <footer className="border-t border-hairline bg-surface-card/60 py-6 px-4 sm:px-6 mt-12 text-xs text-slate-500 dark:text-gray-400 select-none pb-16 sm:pb-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-700 dark:text-gray-300 font-mono">Locus Day Planner v2.0.0</span>
            <span className="text-slate-300 dark:text-gray-600">•</span>
            <span>Incident Command Center</span>
            <span className="text-slate-300 dark:text-gray-600">•</span>
            <span className="text-emerald-600 dark:text-emerald-400/90 font-mono flex items-center gap-1 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> High-Assurance AI Swarm
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400 dark:text-gray-500 font-mono text-[11px] flex-wrap">
            <span>Zero-CLS Hydration</span>
            <span>WebSocket + REST Dual-Transport</span>
            <span>Light & Dark Themed</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AgentProvider>
        <CommandCenterDashboard />
      </AgentProvider>
    </ThemeProvider>
  );
}
