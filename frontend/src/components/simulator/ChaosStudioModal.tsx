import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgent } from '../../context/AgentContext';
import { playTone } from '../../services/audio';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Zap,
  Flame,
  CloudSnow,
  CloudRain,
  Skull,
  ShieldAlert,
  AlertOctagon,
  Sliders,
  RotateCcw,
  X,
  Play,
  Cpu,
  Layers,
  Thermometer,
  Wind,
  Droplets,
  Bug,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';

interface ChaosStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChaosPreset {
  id: string;
  name: string;
  category: 'weather' | 'workload' | 'fault';
  icon: React.ReactNode;
  badge: string;
  badgeVariant: 'crimson' | 'amber' | 'cyan' | 'purple';
  description: string;
  city: string;
  prompt: string;
  params: {
    temp: number;
    humidity: number;
    wind: number;
    p0Tickets: number;
    stalePrs: number;
    failNotion: boolean;
    failSlack: boolean;
  };
}

const CHAOS_PRESETS: ChaosPreset[] = [
  {
    id: 'cyclone',
    name: 'Category 4 Cyclone & Flash Flood',
    category: 'weather',
    icon: <CloudRain className="w-5 h-5 text-cyan-400" />,
    badge: 'Weather Chaos',
    badgeVariant: 'cyan',
    description: 'Torrential squalls (110 mm/h), 65 km/h gusts, flight groundings in Mumbai. Asserts immediate WFH directive.',
    city: 'Mumbai',
    prompt: 'Severe Category 4 Cyclone alert in Mumbai with torrential flooding. Review my urgent Jira tickets and restructure my day plan for pure remote survival.',
    params: {
      temp: 34,
      humidity: 98,
      wind: 65,
      p0Tickets: 2,
      stalePrs: 3,
      failNotion: false,
      failSlack: false,
    },
  },
  {
    id: 'blizzard',
    name: 'Arctic Polar Vortex & Blizzard',
    category: 'weather',
    icon: <CloudSnow className="w-5 h-5 text-indigo-400" />,
    badge: 'Sub-Zero',
    badgeVariant: 'purple',
    description: 'Sub-zero (-8°C) freeze, heavy snow accumulation, transit suspended. Requires heavy thermal protocol.',
    city: 'London',
    prompt: 'Severe Polar Vortex in London with -8°C blizzard. I have 4 Jira tickets and 2 PRs. Decide office feasibility and formulate indoor schedule.',
    params: {
      temp: -8,
      humidity: 85,
      wind: 48,
      p0Tickets: 3,
      stalePrs: 2,
      failNotion: false,
      failSlack: false,
    },
  },
  {
    id: 'heatwave_smog',
    name: '47°C Heatwave & Toxic Smog',
    category: 'weather',
    icon: <Flame className="w-5 h-5 text-amber-500" />,
    badge: 'Hazardous AQI',
    badgeVariant: 'amber',
    description: 'Extreme 47°C heat index with AQI 420 toxic smog in Delhi. Zero daytime outdoor commute recommended.',
    city: 'Delhi',
    prompt: 'Extreme 47°C heatwave and hazardous smog warning in Delhi. Check my pending code reviews and shield my deep work indoors.',
    params: {
      temp: 47,
      humidity: 35,
      wind: 12,
      p0Tickets: 1,
      stalePrs: 4,
      failNotion: false,
      failSlack: false,
    },
  },
  {
    id: 'p0_outage',
    name: 'Production P0 Outage Meltdown',
    category: 'workload',
    icon: <Bug className="w-5 h-5 text-rose-500" />,
    badge: 'War Room',
    badgeVariant: 'crimson',
    description: '5 Blocker Jira security tickets + 6 pending critical PRs. Forces maximum deep work time allocation.',
    city: 'Bengaluru',
    prompt: 'Emergency Production P0 Meltdown! We have multiple critical vulnerabilities in auth service. Plan an 8-hour war room and hotfix review schedule.',
    params: {
      temp: 24,
      humidity: 60,
      wind: 15,
      p0Tickets: 5,
      stalePrs: 6,
      failNotion: false,
      failSlack: false,
    },
  },
  {
    id: 'circuit_breaker',
    name: 'Fault Resilience & Circuit Breaker',
    category: 'fault',
    icon: <ShieldAlert className="w-5 h-5 text-indigo-500" />,
    badge: 'Self-Healing',
    badgeVariant: 'purple',
    description: 'Simulates third-party Notion 500 error & Slack rate limit to verify deterministic LangGraph fallback.',
    city: 'Gurugram',
    prompt: 'Run full morning planning while simulating Notion and Slack webhook downstream latency. Verify graceful circuit-breaker degradation.',
    params: {
      temp: 26,
      humidity: 50,
      wind: 10,
      p0Tickets: 2,
      stalePrs: 2,
      failNotion: true,
      failSlack: true,
    },
  },
];

export const ChaosStudioModal: React.FC<ChaosStudioModalProps> = ({ isOpen, onClose }) => {
  const { runCustomQuery, isRunning } = useAgent();
  const [selectedPreset, setSelectedPreset] = useState<ChaosPreset>(CHAOS_PRESETS[0]);
  const [customTemp, setCustomTemp] = useState(selectedPreset.params.temp);
  const [customHumidity, setCustomHumidity] = useState(selectedPreset.params.humidity);
  const [customWind, setCustomWind] = useState(selectedPreset.params.wind);
  const [customP0, setCustomP0] = useState(selectedPreset.params.p0Tickets);
  const [customPRs, setCustomPRs] = useState(selectedPreset.params.stalePrs);
  const [cityInput, setCityInput] = useState(selectedPreset.city);

  const handleSelectPreset = (preset: ChaosPreset) => {
    setSelectedPreset(preset);
    setCustomTemp(preset.params.temp);
    setCustomHumidity(preset.params.humidity);
    setCustomWind(preset.params.wind);
    setCustomP0(preset.params.p0Tickets);
    setCustomPRs(preset.params.stalePrs);
    setCityInput(preset.city);
    playTone('step');
  };

  const handleExecuteChaos = async () => {
    playTone('alarm');
    onClose();

    // Construct enriched prompt with custom injected parameters
    const enrichedPrompt = `[CHAOS SIMULATION: Temp=${customTemp}°C, Humidity=${customHumidity}%, Wind=${customWind}km/h, P0_Tickets=${customP0}, Stale_PRs=${customPRs}] ${selectedPreset.prompt}`;
    await runCustomQuery(enrichedPrompt, cityInput);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className="relative w-full max-w-4xl bg-surface-card border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header Banner */}
          <div className="p-4 sm:p-5 border-b border-hairline bg-gradient-to-r from-rose-500/15 via-indigo-500/10 to-amber-500/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-500 dark:text-rose-400 shadow-inner">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                    Live Chaos & Fault Simulator
                  </h2>
                  <Badge variant="crimson" size="sm" dot pulse className="font-mono text-[10px]">
                    LIVE INJECTION
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 font-sans">
                  Inject real-world atmospheric extremes, P0 outages, and API faults to test Locus autonomous resilience
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-surface-elevated transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 max-h-[75vh] overflow-y-auto">
            {/* Left Column: Preset Scenarios (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 font-mono flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Select Chaos Scenario</span>
                </span>
                <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-mono">
                  {CHAOS_PRESETS.length} Available
                </span>
              </div>

              <div className="space-y-2.5">
                {CHAOS_PRESETS.map((preset) => {
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-rose-500/10 border-rose-500/50 shadow-md shadow-rose-500/10'
                          : 'bg-surface-base border-hairline hover:border-hairline/90 hover:bg-surface-elevated'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-surface-card border border-hairline">
                            {preset.icon}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {preset.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                              {preset.description}
                            </p>
                          </div>
                        </div>

                        <Badge variant={preset.badgeVariant} size="sm" className="font-mono text-[9px] flex-shrink-0">
                          {preset.badge}
                        </Badge>
                      </div>

                      {isSelected && (
                        <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] font-mono text-rose-600 dark:text-rose-400">
                          <span>Target: {preset.city}</span>
                          <span>P0: {preset.params.p0Tickets} | PRs: {preset.params.stalePrs}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Custom Parameter Overrides (5 cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-4 bg-surface-base p-4 rounded-xl border border-hairline">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400 font-mono flex items-center gap-1.5 mb-3">
                  <Sliders className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Telemetry Overrides</span>
                </span>

                <div className="space-y-3.5 text-xs font-mono">
                  {/* City */}
                  <div>
                    <label className="text-slate-600 dark:text-gray-300 block mb-1">Target City</label>
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-card border border-hairline text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Temperature Slider */}
                  <div>
                    <div className="flex justify-between text-slate-600 dark:text-gray-300 mb-1">
                      <span className="flex items-center gap-1">
                        <Thermometer className="w-3.5 h-3.5 text-amber-500" /> Temp (°C)
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{customTemp}°C</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="50"
                      value={customTemp}
                      onChange={(e) => setCustomTemp(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Humidity Slider */}
                  <div>
                    <div className="flex justify-between text-slate-600 dark:text-gray-300 mb-1">
                      <span className="flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-cyan-500" /> Humidity (%)
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{customHumidity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={customHumidity}
                      onChange={(e) => setCustomHumidity(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Wind Slider */}
                  <div>
                    <div className="flex justify-between text-slate-600 dark:text-gray-300 mb-1">
                      <span className="flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-indigo-500" /> Wind (km/h)
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{customWind} km/h</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={customWind}
                      onChange={(e) => setCustomWind(Number(e.target.value))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Jira P0 Blockers Slider */}
                  <div>
                    <div className="flex justify-between text-slate-600 dark:text-gray-300 mb-1">
                      <span className="flex items-center gap-1">
                        <Bug className="w-3.5 h-3.5 text-rose-500" /> P0 Jira Blockers
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{customP0}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={customP0}
                      onChange={(e) => setCustomP0(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Stale PRs Slider */}
                  <div>
                    <div className="flex justify-between text-slate-600 dark:text-gray-300 mb-1">
                      <span className="flex items-center gap-1">
                        <GitPullRequest className="w-3.5 h-3.5 text-purple-500" /> Stale GitHub PRs
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">{customPRs}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="8"
                      value={customPRs}
                      onChange={(e) => setCustomPRs(Number(e.target.value))}
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-3 border-t border-hairline">
                <Button
                  variant="danger"
                  size="md"
                  onClick={handleExecuteChaos}
                  disabled={isRunning}
                  icon={<Zap className="w-4 h-4" />}
                  className="w-full justify-center text-xs font-mono shadow-lg shadow-rose-500/20 py-2.5"
                >
                  {isRunning ? 'Injecting Chaos...' : '⚡ Inject & Execute Pipeline'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
