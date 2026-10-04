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
import { AudioDebriefingBar } from './components/briefing/AudioDebriefingBar';
import { ChaosStudioModal } from './components/simulator/ChaosStudioModal';
import { KeyboardShortcutsModal } from './components/common/KeyboardShortcutsModal';
import { DailyInsightBanner } from './components/hero/DailyInsightBanner';
import {
  Trophy,
  Volume2,
  VolumeX,
  RotateCcw,
  AlertTriangle,
  Layers,
  Zap,
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
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Compass,
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
    scheduleBlocks,
    completedCount,
    totalBlocksCount,
    progressPercentage,
  } = useAgent();

  const { resolvedTheme, toggleTheme } = useTheme();

  // Navigation & Modal State
  const [activeTab, setActiveTab] = useState<NavigationTab>('overview');
  const [showTrack5Modal, setShowTrack5Modal] = useState<boolean>(false);
  const [showChaosModal, setShowChaosModal] = useState<boolean>(false);
  const [showKeyboardModal, setShowKeyboardModal] = useState<boolean>(false);
  const [showTempCurve, setShowTempCurve] = useState<boolean>(true);

  // Collapsible Section State (users can minimize/maximize individual cards in 'all' view)
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

  // Global keyboard shortcut handler
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Skip if focus is in an input/textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setShowKeyboardModal((v) => !v);
          break;
        case '1':
          e.preventDefault();
          setActiveTab('overview');
          break;
        case '2':
          e.preventDefault();
          setActiveTab('pipeline');
          break;
        case '3':
          e.preventDefault();
          setActiveTab('schedule');
          break;
        case '4':
          e.preventDefault();
          setActiveTab('workload');
          break;
        case '5':
          e.preventDefault();
          setActiveTab('artifacts');
          break;
        case '6':
          e.preventDefault();
          setActiveTab('all');
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          resetSchedule();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          setIsMuted(!isMuted);
          break;
        case 't':
        case 'T':
          e.preventDefault();
          toggleTheme();
          break;
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isMuted, setIsMuted, resetSchedule, toggleTheme]);

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

  const nextPendingSlot = scheduleBlocks.find((b) => !b.completed);

  return (
    <div className="min-h-screen bg-surface-base text-content-primary flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-200 antialiased transition-colors duration-200">
      {/* ── 1. Top Incident Command Navigation Bar ────────────────── */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface-card/90 backdrop-blur-md px-3 sm:px-6 py-2.5 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-4">
          {/* Left: Brand Identity & Track 5 Showcase Trigger */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div
              className={`w-9 h-9 rounded-xl overflow-hidden border flex items-center justify-center shadow-sm bg-surface-card flex-shrink-0 transition-all duration-300 ${
                isRunning
                  ? 'border-cyan-500/60 logo-running-ring glow-cyan'
                  : 'border-cyan-500/30 glow-cyan'
              }`}
            >
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

                {/* Live Chaos Simulator Launcher */}
                <button
                  type="button"
                  onClick={() => setShowChaosModal(true)}
                  className="inline-flex items-center gap-1 text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500/10 to-amber-500/10 hover:from-rose-500/20 hover:to-amber-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-semibold cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-xs"
                  title="Open Live Chaos & Fault Simulation Studio"
                >
                  <Zap className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                  <span>Chaos Studio</span>
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

            {/* Keyboard shortcut hint */}
            <button
              type="button"
              onClick={() => setShowKeyboardModal(true)}
              title="Show keyboard shortcuts (?)"
              className="ml-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-surface-elevated border border-hairline transition-all cursor-pointer select-none"
            >
              <span>?</span>
              <span className="hidden sm:inline">Shortcuts</span>
            </button>
          </nav>
        </div>

        {/* ── Task Completion Progress Ribbon ─────────────────────── */}
        {totalBlocksCount > 0 && (
          <div className="relative h-0.5 bg-surface-elevated overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full progress-ribbon-fill bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
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

        {/* ── VIEW 1: COMMAND CENTER (HERO COCKPIT + EXECUTIVE OVERVIEW) ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Executive Cockpit Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div>
                <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-500" />
                  Executive Command Center & Incident Cockpit
                </h1>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Autonomous decision verdicts, natural language constraint engine, and live operational pulse.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                  Autonomous Agent Active
                </Badge>
              </div>
            </div>

            {/* Daily Insight Summary Banner */}
            <DailyInsightBanner />

            {/* Hero Section */}
            <motion.section
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              aria-label="Hero Command Center and Autonomous Decision Engine"
              className="space-y-6"
            >
              {/* AI Voice & Audio Briefing HUD */}
              <AudioDebriefingBar />

              {/* 1. Full-Width Spotlight Command Center */}
              <PromptBar
                onSubmit={(query, city) => runCustomQuery(query, city)}
                isLoading={isRunning}
                defaultCity={activeAgentResponse.city}
              />

              {/* 2. Side-by-Side Decision Verdict + Workload Capacity & Benchmark Presets */}
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

                {/* Right 5 Columns: Focus Capacity + Presets Showcase */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
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
            </motion.section>

            {/* Executive Cockpit Overview: Quick Jump Cards */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-gray-400 font-semibold flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Operational Intelligence Quick Jump
                </span>
                <span className="text-[11px] font-mono text-slate-400 dark:text-gray-500">
                  Select a card to navigate to dedicated view
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Swarm Pipeline Quick Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pipeline')}
                  className="p-4 rounded-2xl bg-surface-card border border-hairline hover:border-indigo-500/50 hover:bg-surface-elevated transition-all text-left group cursor-pointer shadow-md card-highlight-glow relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      <Workflow className="w-4 h-4" />
                    </div>
                    <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                      8 Nodes
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                    Swarm Pipeline
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                    4-phase neural DAG: Sensory Ingestion, Workload Engine, Reasoning Core & Dispatch.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                    <span>Inspect Pipeline</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 2. Day Schedule Quick Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('schedule')}
                  className="p-4 rounded-2xl bg-surface-card border border-hairline hover:border-emerald-500/50 hover:bg-surface-elevated transition-all text-left group cursor-pointer shadow-md card-highlight-glow relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <CalendarDays className="w-4 h-4" />
                    </div>
                    <Badge variant="emerald" size="sm" className="font-mono text-[10px]">
                      {completedCount}/{totalBlocksCount} Done
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                    Day Schedule
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {nextPendingSlot
                      ? `Next: ${nextPendingSlot.activity} (${nextPendingSlot.time})`
                      : 'All planned blocks completed.'}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Open 24h Timeline</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 3. Workload Radar Quick Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('workload')}
                  className="p-4 rounded-2xl bg-surface-card border border-hairline hover:border-amber-500/50 hover:bg-surface-elevated transition-all text-left group cursor-pointer shadow-md card-highlight-glow relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <Badge variant="amber" size="sm" className="font-mono text-[10px]">
                      ~{totalWorkloadHours.toFixed(1)}h Dev
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white group-hover:text-amber-500 transition-colors">
                    Workload Radar
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {activeAgentResponse.jira_tickets?.length || 0} Jira sprint tickets • {activeAgentResponse.github_prs?.length || 0} GitHub PRs to review.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-amber-600 dark:text-amber-400 font-medium">
                    <span>Manage Workload</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* 4. Artifacts & Dispatch Quick Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('artifacts')}
                  className="p-4 rounded-2xl bg-surface-card border border-hairline hover:border-purple-500/50 hover:bg-surface-elevated transition-all text-left group cursor-pointer shadow-md card-highlight-glow relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
                      <FileText className="w-4 h-4" />
                    </div>
                    <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                      7 Channels
                    </Badge>
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                    Artifacts & Dispatch
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">
                    RFC 5545 iCal, Markdown briefing, Notion sync, Slack alerts & Resend digest.
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-mono text-purple-600 dark:text-purple-400 font-medium">
                    <span>View Dispatch Matrix</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ── VIEW 2: SWARM PIPELINE (DEDICATED FULL VIEW) ─────────── */}
        {activeTab === 'pipeline' && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Workflow className="w-4 h-4 text-indigo-500" />
                  4-Phase Neural LangGraph Swarm Pipeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Real-time execution DAG with sub-second step latency telemetry and live node inspector.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                ← Back to Command Center
              </button>
            </div>
            <SwarmTopology />
          </motion.div>
        )}

        {/* ── VIEW 3: DAY SCHEDULE (DEDICATED FULL VIEW) ────────────── */}
        {activeTab === 'schedule' && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-500" />
                  24-Hour Visual Schedule Timeline
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Context-aware daily agenda synthesized by Gemini 2.5 Flash from weather and sprint constraints.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                ← Back to Command Center
              </button>
            </div>
            <ScheduleTimeline />
          </motion.div>
        )}

        {/* ── VIEW 4: WORKLOAD RADAR (DEDICATED FULL VIEW) ──────────── */}
        {activeTab === 'workload' && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-500" />
                  Dual Workload Command Matrix
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Real-time engineering load balancing: Jira Sprint Backlog vs GitHub Pull Request Queue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                ← Back to Command Center
              </button>
            </div>
            <WorkloadMatrix />
          </motion.div>
        )}

        {/* ── VIEW 5: ARTIFACTS & DISPATCH (DEDICATED FULL VIEW) ────── */}
        {activeTab === 'artifacts' && (
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  Artifact Exports & Multi-Channel Dispatch
                </h2>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Download RFC 5545 iCalendar files, executive markdown briefings, and monitor 7-channel integration delivery health.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                ← Back to Command Center
              </button>
            </div>
            <ArtifactExportBar />
            <IntegrationGrid />
          </motion.div>
        )}

        {/* ── VIEW 6: ALL SECTIONS (CONTINUOUS STREAM WITH COLLAPSE TOGGLES) ── */}
        {activeTab === 'all' && (
          <div className="space-y-8">
            {/* View 6 Continuous Mode Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 border-b border-hairline pb-3">
              <div>
                <h1 className="text-base sm:text-lg font-bold font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" />
                  Continuous Unified Dashboard (All Subsystems)
                </h1>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Complete end-to-end view of all 5 operational subsystems with independent minimize/maximize controls.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allCollapsed = Object.values(collapsedSections).every(Boolean);
                    setCollapsedSections({
                      hero: !allCollapsed,
                      pipeline: !allCollapsed,
                      schedule: !allCollapsed,
                      workload: !allCollapsed,
                      artifacts: !allCollapsed,
                    });
                  }}
                  className="text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  {Object.values(collapsedSections).every(Boolean) ? 'Expand All Subsystems' : 'Minimize All Subsystems'}
                </button>
              </div>
            </div>

            {/* Section 1: Hero */}
            <motion.section
              variants={sectionVariants}
              initial="hidden"
              animate="visible"
              aria-label="Hero Command Center and Autonomous Decision Engine"
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <h2 className="text-xs font-mono uppercase tracking-wider font-semibold text-slate-500 dark:text-gray-400">
                    Autonomous Decision Engine & Input Surface
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('hero')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapsedSections.hero ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>

              {!collapsedSections.hero && (
                <div className="space-y-6">
                  {/* AI Voice & Audio Briefing HUD */}
                  <AudioDebriefingBar />

                  {/* 1. Full-Width Spotlight Command Center */}
                  <PromptBar
                    onSubmit={(query, city) => runCustomQuery(query, city)}
                    isLoading={isRunning}
                    defaultCity={activeAgentResponse.city}
                  />

                  {/* 2. Side-by-Side Decision Verdict + Workload Capacity & Benchmark Presets */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
                    </div>
                    <div className="lg:col-span-5 flex flex-col space-y-4">
                      <ProductiveHoursMeter
                        productiveHours={activeAgentResponse.estimated_productive_hours}
                        totalDayHours={8.0}
                      />
                      <div className="rounded-2xl bg-surface-card border border-hairline p-4 sm:p-5 shadow-lg flex-1 flex flex-col justify-between card-highlight-glow">
                        <PresetShowcase
                          onSelectScenario={(scenarioKey, city) => runScenario(scenarioKey, city)}
                          isRunning={isRunning}
                          activeCity={activeAgentResponse.city}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.section>

            {/* Section 2: Swarm Pipeline */}
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
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('pipeline')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapsedSections.pipeline ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
              {!collapsedSections.pipeline && <SwarmTopology />}
            </motion.section>

            {/* Section 3: Schedule Timeline */}
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
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('schedule')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapsedSections.schedule ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
              {!collapsedSections.schedule && <ScheduleTimeline />}
            </motion.section>

            {/* Section 4: Workload Matrix */}
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
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('workload')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapsedSections.workload ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
              {!collapsedSections.workload && <WorkloadMatrix />}
            </motion.section>

            {/* Section 5: Artifacts & Integration Grid */}
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
                <button
                  type="button"
                  onClick={() => toggleSectionCollapse('artifacts')}
                  className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {collapsedSections.artifacts ? (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Expand</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>
              {!collapsedSections.artifacts && (
                <div className="space-y-6">
                  <ArtifactExportBar />
                  <IntegrationGrid />
                </div>
              )}
            </motion.section>
          </div>
        )}
      </main>

      {/* ── 3. Streaming Telemetry Inspector Slide-Over Drawer ────── */}
      <TelemetryDrawer />

      {/* ── 4. Hackathon Track 5 Showcase Modal ───────────────────── */}
      <Track5Modal
        isOpen={showTrack5Modal}
        onClose={() => setShowTrack5Modal(false)}
      />

      {/* ── 5. Live Chaos & Fault Simulation Studio Modal ─────────── */}
      <ChaosStudioModal
        isOpen={showChaosModal}
        onClose={() => setShowChaosModal(false)}
      />

      {/* ── 6. Keyboard Shortcuts Reference Modal ──────────────────── */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardModal}
        onClose={() => setShowKeyboardModal(false)}
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
            <button
              type="button"
              onClick={() => setShowKeyboardModal(true)}
              className="flex items-center gap-1 text-indigo-500 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              title="Open keyboard shortcuts"
            >
              <kbd className="kbd">?</kbd>
              <span className="ml-1">shortcuts</span>
            </button>
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
