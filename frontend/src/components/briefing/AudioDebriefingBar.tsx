import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import {
  audioService,
  speakChapters,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  jumpToChapter,
  playTone,
  setVolume,
  getVolume,
  VoicePersona,
  VoicePitch,
  BriefingTone,
  BriefingChapter,
  SpeechState,
  subscribeSpeech,
} from '../../services/audio';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Square,
  Sparkles,
  Radio,
  FileText,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Sliders,
  Activity,
  Waveform,
  Disc,
  FastForward,
  SkipForward,
  Zap,
} from 'lucide-react';

export const AudioDebriefingBar: React.FC = () => {
  const { activeAgentResponse, isRunning, isMuted, setIsMuted } = useAgent();
  const [speechState, setSpeechState] = useState<SpeechState>(() => audioService.getSpeechState());
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [briefingTone, setBriefingTone] = useState<BriefingTone>('tactical');
  const [visualizerMode, setVisualizerMode] = useState<'equalizer' | 'oscilloscope' | 'radar'>('equalizer');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitchState] = useState<VoicePitch>('natural');
  const [volumeLevel, setVolumeLevelState] = useState<number>(() => getVolume());
  const [copiedScript, setCopiedScript] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to speech state changes
  useEffect(() => {
    const unsubscribe = subscribeSpeech((state) => {
      setSpeechState(state);
      setPlaybackSpeed(state.rate);
      setVoicePitchState(state.pitch);
      setVolumeLevelState(state.volume);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Compile multi-chapter structured briefing
  const chapters: BriefingChapter[] = useMemo(() => {
    const verdict = (activeAgentResponse.go_to_office || 'wfh').toUpperCase();
    const city = activeAgentResponse.city || 'Command Center';
    const temp = Math.round(activeAgentResponse.temperature_c ?? 25);
    const feels = Math.round(activeAgentResponse.feels_like_c ?? temp);
    const weatherCond = activeAgentResponse.weather_condition || 'Clear';
    const weatherScore = activeAgentResponse.weather_score ?? 85;
    const wind = activeAgentResponse.wind_speed_kmh ?? 12;
    const jiraCount = activeAgentResponse.jira_tickets?.length || 0;
    const jiraHours = (activeAgentResponse.jira_estimated_hours || 0).toFixed(1);
    const githubPrs = activeAgentResponse.github_prs?.length || 0;
    const stalePrs = activeAgentResponse.github_prs?.filter((p: any) => p.is_stale)?.length || 0;
    const productiveHours = (activeAgentResponse.estimated_productive_hours || 7.5).toFixed(1);
    const outfit = activeAgentResponse.outfit_suggestion || 'Comfortable executive attire';
    const officeReason = activeAgentResponse.office_reason || 'Autonomous synthesis calibrated for highest engineering output.';

    if (briefingTone === 'executive') {
      return [
        {
          id: 'verdict',
          title: 'Directive',
          icon: '🎯',
          text: `Executive Directive for ${city}: ${verdict === 'OFFICE' ? 'Report to Office.' : verdict === 'HYBRID' ? 'Hybrid Protocol.' : 'Work From Home.'} ${officeReason}`,
        },
        {
          id: 'atmosphere',
          title: 'Atmosphere',
          icon: '🌦️',
          text: `Atmospheric viability index is ${weatherScore} out of 100 with ${weatherCond} at ${temp} degrees.`,
        },
        {
          id: 'engineering',
          title: 'Engineering',
          icon: '🚀',
          text: `Engineering backlog: ${jiraCount} Jira issues (${jiraHours} hours) and ${githubPrs} pull requests pending.`,
        },
        {
          id: 'dispatch',
          title: 'Dispatch',
          icon: '📡',
          text: `Target focus capacity locked at ${productiveHours} hours. All digests synced to Notion, Slack, and Resend.`,
        },
      ];
    }

    if (briefingTone === 'casual') {
      return [
        {
          id: 'verdict',
          title: 'Morning Pulse',
          icon: '☕',
          text: `Good morning! Checking in for ${city}. Today's call is ${verdict === 'OFFICE' ? 'head into the office' : verdict === 'HYBRID' ? 'a flexible hybrid day' : 'stay cozy and work from home'}. Here's why: ${officeReason}`,
        },
        {
          id: 'atmosphere',
          title: 'Weather Check',
          icon: '🌤️',
          text: `Outside it is ${weatherCond} around ${temp} degrees, feeling like ${feels} degrees with ${wind} kilometer per hour breeze. Commute score sits nicely at ${weatherScore}.`,
        },
        {
          id: 'engineering',
          title: 'Workload Snapshot',
          icon: '💻',
          text: `On the sprint board you have ${jiraCount} Jira items lined up for ${jiraHours} hours, plus ${githubPrs} GitHub PRs to keep an eye on.`,
        },
        {
          id: 'gear',
          title: 'Game Plan',
          icon: '🎒',
          text: `You have got roughly ${productiveHours} hours of deep focus available. Recommended gear for today: ${outfit}.`,
        },
        {
          id: 'dispatch',
          title: 'Ready to Roll',
          icon: '🚀',
          text: `Your Notion day plan, Slack channels, and email digests are all up to date. Have a fantastic day!`,
        },
      ];
    }

    // Default: Tactical Military-Grade Debriefing
    return [
      {
        id: 'verdict',
        title: 'Mission Directive',
        icon: '🎯',
        text: `Locus Command Center morning debrief for ${city}. Primary Directive: ${
          verdict === 'OFFICE'
            ? 'Report to Headquarters. Commute clearance verified.'
            : verdict === 'HYBRID'
            ? 'Execute Adaptive Hybrid Protocol.'
            : 'Execute Remote Focus Directive. Commute bypassed.'
        } Tactical rationale: ${officeReason}`,
      },
      {
        id: 'atmosphere',
        title: 'Atmospheric Diagnostics',
        icon: '🌦️',
        text: `Atmospheric telemetry: ${weatherCond} at ${temp} degrees Celsius, apparent temperature ${feels} degrees. Transit viability rating calibrated at ${weatherScore} out of 100.`,
      },
      {
        id: 'engineering',
        title: 'Workload Radar',
        icon: '🚀',
        text: `Engineering queue: ${jiraCount} active sprint tickets accounting for ${jiraHours} hours. GitHub pipeline holds ${githubPrs} open pull requests${
          stalePrs > 0 ? `, including ${stalePrs} stale items flagged for immediate triage` : ''
        }.`,
      },
      {
        id: 'gear',
        title: 'Capacity & Loadout',
        icon: '⏳',
        text: `Optimal deep work capacity locked at ${productiveHours} hours. Recommended operational loadout: ${outfit}.`,
      },
      {
        id: 'dispatch',
        title: 'Dispatch Confirmation',
        icon: '📡',
        text: `Multi-channel executive dispatches confirmed across Notion database, Slack Block Kit, and Resend HTML digest. Autonomous pipeline complete. Proceed with execution.`,
      },
    ];
  }, [activeAgentResponse, briefingTone]);

  const fullSpokenScript = useMemo(() => {
    return chapters.map((c) => c.text).join(' ');
  }, [chapters]);

  // Visualizer Animation Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const isActive = speechState.isSpeaking && !speechState.isPaused;

      if (visualizerMode === 'equalizer') {
        // Equalizer Bars Mode (32 bins)
        const numBars = 32;
        const barWidth = (width / numBars) * 0.65;
        const gap = (width / numBars) * 0.35;

        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + gap) + 4;
          let barHeight = 4;

          if (isActive) {
            const freq1 = Math.sin(phase * 0.09 + i * 0.4);
            const freq2 = Math.cos(phase * 0.14 - i * 0.28);
            const freq3 = Math.sin(phase * 0.05 + i * 0.15);
            const dynamicFactor = Math.abs(freq1 * 0.5 + freq2 * 0.3 + freq3 * 0.2);
            barHeight = Math.max(4, dynamicFactor * (height * 0.88));
          } else if (isRunning) {
            barHeight = 4 + Math.sin(phase * 0.06 + i * 0.35) * 7;
          }

          const y = height - barHeight;
          const grad = ctx.createLinearGradient(0, y, 0, height);
          if (isActive) {
            grad.addColorStop(0, '#06b6d4'); // Cyan
            grad.addColorStop(0.5, '#6366f1'); // Indigo
            grad.addColorStop(1, '#a855f7'); // Purple
          } else {
            grad.addColorStop(0, '#64748b');
            grad.addColorStop(1, '#334155');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else if (visualizerMode === 'oscilloscope') {
        // Smooth Harmonic Sine Wave
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#06b6d4');
        grad.addColorStop(0.5, '#6366f1');
        grad.addColorStop(1, '#ec4899');
        ctx.strokeStyle = isActive ? grad : '#64748b';

        const centerY = height / 2;
        ctx.moveTo(0, centerY);

        for (let x = 0; x < width; x += 2) {
          const progress = x / width;
          const amp = isActive ? 10 * Math.sin(progress * Math.PI) : isRunning ? 4 : 1;
          const y = centerY + Math.sin(x * 0.08 + phase * 0.12) * amp * Math.cos(x * 0.04 - phase * 0.06);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Pulsing Radar Core
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = height * 0.42;

        for (let r = 1; r <= 3; r++) {
          const currentRadius = isActive
            ? ((phase * 0.8 + r * (maxRadius / 3)) % maxRadius) + 2
            : r * 4;
          const alpha = isActive ? Math.max(0, 1 - currentRadius / maxRadius) : 0.3;

          ctx.beginPath();
          ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
        ctx.fillStyle = isActive ? '#06b6d4' : '#64748b';
        ctx.fill();
      }

      phase += 1;
      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [speechState.isSpeaking, speechState.isPaused, isRunning, visualizerMode]);

  // Audio Actions
  const handlePlayToggle = () => {
    if (speechState.isSpeaking) {
      if (speechState.isPaused) {
        playTone('step');
        resumeSpeech();
      } else {
        playTone('step');
        pauseSpeech();
      }
    } else {
      playTone('start');
      speakChapters(chapters, 0, speechState.persona, playbackSpeed, voicePitch);
    }
  };

  const handleStop = () => {
    playTone('step');
    stopSpeech();
  };

  const handleReplay = () => {
    stopSpeech();
    setTimeout(() => {
      playTone('start');
      speakChapters(chapters, 0, speechState.persona, playbackSpeed, voicePitch);
    }, 150);
  };

  const handleChapterClick = (idx: number) => {
    if (!speechState.isSpeaking) {
      playTone('start');
      speakChapters(chapters, idx, speechState.persona, playbackSpeed, voicePitch);
    } else {
      jumpToChapter(idx);
    }
  };

  const handlePersonaChange = (persona: VoicePersona) => {
    playTone('step');
    audioService.setPersona(persona);
    if (speechState.isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        speakChapters(chapters, speechState.currentChapterIndex, persona, playbackSpeed, voicePitch);
      }, 150);
    }
  };

  const handlePitchChange = (pitch: VoicePitch) => {
    playTone('step');
    audioService.setPitch(pitch);
    setVoicePitchState(pitch);
    if (speechState.isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        speakChapters(chapters, speechState.currentChapterIndex, speechState.persona, playbackSpeed, pitch);
      }, 150);
    }
  };

  const handleSpeedCycle = () => {
    playTone('step');
    const speeds = [0.8, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    audioService.setRate(newSpeed);
    if (speechState.isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        speakChapters(chapters, speechState.currentChapterIndex, speechState.persona, newSpeed, voicePitch);
      }, 150);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolumeLevelState(newVol);
    setVolume(newVol);
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(fullSpokenScript);
      setCopiedScript(true);
      playTone('success');
      setTimeout(() => setCopiedScript(false), 2000);
    } catch {}
  };

  const handleExportScript = () => {
    const filename = `Locus_Morning_Briefing_${(activeAgentResponse.city || 'Command').replace(/\s+/g, '_')}.txt`;
    const blob = new Blob([
      `⚡ LOCUS AUTONOMOUS MORNING AUDIO BRIEFING\n` +
      `City: ${activeAgentResponse.city || 'Command Center'}\n` +
      `Date: ${new Date().toLocaleDateString()}\n` +
      `Persona: ${speechState.persona.toUpperCase()} | Tone: ${briefingTone.toUpperCase()}\n` +
      `--------------------------------------------------\n\n` +
      chapters.map((c, i) => `[Chapter ${i + 1}: ${c.title}]\n${c.text}\n`).join('\n') +
      `\n--------------------------------------------------\nSynthesized by Locus Multi-Source LangGraph Swarm Engine.`
    ], { type: 'text/plain;charset=utf-8' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    playTone('success');
  };

  return (
    <Card surface="card" className="p-4 sm:p-5 shadow-xl border border-cyan-500/25 relative overflow-hidden card-highlight-glow mb-4">
      {/* Dynamic Cyber Glow Aura */}
      <div className="absolute top-0 right-0 w-96 h-40 bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-40 bg-indigo-500/10 blur-3xl pointer-events-none" />

      {/* Main Top Header Bar */}
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Indicator & Briefing Info */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`p-2.5 sm:p-3 rounded-2xl border transition-all duration-300 flex-shrink-0 shadow-inner ${
              speechState.isSpeaking && !speechState.isPaused
                ? 'bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border-cyan-500/50 text-cyan-500 glow-cyan animate-pulse'
                : 'bg-surface-elevated border-hairline text-slate-500 dark:text-gray-400'
            }`}
          >
            <Radio className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <span>AI Morning Audio Briefing</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              </span>
              <Badge
                variant={speechState.isSpeaking ? (speechState.isPaused ? 'amber' : 'cyan') : 'outline'}
                size="sm"
                dot
                pulse={speechState.isSpeaking && !speechState.isPaused}
                className="font-mono text-[10px]"
              >
                {speechState.isSpeaking
                  ? speechState.isPaused
                    ? 'PAUSED'
                    : `TRANSMITTING CH ${speechState.currentChapterIndex + 1}/${chapters.length}`
                  : 'READY'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5 font-sans">
              Autonomous voice synthesis dispatched from LangGraph state & Gemini 2.5 reasoning
            </p>
          </div>
        </div>

        {/* Center: Audio Spectrum Visualizer with View Switcher */}
        <div className="flex items-center gap-2 self-start lg:self-center px-3 py-1.5 rounded-xl bg-surface-base border border-hairline/80 shadow-xs">
          <div className="flex items-center gap-1 mr-2 border-r border-hairline pr-2 text-slate-400">
            <button
              type="button"
              onClick={() => setVisualizerMode('equalizer')}
              title="Spectrum Equalizer Bars"
              className={`p-1 rounded cursor-pointer transition-colors ${
                visualizerMode === 'equalizer' ? 'text-cyan-500 bg-cyan-500/10' : 'hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setVisualizerMode('oscilloscope')}
              title="Oscilloscope Harmonic Wave"
              className={`p-1 rounded cursor-pointer transition-colors ${
                visualizerMode === 'oscilloscope' ? 'text-indigo-500 bg-indigo-500/10' : 'hover:text-slate-200'
              }`}
            >
              <Waveform className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setVisualizerMode('radar')}
              title="Neural Pulse Radar"
              className={`p-1 rounded cursor-pointer transition-colors ${
                visualizerMode === 'radar' ? 'text-purple-500 bg-purple-500/10' : 'hover:text-slate-200'
              }`}
            >
              <Disc className="w-3.5 h-3.5" />
            </button>
          </div>

          <canvas
            ref={canvasRef}
            width={180}
            height={30}
            className="w-[180px] h-[30px] select-none"
            title="Live Audio Spectrum Visualizer"
          />
        </div>

        {/* Right Section: Core Playback Controls */}
        <div className="flex flex-wrap items-center gap-2 font-mono self-start lg:self-center">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={handleSpeedCycle}
            title="Cycle Voice Playback Speed"
            className="px-2.5 py-1.5 rounded-xl border border-hairline bg-surface-base hover:bg-surface-elevated text-slate-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer shadow-xs"
          >
            {playbackSpeed}x
          </button>

          {/* Master Play / Pause Button */}
          <Button
            variant={speechState.isSpeaking && !speechState.isPaused ? 'danger' : 'primary'}
            size="sm"
            onClick={handlePlayToggle}
            icon={
              speechState.isSpeaking && !speechState.isPaused ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )
            }
            className="text-xs font-semibold shadow-md px-3.5 py-2"
          >
            {speechState.isSpeaking && !speechState.isPaused ? 'Pause' : 'Brief Me'}
          </Button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            title="Replay Full Morning Briefing"
            className="p-2 rounded-xl border border-hairline bg-surface-base hover:bg-surface-elevated text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Stop */}
          {speechState.isSpeaking && (
            <button
              type="button"
              onClick={handleStop}
              title="Stop Speech Transmission"
              className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer shadow-xs"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Settings Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            title="Voice & Audio Synthesis Settings"
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              showSettings
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'border-hairline bg-surface-base hover:bg-surface-elevated text-slate-600 dark:text-gray-400'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {/* Transcript Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              showTranscript
                ? 'bg-cyan-600 text-white border-cyan-600'
                : 'border-hairline bg-surface-base hover:bg-surface-elevated text-slate-600 dark:text-gray-400'
            }`}
            title="Toggle Spoken Briefing Transcript"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Interactive Chapter Progress Strip ─────────────────────── */}
      <div className="mt-4 pt-3 border-t border-hairline/70">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-gray-400 font-semibold flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-500" />
            <span>Briefing Chapters</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
            Click any chapter to listen directly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {chapters.map((ch, idx) => {
            const isCurrent = speechState.isSpeaking && speechState.currentChapterIndex === idx;
            const isDone = speechState.isSpeaking && speechState.currentChapterIndex > idx;

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => handleChapterClick(idx)}
                className={`relative overflow-hidden text-left p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  isCurrent
                    ? 'bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                    : isDone
                    ? 'bg-surface-base/80 border-hairline/80 opacity-70 hover:opacity-100 hover:border-cyan-500/30'
                    : 'bg-surface-base/60 border-hairline hover:bg-surface-elevated hover:border-indigo-500/40'
                }`}
              >
                {/* Chapter Live Progress Fill */}
                {isCurrent && (
                  <div
                    className="absolute left-0 bottom-0 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-150"
                    style={{ width: `${Math.max(10, speechState.charProgress)}%` }}
                  />
                )}

                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs">{ch.icon}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                      isCurrent
                        ? 'bg-cyan-500 text-black animate-pulse'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-surface-elevated text-slate-400'
                    }`}
                  >
                    {isCurrent ? 'LIVE' : isDone ? 'DONE' : `0${idx + 1}`}
                  </span>
                </div>
                <div className="text-[11px] font-semibold font-mono text-slate-900 dark:text-white truncate">
                  {ch.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Settings Drawer (Tone, Personas, Pitch, Volume) ────────── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-hairline/80 space-y-3 font-mono"
          >
            <div className="p-3.5 rounded-xl bg-surface-base border border-hairline text-xs space-y-3">
              {/* Row 1: Briefing Tone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">
                  Briefing Script Tone:
                </span>
                <div className="inline-flex rounded-lg border border-hairline bg-surface-card p-0.5 text-[11px]">
                  {(
                    [
                      { id: 'tactical', label: '⚡ Tactical Mission' },
                      { id: 'executive', label: '💼 Executive 30s' },
                      { id: 'casual', label: '☕ Morning Pep Talk' },
                    ] as { id: BriefingTone; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBriefingTone(t.id)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        briefingTone === t.id
                          ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Voice Persona */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">
                  Voice Persona:
                </span>
                <div className="inline-flex flex-wrap rounded-lg border border-hairline bg-surface-card p-0.5 text-[11px]">
                  {(
                    [
                      { id: 'tactical', label: '⚡ Tactical JARVIS' },
                      { id: 'british', label: '🇬🇧 Royal Executive' },
                      { id: 'natural', label: '🌿 Natural Assistant' },
                      { id: 'cyber', label: '🤖 Cyber AI' },
                      { id: 'broadcast', label: '🎙️ Morning Anchor' },
                    ] as { id: VoicePersona; label: string }[]
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePersonaChange(p.id)}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        speechState.persona === p.id
                          ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Pitch Modulation & Volume Slider */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300">Pitch:</span>
                  <div className="inline-flex rounded-lg border border-hairline bg-surface-card p-0.5 text-[11px]">
                    {(['deep', 'natural', 'crisp'] as VoicePitch[]).map((pitch) => (
                      <button
                        key={pitch}
                        type="button"
                        onClick={() => handlePitchChange(pitch)}
                        className={`px-2 py-0.5 rounded capitalize transition-all cursor-pointer ${
                          voicePitch === pitch
                            ? 'bg-purple-600 text-white font-semibold'
                            : 'text-slate-500 hover:text-white'
                        }`}
                      >
                        {pitch}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-gray-300 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Volume:</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volumeLevel}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500 h-1.5 bg-surface-elevated rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] w-8 text-right font-mono text-slate-400">
                    {Math.round(volumeLevel * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expandable Interactive Transcript Drawer ───────────────── */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-hairline/80 space-y-2.5"
          >
            <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-gray-400 px-1">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-500" />
                <span className="font-semibold uppercase tracking-wider">Synchronized Briefing Script</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-hairline bg-surface-base hover:bg-surface-elevated text-[10px] text-slate-700 dark:text-gray-300 cursor-pointer"
                  title="Copy Full Script"
                >
                  {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedScript ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportScript}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-hairline bg-surface-base hover:bg-surface-elevated text-[10px] text-slate-700 dark:text-gray-300 cursor-pointer"
                  title="Download Script (.txt)"
                >
                  <Download className="w-3 h-3" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {chapters.map((ch, idx) => {
                const isSpeakingChapter = speechState.isSpeaking && speechState.currentChapterIndex === idx;

                return (
                  <div
                    key={ch.id}
                    onClick={() => handleChapterClick(idx)}
                    className={`p-3 rounded-xl border text-xs font-sans leading-relaxed transition-all cursor-pointer ${
                      isSpeakingChapter
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-slate-900 dark:text-white shadow-sm ring-1 ring-cyan-500/30'
                        : 'bg-surface-base/80 border-hairline text-slate-700 dark:text-gray-300 hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 font-mono text-[10px] text-slate-500 dark:text-gray-400">
                      <span className="font-bold flex items-center gap-1">
                        <span>{ch.icon}</span>
                        <span>{ch.title.toUpperCase()}</span>
                      </span>
                      {isSpeakingChapter && (
                        <span className="text-cyan-500 font-bold flex items-center gap-1">
                          <Activity className="w-3 h-3 animate-pulse" />
                          <span>SPEAKING NOW</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs">{ch.text}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
