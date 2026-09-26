/**
 * Locus Chrome Extension Companion — Deterministic Offline Simulator
 * Pure in-memory heuristic simulation engine mirroring backend ai_advisor.py.
 * Guarantees zero unhandled exceptions, deterministic outputs, and 38-field AgentResponse compliance.
 */

import {
  AgentResponse,
  GitHubIssue,
  GitHubPR,
  GmailEvent,
  JiraTicket,
  RiskLevel,
  ScheduleBlock,
  Verdict,
  parseTimeRange,
} from '../types/index';

export interface OfflineSimulationOptions {
  city?: string;
  userRequest?: string;
  now?: Date;
  seed?: number;
}

export interface OfflineSimulationResult {
  response: AgentResponse;
  scheduleBlocks: ScheduleBlock[];
}

// ── 1. Deterministic Mulberry32 PRNG ──────────────────────────────────────────

export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 2. City Climatological Presets (Matching server.py _mock_weather_for_city) ─

interface CityPreset {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  icon: string;
}

const CITY_PRESETS: Record<string, CityPreset> = {
  // India
  mumbai: { temp: 29.5, feelsLike: 33.0, humidity: 78, windSpeed: 4.5, condition: 'Clouds', description: 'scattered clouds', icon: '03d' },
  bengaluru: { temp: 24.0, feelsLike: 24.5, humidity: 65, windSpeed: 3.5, condition: 'Clouds', description: 'broken clouds', icon: '04d' },
  bangalore: { temp: 24.0, feelsLike: 24.5, humidity: 65, windSpeed: 3.5, condition: 'Clouds', description: 'broken clouds', icon: '04d' },
  delhi: { temp: 32.0, feelsLike: 35.0, humidity: 55, windSpeed: 3.8, condition: 'Clear', description: 'clear sky', icon: '01d' },
  hyderabad: { temp: 28.5, feelsLike: 30.0, humidity: 60, windSpeed: 3.6, condition: 'Clear', description: 'sunny & warm', icon: '01d' },
  pune: { temp: 26.0, feelsLike: 26.5, humidity: 62, windSpeed: 3.9, condition: 'Clouds', description: 'pleasant broken clouds', icon: '03d' },
  chennai: { temp: 31.0, feelsLike: 36.0, humidity: 80, windSpeed: 4.2, condition: 'Clouds', description: 'warm coastal haze', icon: '04d' },
  kolkata: { temp: 30.0, feelsLike: 34.5, humidity: 75, windSpeed: 3.0, condition: 'Clouds', description: 'humid & partly cloudy', icon: '03d' },
  gurgaon: { temp: 31.5, feelsLike: 34.0, humidity: 56, windSpeed: 3.7, condition: 'Clear', description: 'clear sky', icon: '01d' },
  noida: { temp: 31.5, feelsLike: 34.0, humidity: 56, windSpeed: 3.7, condition: 'Clear', description: 'clear sky', icon: '01d' },
  ahmedabad: { temp: 33.0, feelsLike: 36.0, humidity: 50, windSpeed: 4.0, condition: 'Clear', description: 'hot & sunny', icon: '01d' },

  // Americas
  'san francisco': { temp: 17.0, feelsLike: 16.5, humidity: 72, windSpeed: 4.8, condition: 'Clouds', description: 'coastal fog & clouds', icon: '50d' },
  'new york': { temp: 21.0, feelsLike: 20.5, humidity: 60, windSpeed: 4.2, condition: 'Clear', description: 'clear sky', icon: '01d' },
  seattle: { temp: 15.0, feelsLike: 14.5, humidity: 78, windSpeed: 4.5, condition: 'Drizzle', description: 'light mist & drizzle', icon: '09d' },
  austin: { temp: 29.0, feelsLike: 31.0, humidity: 58, windSpeed: 3.8, condition: 'Clear', description: 'bright sunshine', icon: '01d' },
  boston: { temp: 19.5, feelsLike: 19.0, humidity: 62, windSpeed: 4.9, condition: 'Clouds', description: 'few passing clouds', icon: '02d' },
  'los angeles': { temp: 25.0, feelsLike: 25.0, humidity: 52, windSpeed: 3.2, condition: 'Clear', description: 'sunny coastal skies', icon: '01d' },
  chicago: { temp: 18.0, feelsLike: 17.5, humidity: 64, windSpeed: 6.2, condition: 'Clouds', description: 'breezy & overcast', icon: '04d' },
  toronto: { temp: 18.5, feelsLike: 18.0, humidity: 60, windSpeed: 4.4, condition: 'Clear', description: 'crisp clear air', icon: '01d' },
  vancouver: { temp: 16.0, feelsLike: 15.5, humidity: 74, windSpeed: 3.9, condition: 'Rain', description: 'light pacific rain', icon: '10d' },
  'são paulo': { temp: 24.5, feelsLike: 25.5, humidity: 68, windSpeed: 3.6, condition: 'Clouds', description: 'pleasant subtropical warmth', icon: '03d' },
  'sao paulo': { temp: 24.5, feelsLike: 25.5, humidity: 68, windSpeed: 3.6, condition: 'Clouds', description: 'pleasant subtropical warmth', icon: '03d' },
  'mexico city': { temp: 22.0, feelsLike: 21.5, humidity: 50, windSpeed: 3.2, condition: 'Clear', description: 'high-altitude sunshine', icon: '01d' },

  // Europe
  london: { temp: 16.0, feelsLike: 15.2, humidity: 68, windSpeed: 5.1, condition: 'Rain', description: 'light rain', icon: '10d' },
  berlin: { temp: 17.5, feelsLike: 17.0, humidity: 62, windSpeed: 4.1, condition: 'Clouds', description: 'scattered clouds', icon: '03d' },
  paris: { temp: 18.5, feelsLike: 18.0, humidity: 64, windSpeed: 4.0, condition: 'Clouds', description: 'few clouds', icon: '02d' },
  amsterdam: { temp: 16.5, feelsLike: 15.8, humidity: 72, windSpeed: 5.5, condition: 'Clouds', description: 'canal breeze & clouds', icon: '03d' },
  dublin: { temp: 14.5, feelsLike: 13.8, humidity: 76, windSpeed: 5.2, condition: 'Drizzle', description: 'intermittent drizzle', icon: '09d' },
  zurich: { temp: 17.0, feelsLike: 16.5, humidity: 65, windSpeed: 3.1, condition: 'Clear', description: 'clear alpine view', icon: '01d' },
  stockholm: { temp: 14.0, feelsLike: 13.0, humidity: 66, windSpeed: 4.3, condition: 'Clouds', description: 'cool Nordic breeze', icon: '03d' },
  warsaw: { temp: 16.0, feelsLike: 15.5, humidity: 63, windSpeed: 3.7, condition: 'Clouds', description: 'partly cloudy', icon: '03d' },
  madrid: { temp: 26.5, feelsLike: 26.0, humidity: 42, windSpeed: 3.4, condition: 'Clear', description: 'warm castilian sun', icon: '01d' },
  rome: { temp: 25.0, feelsLike: 25.5, humidity: 55, windSpeed: 3.2, condition: 'Clear', description: 'bright mediterranean skies', icon: '01d' },
  munich: { temp: 18.0, feelsLike: 17.5, humidity: 60, windSpeed: 3.8, condition: 'Clouds', description: 'bavarian autumn clouds', icon: '03d' },
  vienna: { temp: 19.0, feelsLike: 18.5, humidity: 58, windSpeed: 4.0, condition: 'Clear', description: 'crisp danube air', icon: '01d' },

  // Asia-Pacific, Africa & Oceania
  tokyo: { temp: 22.0, feelsLike: 21.8, humidity: 62, windSpeed: 3.2, condition: 'Clear', description: 'clear sky', icon: '01d' },
  singapore: { temp: 31.0, feelsLike: 36.5, humidity: 82, windSpeed: 3.0, condition: 'Rain', description: 'tropical afternoon shower', icon: '10d' },
  sydney: { temp: 22.5, feelsLike: 22.0, humidity: 60, windSpeed: 4.5, condition: 'Clear', description: 'sunny harbor skies', icon: '01d' },
  melbourne: { temp: 18.0, feelsLike: 17.2, humidity: 65, windSpeed: 5.2, condition: 'Clouds', description: 'dynamic clouds', icon: '03d' },
  seoul: { temp: 20.5, feelsLike: 20.0, humidity: 58, windSpeed: 3.4, condition: 'Clear', description: 'clear autumn skies', icon: '01d' },
  dubai: { temp: 36.0, feelsLike: 39.0, humidity: 45, windSpeed: 3.5, condition: 'Clear', description: 'hot & sunny', icon: '01d' },
  'tel aviv': { temp: 27.5, feelsLike: 28.5, humidity: 65, windSpeed: 3.8, condition: 'Clear', description: 'sunny mediterranean sky', icon: '01d' },
  taipei: { temp: 27.0, feelsLike: 29.5, humidity: 76, windSpeed: 3.8, condition: 'Clouds', description: 'warm humid clouds', icon: '03d' },
  bangkok: { temp: 32.5, feelsLike: 38.0, humidity: 80, windSpeed: 2.8, condition: 'Clouds', description: 'tropical warmth & clouds', icon: '04d' },
  'cape town': { temp: 20.0, feelsLike: 19.5, humidity: 62, windSpeed: 5.8, condition: 'Clear', description: 'fresh ocean breeze', icon: '01d' },
  auckland: { temp: 17.5, feelsLike: 17.0, humidity: 70, windSpeed: 5.0, condition: 'Clouds', description: 'maritime breeze & clouds', icon: '03d' },
};

/**
 * Resolves climatological preset or deterministically synthesizes realistic weather for ANY city worldwide.
 */
export function getClimatologyForCity(city: string, rng: () => number): CityPreset {
  const cityKey = city.toLowerCase().trim();
  if (CITY_PRESETS[cityKey]) {
    return CITY_PRESETS[cityKey];
  }
  // Deterministic procedural generation for ANY arbitrary world city
  const archetypes: CityPreset[] = [
    { temp: 22.0, feelsLike: 22.5, humidity: 55, windSpeed: 3.4, condition: 'Clear', description: 'clear sunny sky', icon: '01d' },
    { temp: 19.5, feelsLike: 19.0, humidity: 64, windSpeed: 4.2, condition: 'Clouds', description: 'scattered clouds', icon: '03d' },
    { temp: 16.5, feelsLike: 15.5, humidity: 78, windSpeed: 5.0, condition: 'Rain', description: 'light passing rain', icon: '10d' },
    { temp: 27.0, feelsLike: 29.0, humidity: 70, windSpeed: 3.8, condition: 'Clouds', description: 'warm & broken clouds', icon: '04d' },
    { temp: 25.5, feelsLike: 26.0, humidity: 48, windSpeed: 4.0, condition: 'Clear', description: 'bright pleasant sky', icon: '01d' },
    { temp: 14.0, feelsLike: 13.0, humidity: 80, windSpeed: 4.6, condition: 'Drizzle', description: 'overcast drizzle', icon: '09d' },
  ];
  const idx = Math.floor(rng() * archetypes.length);
  const base: CityPreset = archetypes[idx] ?? {
    temp: 22.0,
    feelsLike: 22.5,
    humidity: 55,
    windSpeed: 3.4,
    condition: 'Clear',
    description: 'clear sunny sky',
    icon: '01d',
  };
  const delta = Math.round((rng() - 0.5) * 6);
  return {
    temp: base.temp + delta,
    feelsLike: base.feelsLike + delta,
    humidity: base.humidity,
    windSpeed: base.windSpeed,
    condition: base.condition,
    description: base.description,
    icon: base.icon,
  };
}

// ── 3. Heuristic Calculators ─────────────────────────────────────────────────

export function calculateWeatherScore(
  condition: string,
  tempC: number,
  humidity: number,
  windSpeed: number
): number {
  let score = 92;
  const c = condition.toLowerCase();

  if (c.includes('thunder') || c.includes('tornado') || c.includes('storm')) {
    score -= 65;
  } else if (c.includes('rain') || c.includes('drizzle') || c.includes('snow')) {
    score -= 45;
  } else if (c.includes('mist') || c.includes('fog') || c.includes('haze')) {
    score -= 25;
  } else if (c.includes('cloud')) {
    score -= 10;
  }

  // Thermal comfort (ideal: 19 - 26 C)
  if (tempC < 5 || tempC > 38) {
    score -= 25;
  } else if (tempC < 14 || tempC > 32) {
    score -= 12;
  } else if (tempC < 18 || tempC > 28) {
    score -= 5;
  }

  // Humidity & Wind
  if (humidity > 85) score -= 10;
  else if (humidity > 75) score -= 5;

  if (windSpeed > 10) score -= 15;
  else if (windSpeed > 7) score -= 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

export function deriveOutfitSuggestion(condition: string, tempC: number): string {
  let outfit = '';
  if (tempC < 10) {
    outfit = 'Heavy wool overcoat, thermal knit layers, warm scarf, and insulated footwear.';
  } else if (tempC < 18) {
    outfit = 'Structured trench coat or light windbreaker with knit sweater and tailored slacks.';
  } else if (tempC < 25) {
    outfit = 'Smart casual Oxford shirt, tailored chinos, and breathable loafers.';
  } else if (tempC < 32) {
    outfit = 'Lightweight linen shirt, breathable cotton trousers, and UV-protective sunglasses.';
  } else {
    outfit = 'Ultra-breathable linen attire, UV sunglasses, and headwear for outdoor transit.';
  }

  const c = condition.toLowerCase();
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder') || c.includes('shower')) {
    outfit += ' Keep a compact windproof umbrella and water-resistant footwear on hand.';
  }
  return outfit;
}

// ── 4. Main Simulation Generator ─────────────────────────────────────────────

export function generateOfflineSimulation(options: OfflineSimulationOptions = {}): OfflineSimulationResult {
  try {
    const now = options.now || new Date();
    const city = (options.city || 'Mumbai').trim();
    const cityKey = city.toLowerCase();
    const userRequest = (options.userRequest || '').trim().toLowerCase();

    // Deterministic seed: Date string (YYYY-MM-DD) + City + UserRequest
    const dateStr = now.toISOString().split('T')[0];
    const seedInput = options.seed !== undefined
      ? String(options.seed)
      : `${dateStr}:${cityKey}:${userRequest}`;
    const _prng = createMulberry32(stringToSeed(seedInput));

    // Base climatology — uses preset if known, or dynamically synthesizes realistic weather for ANY city
    const preset = getClimatologyForCity(city, _prng);

    let temp = preset.temp;
    let feelsLike = preset.feelsLike;
    let humidity = preset.humidity;
    let windSpeed = preset.windSpeed;
    let condition = preset.condition;
    let desc = preset.description;
    let icon = preset.icon;

    // React to user prompt keywords
    const hasOutdoorPlans = userRequest.includes('picnic') || userRequest.includes('outdoor') || userRequest.includes('beach') || userRequest.includes('cricket');
    const hasTravelPlans = userRequest.includes('flight') || userRequest.includes('travel') || userRequest.includes('airport') || userRequest.includes('train');

    if (userRequest.includes('rain') || userRequest.includes('storm')) {
      condition = 'Rain';
      desc = 'moderate rain & wet roads';
      icon = '10d';
      humidity = Math.min(95, humidity + 20);
      temp = Math.max(18, temp - 4);
      feelsLike = temp - 1;
    } else if (userRequest.includes('clear') || userRequest.includes('sunny')) {
      condition = 'Clear';
      desc = 'bright sunny skies';
      icon = '01d';
      humidity = Math.max(40, humidity - 15);
    }

    const weatherScore = calculateWeatherScore(condition, temp, humidity, windSpeed);
    const isBadWeather = weatherScore < 45 || ['rain', 'thunderstorm', 'snow', 'tornado'].some(c => condition.toLowerCase().includes(c));
    const riskLevel: RiskLevel = weatherScore < 35 ? 'high' : weatherScore < 65 ? 'medium' : 'low';

    // Office vs WFH Verdict
    let verdict: Verdict = 'office';
    let officeReason = 'Favorable weather and commute conditions for working from office.';

    if (userRequest.includes('wfh') || userRequest.includes('home')) {
      verdict = 'wfh';
      officeReason = 'Remote work preference aligned with scheduled focus workload.';
    } else if (userRequest.includes('office') || userRequest.includes('commute')) {
      verdict = 'office';
      officeReason = 'In-person team sync and sprint collaboration prioritized today.';
    } else if (isBadWeather && hasTravelPlans) {
      verdict = 'wfh';
      officeReason = `Severe ${condition.toLowerCase()} weather and travel commitments make working from home optimal.`;
    } else if (isBadWeather) {
      verdict = 'hybrid';
      officeReason = `${condition} reported today — recommend working from home during morning transit hours.`;
    } else if (hasOutdoorPlans) {
      verdict = 'hybrid';
      officeReason = 'Outdoor commitments scheduled; flexible hours recommended.';
    } else {
      verdict = 'office';
      officeReason = 'Clear transit routes and moderate weather favor working from the office.';
    }

    const outfit = deriveOutfitSuggestion(condition, temp);

    // Jira workload
    const jiraTickets: JiraTicket[] = [
      { key: 'PROJ-101', summary: 'Fix login bug on mobile authentication flow', priority: 'High', status: 'In Progress', issue_type: 'Bug', estimated_hours: 3.0 },
      { key: 'PROJ-102', summary: 'Review PR for payment gateway integration', priority: 'High', status: 'In Review', issue_type: 'Task', estimated_hours: 2.0 },
      { key: 'PROJ-103', summary: 'Write comprehensive unit tests for auth flow', priority: 'Medium', status: 'To Do', issue_type: 'Task', estimated_hours: 2.0 },
      { key: 'PROJ-104', summary: 'Update API documentation and schema definitions', priority: 'Low', status: 'To Do', issue_type: 'Task', estimated_hours: 1.0 },
    ];
    const jiraTotalHours = jiraTickets.reduce((acc, t) => acc + t.estimated_hours, 0);

    // GitHub workload
    const githubPrs: GitHubPR[] = [
      { type: 'PR', number: 42, title: 'Add dark mode support to executive dashboard', author: 'iakankshaa', user: 'iakankshaa', state: 'open', draft: false, days_old: 2, estimated_hours: 1.5 },
      { type: 'PR', number: 43, title: 'Fix race condition in async notification worker', author: 'iakankshaa', user: 'iakankshaa', state: 'open', draft: true, days_old: 0, estimated_hours: 1.5 },
    ];
    const githubIssues: GitHubIssue[] = [
      { type: 'Issue', number: 99, title: 'Customer unable to reset MFA token via portal', state: 'open', days_old: 1, author: 'iakankshaa', estimated_hours: 0.5 },
      { type: 'Issue', number: 100, title: 'Add export-to-CSV feature in sprint analytics', state: 'open', days_old: 5, author: 'iakankshaa', estimated_hours: 0.5 },
    ];
    const githubTotalHours = 4.0;
    const productiveHours = Math.min(8.0, Number((jiraTotalHours * 0.5 + githubTotalHours * 0.6).toFixed(1)));

    // Gmail events
    const gmailEvents: GmailEvent[] = [
      { subject: 'Engineering Team Standup & Daily Alignment', from: 'tech-lead@company.com', snippet: 'Daily standup to review sprint burn-down and blockers.', has_outdoor: false, has_travel: false },
      { subject: 'Architecture Review: Manifest V3 Companion Client', from: 'architect@company.com', snippet: 'Reviewing offline fallback and storage contracts.', has_outdoor: false, has_travel: false },
    ];

    // Raw timeline blueprints
    const rawTimeline = [
      { time: '07:00–08:00', title: "Morning routine & review today's briefing", category: 'general' as const },
      { time: '08:00–09:00', title: verdict === 'office' ? 'Morning commute to office' : 'WFH morning workstation setup & focus coffee', category: 'commute' as const },
      { time: '09:00–10:30', title: '[Jira PROJ-101] Fix login bug on mobile authentication flow', category: 'deep_work' as const, context: 'PROJ-101' },
      { time: '10:30–11:00', title: 'Engineering daily standup & sprint sync', category: 'meeting' as const },
      { time: '11:00–12:30', title: '[Jira PROJ-102] Review PR for payment gateway integration', category: 'deep_work' as const, context: 'PROJ-102' },
      { time: '12:30–13:30', title: isBadWeather ? 'Indoor lunch & wellness break' : 'Lunch break & outdoor recharge walk', category: 'break' as const },
      { time: '13:30–14:30', title: '[GitHub PR #42] Code review: Add dark mode support', category: 'deep_work' as const, context: 'PR #42' },
      { time: '14:30–15:30', title: '[Jira PROJ-103] Write unit tests for auth flow', category: 'deep_work' as const, context: 'PROJ-103' },
      { time: '15:30–16:30', title: 'Sprint backlog refinement & team sync', category: 'meeting' as const },
      { time: '16:30–17:30', title: '[GitHub Issue #99] Investigate MFA reset issue', category: 'deep_work' as const, context: 'Issue #99' },
      { time: '17:30–18:00', title: 'Daily retro: Log progress in Notion + plan tomorrow', category: 'general' as const },
      { time: '18:00–19:00', title: verdict === 'office' ? 'Evening commute home' : 'Evening workout & mental decompression', category: 'commute' as const },
      { time: '19:00–20:30', title: 'Dinner & personal leisure time', category: 'break' as const },
      { time: '20:30–22:00', title: 'Reading & technical exploration', category: 'general' as const },
      { time: '22:00–23:00', title: 'Night wind-down & sleep preparation', category: 'break' as const },
    ];

    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Map into typed ScheduleBlock[]
    const scheduleBlocks: ScheduleBlock[] = rawTimeline.map((item, idx) => {
      const { startTime, endTime } = parseTimeRange(item.time);
      let completed = false;
      if (endTime) {
        const [endH, endM] = endTime.split(':').map(Number);
        if (endH !== undefined && endM !== undefined) {
          if (currentHour > endH || (currentHour === endH && currentMinute >= endM)) {
            completed = true;
          }
        }
      }

      return {
        id: `offline-block-${idx + 1}-${dateStr}`,
        time: item.time,
        startTime,
        endTime,
        title: item.title,
        activity: item.title,
        category: item.category,
        completed,
        location: verdict === 'office' ? `${city} Tech Park / Office` : `${city} Remote Desk`,
        context: item.context,
      };
    });

    const recommendations = [
      '⚡ Prioritize High-priority Jira bug PROJ-101 during the morning focus window.',
      '🐙 Allocate uninterrupted afternoon time to review GitHub PR #42.',
      isBadWeather ? `🌂 Rainy/adverse weather in ${city} — keep umbrella handy and plan transit carefully.` : `☀️ Clear atmospheric conditions in ${city} — take a 15-minute outdoor walk.`,
      '📝 Log day plan milestones in Notion before end-of-day wrap-up.',
    ];

    const response: AgentResponse = {
      user_request: options.userRequest || `Plan my day in ${city}`,
      user_email: 'user@locus.local',
      weather_data: {
        temp,
        feels_like: feelsLike,
        humidity,
        wind_speed: windSpeed,
        condition,
        description: desc,
      },
      city,
      weather_summary: `${condition}, ${Math.round(temp)}°C (feels like ${Math.round(feelsLike)}°C), ${desc} in ${city}`,
      temperature_c: temp,
      feels_like_c: feelsLike,
      humidity,
      wind_speed: windSpeed,
      weather_condition: condition,
      weather_icon: icon,
      weather_score: weatherScore,
      risk_level: riskLevel,
      forecast_summary: `24h forecast: ${condition} conditions prevailing. Temps: ${Math.round(temp - 3)}°C – ${Math.round(temp + 3)}°C`,
      weather_alerts: isBadWeather ? [`⚠️ ${condition} advisory in ${city}`] : [],
      ai_summary: `Today in ${city}: ${condition} at ${Math.round(temp)}°C. You have ~${productiveHours}h of focused work across ${jiraTickets.length} Jira tickets and ${githubPrs.length} GitHub PRs. Recommendation: ${verdict.toUpperCase()} (${officeReason}). [Offline Simulation Engine Active]`,
      go_to_office: verdict,
      office_reason: officeReason,
      estimated_productive_hours: productiveHours,
      recommendations,
      outfit_suggestion: outfit,
      activity_adjustments: isBadWeather ? ['Shift outdoor errands to indoor alternatives'] : [],
      should_alert: isBadWeather || riskLevel === 'high',
      gmail_events: gmailEvents,
      gmail_summary: `📋 Standard team schedule | ${gmailEvents.length} calendar commitments`,
      has_outdoor_plans: hasOutdoorPlans,
      has_travel_plans: hasTravelPlans,
      jira_tickets: jiraTickets,
      jira_estimated_hours: jiraTotalHours,
      jira_summary: `📋 ${jiraTickets.length} open Jira tickets · ~${jiraTotalHours}h total estimated work · 2 high-priority`,
      github_prs: githubPrs,
      github_issues: githubIssues,
      github_estimated_hours: githubTotalHours,
      github_summary: `🐙 ${githubPrs.length} open PRs · ${githubIssues.length} assigned issues · ~${githubTotalHours}h code-review work`,
      day_plan_timeline: scheduleBlocks,
      notion_logged: false,
      notion_page_url: 'https://notion.so',
      slack_message_sent: false,
      email_sent: false,
      resend_message_id: null,
      execution_log: [
        `🧠 [Offline Simulation Engine] Synthesized deterministic day plan for ${city} at ${now.toISOString()}`,
        `⚡ Computed weather score: ${weatherScore}/100 | Verdict: ${verdict.toUpperCase()}`,
        `📋 Populated ${jiraTickets.length} Jira tickets and ${githubPrs.length} GitHub PRs`,
      ],
      processed_at: now.toISOString(),
    };

    return { response, scheduleBlocks };
  } catch (err) {
    console.error('[OfflineSimulator] Unexpected error in offline simulation generator:', err);
    return getSafeHardcodedFallback();
  }
}

// ── 5. Bulletproof Hardcoded Fallback (Zero Exception Guarantee) ─────────────

export function getSafeHardcodedFallback(): OfflineSimulationResult {
  const fallbackBlocks: ScheduleBlock[] = [
    { id: 'safe-1', time: '09:00–12:00', startTime: '09:00', endTime: '12:00', title: 'Deep Work & Sprint Focus', category: 'deep_work', completed: false },
    { id: 'safe-2', time: '12:00–13:00', startTime: '12:00', endTime: '13:00', title: 'Lunch Break & Reset', category: 'break', completed: false },
    { id: 'safe-3', time: '13:00–17:00', startTime: '13:00', endTime: '17:00', title: 'Code Review & Team Collaboration', category: 'deep_work', completed: false },
  ];

  const fallbackResponse: AgentResponse = {
    user_request: 'Plan my day',
    user_email: 'user@locus.local',
    weather_data: { temp: 26.0, condition: 'Clouds', humidity: 65, wind_speed: 4.0 },
    city: 'Mumbai',
    weather_summary: 'Partly Cloudy, 26°C in Mumbai',
    temperature_c: 26.0,
    feels_like_c: 27.0,
    humidity: 65,
    wind_speed: 4.0,
    weather_condition: 'Clouds',
    weather_icon: '04d',
    weather_score: 75,
    risk_level: 'low',
    forecast_summary: '24h forecast: Pleasant conditions',
    weather_alerts: [],
    ai_summary: 'Day plan ready. Working from office or home based on your schedule.',
    go_to_office: 'wfh',
    office_reason: 'Balanced workload; remote work recommended.',
    estimated_productive_hours: 6.0,
    recommendations: ['Prioritize critical sprint backlog items today.'],
    outfit_suggestion: 'Smart casual attire.',
    activity_adjustments: [],
    should_alert: false,
    gmail_events: [],
    gmail_summary: 'Indoor schedule',
    has_outdoor_plans: false,
    has_travel_plans: false,
    jira_tickets: [],
    jira_estimated_hours: 4.0,
    jira_summary: 'Standard sprint backlog',
    github_prs: [],
    github_issues: [],
    github_estimated_hours: 2.0,
    github_summary: 'Code review queued',
    day_plan_timeline: fallbackBlocks,
    notion_logged: false,
    notion_page_url: null,
    slack_message_sent: false,
    email_sent: false,
    resend_message_id: null,
    execution_log: ['⚠️ Hardcoded safe fallback activated'],
    processed_at: new Date().toISOString(),
  };

  return { response: fallbackResponse, scheduleBlocks: fallbackBlocks };
}
