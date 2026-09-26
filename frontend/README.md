# Locus (v2.0) — Frontend Command Center

> **Track 5 — AI Real World Agent | Build with Swytchcode**  
> Incident Command Center & Autonomous Day Planner Frontend

---

## 1. Overview & Architecture

The **Locus Frontend** is a cyber-aesthetic, high-assurance Incident Command Center built with modern web technologies:

- **Core Framework**: React 19.0.0 + TypeScript 5.7 (strict mode) + Vite 6.4.3
- **Styling & Design Tokens**: Tailwind CSS 3.4.17 + PostCSS + Autoprefixer
- **Motion & Physics**: Framer Motion 12.4.0 (spring physics, entrance animations)
- **Icons**: Lucide React 1.48.0
- **Audio Synthesis**: Native Web Audio API procedural audio cues (start, step, verdict, error)
- **Client-Side Export Generators**: RFC 5545 iCalendar (`.ics`), Markdown executive briefing (`.md`), Structured JSON (`.json`)
- **Dual-Transport Networking**: REST client + Resilient WebSocket client (`ws://localhost:8000/ws`) with exponential reconnection backoff and instant synthetic offline fallback

---

## 2. Design System & Dual-Theme Engine

The interface features an **Adaptive Dual-Theme System** engineered specifically for high-stress operational visibility across all lighting conditions:

### 2.1 Surface Ladder Tokens

| Surface Tier | Token | Dark Theme (`#090a0f`) | Light Theme (`#f8fafc`) | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Base Canvas)** | `bg-surface-base` | `#090a0f` | `#f8fafc` | Deepest root canvas, document body |
| **Tier 2 (Card Surface)** | `bg-surface-card` | `#11131a` | `#ffffff` | Standard cards, timeline blocks, HUD containers |
| **Tier 3 (Elevated Panel)**| `bg-surface-elevated`| `#171923` | `#f1f5f9` | Modals, drawers, header navigation bar, popovers |
| **Tier 4 (Active / Hover)**| `bg-surface-active` | `#1e2230` | `#e2e8f0` | Hover states, active buttons, focused elements |

### 2.2 RGB Channel Variables & Opacity Modifiers
To support Tailwind's opacity modifiers (e.g., `bg-surface-card/80` and `bg-surface-elevated/90`), tokens are defined as space-separated RGB triplets in `src/index.css`:
```css
:root {
  --bg-base-rgb: 248 250 252;          /* #f8fafc Clean Slate */
  --surface-card-rgb: 255 255 255;     /* #ffffff Pure White */
  --surface-elevated-rgb: 241 245 249; /* #f1f5f9 */
  --surface-active-rgb: 226 232 240;   /* #e2e8f0 */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --border-hairline: rgba(15, 23, 42, 0.08);
}
.dark {
  --bg-base-rgb: 9 10 15;              /* #090a0f Deep Obsidian */
  --surface-card-rgb: 17 19 26;        /* #11131a Card Surface */
  --surface-elevated-rgb: 23 25 35;    /* #171923 Elevated */
  --surface-active-rgb: 30 34 48;      /* #1e2230 Active */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --border-hairline: rgba(255, 255, 255, 0.08);
}
```

### 2.3 Semantic Color Accents & Precision Typography
- **Hairline Borders**: `1px solid var(--border-hairline)` (`border-hairline`) and `1px solid var(--border-hairline-strong)`
- **Semantic Color Palette**:
  - 🟢 **Emerald** (`#10b981` / `#34d399`): Optimal conditions, confirmed verdict, completed tasks
  - 🟣 **Indigo** (`#6366f1` / `#818cf8`): Primary actions, AI synthesis engine, active pipeline nodes
  - 🟡 **Amber** (`#f59e0b` / `#fbbf24`): Moderate risks, in-progress tickets, review warnings
  - 🔴 **Crimson** (`#ef4444` / `#f87171`): Severe commute disruption, hazard alerts, blocker tickets
  - 🔵 **Cyan** (`#06b6d4` / `#22d3ee`): Live telemetry, animated data packets, sub-second latencies
- **Tabular Numbers (`tabular-nums`)**: Applied to all clocks, percentages, temperature readings, and latencies to guarantee jitter-free rendering.

---

## 3. Core Feature Catalog

### 3.1 Header Navigation Bar
- **Theme Switcher**: Instant one-click toggle between Dark Obsidian (`#090a0f`) and Clean Slate (`#f8fafc`) with persistence in `localStorage`.
- **Live Status Indicator**: Visual indicator badge switching between `🟢 CONNECTED`, `🟡 RECONNECTING`, and `🔴 OFFLINE / STANDALONE`.
- **UTC Digital Clock**: Synchronized monospace UTC clock with `tabular-nums`.
- **Audio Mute Switch**: Native Web Audio mute toggle with persistent localStorage state.
- **Reset Plan Button**: Instant one-click restore to raw Gemini AI plan.

### 3.2 Hero Command Center & Autonomous Decision Engine
- **Autonomous Decision Verdict Card (`DecisionCard`)**:
  - High-impact neon verdict badges: `WORK FROM HOME`, `WORK FROM OFFICE`, `HYBRID`.
  - Embedded **Generative Weather Canvas (`WeatherCanvas`)**: 60fps HTML5 canvas particle simulation supporting rain streaks, snow flakes, cloud haze, and star dust.
  - Embedded **24-Hour Diurnal Temperature Curve (`TemperatureCurve`)**: Smooth SVG cubic bezier curve plotting hourly forecasts with min/max apex callouts and interactive hover tooltips.
  - Embedded **Atmospheric Score Gauge (`ScoreGauge`)**: Animated SVG stroke gauge indicating composite day viability (0-100).
  - AI Commute Disruption & Workload Rationale callout.
  - 4-metric telemetry HUD: Temperature & Feels-Like, Weather Score, Focus Hours, Total Workload.
- **Benchmark Preset Showcase (`PresetShowcase`)**: 4 one-click scenario benchmarks:
  1. *Storm Warning in London* (Adverse Weather → WFH)
  2. *Delhi Flight Travel Day* (Airport Transit → WFH)
  3. *Sprint Crunch in NYC* (Sprint Deadline → Office)
  4. *Clear Friday in Mumbai* (Optimal Conditions → Office)
- **Natural Language Prompt Bar (`PromptBar`)**:
  - Freeform query input with `Cmd/Ctrl+K` keyboard shortcut focus.
  - City override input.
  - Quick scenario suggestion chips.
- **Productive Hours Meter (`ProductiveHoursMeter`)**: Focus capacity gauge displaying estimated productive hours against an 8-hour day with segmented bar and density classification (`HIGH FOCUS DENSITY`, `BALANCED CAPACITY`, `FRAGMENTED SCHEDULE`).

### 3.3 8-Node Swarm Topology Visualizer (`SwarmTopology`)
- Dedicated visual pipeline representing the 8 LangGraph nodes:
  `OpenWeather` → `Google Gmail` → `Atlassian Jira` → `GitHub` → `Gemini AI` → `Notion` → `Slack` → `Resend`
- 4 Granular Node States: `idle`, `running` (with pulsing glow and ping wave), `completed` (with emerald checkmark), and `fallback/error`.
- **Animated Data Packets (`DataPacket`)**: Glowing particles traversing the pipeline tracks between active nodes.
- **Interactive Node Inspector (`NodeInspector`)**: Accessible modal dialog displaying raw step payload, tool metadata, execution latency, formatted JSON viewer, and one-click copy.

### 3.4 24-Hour Visual Schedule Timeline (`ScheduleTimeline`)
- Chronological timeline with hour-by-hour schedule blocks.
- **Category Filter Chips**: `All`, `Deep Work`, `Meetings`, `Commute`, `Breaks & Outdoor`.
- **Interactive Task Completion**: Checkboxes with reactive strikethrough styling and a dynamic `% Done` progress bar.
- **Inline Editing & Full Modal Editor (`BlockEditorModal`)**: Direct editing of time slot range, activity title, location, and context notes.
- **Chronological Reordering**: Up/Down shifting controls for fine-tuning schedule priorities.
- **Add Custom Focus Block**: Modal form to insert custom focus blocks into any category.

### 3.5 Dual Workload Command Matrix (`WorkloadMatrix`)
- **Combined Dev Capacity Ribbon**: Total engineering hours, Jira ticket count, and GitHub PR review load.
- **Jira Sprint HUD (`JiraSprintHUD`)**: Issue cards with issue keys, summaries, priority chips (`Highest`/`High` in Crimson, `Medium` in Amber, `Low` in Emerald), status pills, and estimated hours.
- **GitHub Review HUD (`GitHubReviewHUD`)**: Open PR cards with author avatars/handles, draft/open status, review time estimates, and **Stale PR Warning Flags** (`⚠️ X days stale - Review Overdue`) for PRs >2 days old. Open repository issues tab.

### 3.6 Artifact Generator & Integration Grid
- **Instant Artifact Generator (`ArtifactExportBar`)**:
  - `Export .ics`: Pure client-side RFC 5545 iCalendar download with VEVENT slots, CRLF line endings, and proper escaping.
  - `Export .md`: Formatted executive briefing download.
  - `Export .json`: Full structured JSON snapshot download.
  - `Copy`: One-click copy briefing to clipboard.
  - `Notion`: Deep link button to generated Notion workspace page.
- **7-Channel Integration Delivery Matrix (`IntegrationGrid`)**:
  - Live status cards for all 7 external services: OpenWeather, Gmail, Jira, GitHub, Notion, Slack, and Resend.

### 3.7 Streaming Cyberpunk Telemetry Terminal (`TelemetryDrawer`)
- Docked at bottom right with minimized counter badge.
- Slide-up monospace terminal feed (`TerminalLogFeed`) streaming real-time tool executions, timestamps, categories, and sub-second latencies.
- Controls for clear logs, audio mute toggle, and expand/minimize.

---

## 4. Zero Cumulative Layout Shift (CLS) & Resilience

The command center guarantees **0 Cumulative Layout Shift (CLS)** and passes the 3-second visual test:
1. **Instant Snapshot Hydration**: On first mount, `AgentContext` initializes from `localStorage` snapshot cache or verified synthetic fixtures. The entire page renders immediately without layout thrashing or blank flash.
2. **Deterministic Geometry**: Grid layouts and timeline blocks enforce explicit minimum heights and aspect ratios.
3. **Resilient Dual-Transport**: If the FastAPI backend (`http://localhost:8000`) is offline, the client seamlessly runs in standalone simulation mode, providing full interactive capability and simulated node pulse streams.

---

## 5. Development & Unified Launch

### 5.1 One-Click Unified Launch
To start both the FastAPI backend and the Vite frontend simultaneously, run the root launcher:
```cmd
START_APP.bat
```
This script will:
- Stop any stale processes holding port 8000 or port 5173
- Verify Python virtual environment (`backend/venv/`)
- Verify Node.js and frontend dependencies
- Launch the FastAPI backend on `http://localhost:8000`
- Launch the Vite frontend on `http://localhost:5173`
- Automatically open your default browser to `http://localhost:5173`

### 5.2 Standalone Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### 5.3 Production Build Verification
To compile the production bundle and verify 0 TypeScript/ESLint errors:
```bash
cd frontend
npm run build
```

### 5.4 Automated Verification Suite
To run end-to-end verification of components, exports, and build artifacts:
```bash
cd frontend
node verify_frontend_e2e.mjs
```

---

## 6. Directory Structure

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.js
├── postcss.config.js
├── verify_frontend_e2e.mjs
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── types/
    │   └── index.ts
    ├── constants/
    │   ├── theme.ts
    │   ├── presets.ts
    │   └── mockData.ts
    ├── services/
    │   ├── api.ts
    │   ├── websocket.ts
    │   ├── export.ts
    │   └── audio.ts
    ├── lib/
    │   └── utils.ts
    ├── context/
    │   ├── AgentContext.tsx
    │   └── ThemeContext.tsx
    └── components/
        ├── common/
        │   ├── Badge.tsx
        │   ├── Button.tsx
        │   └── Card.tsx
        ├── hero/
        │   ├── WeatherCanvas.tsx
        │   ├── TemperatureCurve.tsx
        │   ├── DecisionCard.tsx
        │   ├── ScoreGauge.tsx
        │   ├── ProductiveHoursMeter.tsx
        │   ├── PresetShowcase.tsx
        │   └── PromptBar.tsx
        ├── topology/
        │   ├── SwarmTopology.tsx
        │   ├── NodeCard.tsx
        │   ├── DataPacket.tsx
        │   └── NodeInspector.tsx
        ├── timeline/
        │   ├── ScheduleTimeline.tsx
        │   ├── TimelineBlock.tsx
        │   └── BlockEditorModal.tsx
        ├── workload/
        │   ├── WorkloadMatrix.tsx
        │   ├── JiraSprintHUD.tsx
        │   └── GitHubReviewHUD.tsx
        ├── artifacts/
        │   ├── ArtifactExportBar.tsx
        │   └── IntegrationGrid.tsx
        └── telemetry/
            ├── TelemetryDrawer.tsx
            └── TerminalLogFeed.tsx
```
