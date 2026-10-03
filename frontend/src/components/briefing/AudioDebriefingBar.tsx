import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import {
  audioService,
  speakBriefing,
  stopSpeech,
  pauseSpeech,
  resumeSpeech,
  playTone,
  VoicePersona,
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
} from 'lucide-react';

export const AudioDebriefingBar: React.FC = () => {
  const { activeAgentResponse, isRunning, isMuted } = useAgent();
  const [speechState, setSpeechState] = useState<SpeechState>(() => audioService.getSpeechState());
  const [showTranscript, setShowTranscript] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Subscribe to speech state changes
  useEffect(() => {
    const unsubscribe = subscribeSpeech((state) => {
      setSpeechState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Compile military-grade executive briefing script
  const briefingScript = useMemo(() => {
    const verdict = (activeAgentResponse.go_to_office || 'wfh').toUpperCase();
    const city = activeAgentResponse.city || 'Command Center';
    const temp = activeAgentResponse.temperature_c ?? 25;
    const weatherCond = activeAgentResponse.weather_condition || 'Clear';
    const weatherScore = activeAgentResponse.weather_score ?? 85;
    const jiraCount = activeAgentResponse.jira_tickets?.length || 0;
    const jiraHours = activeAgentResponse.jira_estimated_hours || 0;
    const githubPrs = activeAgentResponse.github_prs?.length || 0;
    const stalePrs = activeAgentResponse.github_prs?.filter((p: any) => p.is_stale)?.length || 0;
    const productiveHours = activeAgentResponse.estimated_productive_hours || 7.5;
    const outfit = activeAgentResponse.outfit_suggestion || 'Comfortable attire';

    const verdictSpoken =
      verdict === 'OFFICE'
        ? 'Objective Verdict: Report to Office. Weather clearance confirmed.'
        : verdict === 'HYBRID'
        ? 'Objective Verdict: Flexible Hybrid Day. Local conditions require adaptive presence.'
        : 'Objective Verdict: Work From Home Directive. Focus efficiency maximized.';

    const script = [
      `Locus Executive Morning Briefing for ${city}.`,
      `${verdictSpoken}`,
      `Atmospheric status: ${weatherCond} at ${Math.round(temp)} degrees Celsius. Commute viability score is ${weatherScore} out of 100.`,
      `Engineering sprint load: ${jiraCount} active Jira tickets totaling ${jiraHours.toFixed(1)} estimated hours. GitHub queue has ${githubPrs} open pull requests${stalePrs > 0 ? `, with ${stalePrs} stale reviews requiring immediate triage` : ''}.`,
      `Optimal focus capacity is locked at ${productiveHours.toFixed(1)} hours. Recommended gear: ${outfit}.`,
      `All executive notifications dispatched to Notion, Slack, and Resend. Proceed with mission.`,
    ].join(' ');

    return script;
  }, [activeAgentResponse]);

  // Audio Equalizer Spectrum visualizer animation
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

      const numBars = 28;
      const barWidth = (width / numBars) * 0.65;
      const gap = (width / numBars) * 0.35;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap) + 4;
        let barHeight = 4;

        if (speechState.isSpeaking && !speechState.isPaused) {
          // Dynamic cyber harmonic wave simulation
          const freq1 = Math.sin(phase * 0.08 + i * 0.4);
          const freq2 = Math.cos(phase * 0.12 - i * 0.25);
          const dynamicFactor = Math.abs(freq1 * 0.6 + freq2 * 0.4);
          barHeight = Math.max(4, dynamicFactor * (height * 0.85));
        } else if (isRunning) {
          // Subtle pulse when AI pipeline is thinking
          barHeight = 4 + Math.sin(phase * 0.05 + i * 0.3) * 6;
        }

        const y = height - barHeight;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, y, 0, height);
        if (speechState.isSpeaking) {
          grad.addColorStop(0, '#06b6d4'); // Cyan
          grad.addColorStop(1, '#6366f1'); // Indigo
        } else {
          grad.addColorStop(0, '#475569');
          grad.addColorStop(1, '#334155');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
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
  }, [speechState.isSpeaking, speechState.isPaused, isRunning]);

  // Handle Voice playback controls
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
      speakBriefing(briefingScript, speechState.persona, playbackSpeed);
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
      speakBriefing(briefingScript, speechState.persona, playbackSpeed);
    }, 150);
  };

  const handlePersonaChange = (persona: VoicePersona) => {
    playTone('step');
    audioService.setPersona(persona);
    if (speechState.isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        speakBriefing(briefingScript, persona, playbackSpeed);
      }, 150);
    }
  };

  const handleSpeedCycle = () => {
    playTone('step');
    const speeds = [0.8, 1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    setPlaybackSpeed(newSpeed);
    if (speechState.isSpeaking) {
      stopSpeech();
      setTimeout(() => {
        speakBriefing(briefingScript, speechState.persona, newSpeed);
      }, 150);
    }
  };

  return (
    <Card surface="card" className="p-3.5 sm:p-4 shadow-lg border border-cyan-500/20 relative overflow-hidden card-highlight-glow mb-4">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-72 h-32 bg-cyan-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-32 bg-indigo-500/5 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Left Section: Spectrum & AI Debriefing Header */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/15 to-indigo-500/15 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 flex-shrink-0 shadow-inner">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono flex items-center gap-1.5">
                <span>AI Voice Briefing HUD</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
              </span>
              <Badge
                variant={speechState.isSpeaking ? (speechState.isPaused ? 'amber' : 'cyan') : 'outline'}
                size="sm"
                dot
                pulse={speechState.isSpeaking && !speechState.isPaused}
                className="font-mono text-[10px]"
              >
                {speechState.isSpeaking ? (speechState.isPaused ? 'PAUSED' : 'TRANSMITTING') : 'READY'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5 font-sans">
              Tactical audio debriefing synthesized directly from multi-source LangGraph state
            </p>
          </div>
        </div>

        {/* Middle: Canvas Audio Equalizer */}
        <div className="hidden lg:flex items-center px-3 py-1.5 rounded-lg bg-surface-base border border-hairline/70">
          <canvas
            ref={canvasRef}
            width={160}
            height={28}
            className="w-[160px] h-[28px] select-none"
            title="Live Audio Spectrum Visualizer"
          />
        </div>

        {/* Right Section: Player Controls & Modifiers */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Persona Selector */}
          <div className="inline-flex rounded-lg border border-hairline bg-surface-base p-0.5 text-[10px]">
            {(['tactical', 'british', 'natural'] as VoicePersona[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handlePersonaChange(p)}
                className={`px-2 py-1 rounded-md capitalize transition-all cursor-pointer ${
                  speechState.persona === p
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p === 'tactical' ? '⚡ Tactical' : p === 'british' ? '🇬🇧 Royal' : '🌿 Natural'}
              </button>
            ))}
          </div>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={handleSpeedCycle}
            title="Cycle Voice Playback Speed"
            className="px-2 py-1 rounded-lg border border-hairline bg-surface-base hover:bg-surface-elevated text-slate-700 dark:text-gray-300 text-[10px] font-semibold transition-all cursor-pointer shadow-xs"
          >
            {playbackSpeed}x
          </button>

          {/* Main Play / Pause Button */}
          <Button
            variant={speechState.isSpeaking && !speechState.isPaused ? 'danger' : 'primary'}
            size="sm"
            onClick={handlePlayToggle}
            icon={
              speechState.isSpeaking && !speechState.isPaused ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )
            }
            className="text-xs shadow-md"
          >
            {speechState.isSpeaking && !speechState.isPaused ? 'Pause' : 'Brief Me'}
          </Button>

          {/* Replay */}
          <button
            type="button"
            onClick={handleReplay}
            title="Replay Voice Transmission"
            className="p-1.5 rounded-lg border border-hairline bg-surface-base hover:bg-surface-elevated text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Stop */}
          {speechState.isSpeaking && (
            <button
              type="button"
              onClick={handleStop}
              title="Stop Speech Transmission"
              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer shadow-xs"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle Transcript */}
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className="p-1.5 rounded-lg border border-hairline bg-surface-base hover:bg-surface-elevated text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
            title="Toggle Spoken Briefing Transcript"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Transcript Drawer */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-hairline/80"
          >
            <div className="p-3 rounded-xl bg-surface-base/80 border border-hairline text-xs font-mono leading-relaxed text-slate-700 dark:text-gray-300">
              <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3 h-3 text-cyan-500" />
                  <span>Synthesized Voice Transcript</span>
                </span>
                <span className="text-cyan-500">{speechState.persona.toUpperCase()} ENGINE</span>
              </div>
              <p className="font-sans text-xs text-slate-800 dark:text-gray-200">
                "{briefingScript}"
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
