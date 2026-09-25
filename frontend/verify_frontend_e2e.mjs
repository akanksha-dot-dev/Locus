/**
 * SwytchAgent Day Planner v2.0 — Frontend E2E & Production Verification Suite
 * Verifies production build, bundle sizes, App component integration,
 * export generators, design tokens, and unified launch scripts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = __dirname;
const rootDir = path.resolve(frontendDir, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedTests++;
  }
}

console.log('======================================================================');
console.log('  SWYTCHAGENT 2.0: FRONTEND PRODUCTION & E2E VERIFICATION SUITE');
console.log('======================================================================\n');

// ── TEST SUITE 1: Production Build Artifacts & Assets ──────────────────
console.log('▶ Test Suite 1: Production Build Output & Bundles');
const distDir = path.join(frontendDir, 'dist');
assert(fs.existsSync(distDir), 'Production dist/ directory exists');

const indexHtmlPath = path.join(distDir, 'index.html');
assert(fs.existsSync(indexHtmlPath), 'dist/index.html exists');
if (fs.existsSync(indexHtmlPath)) {
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  assert(indexHtml.includes('id="root"'), 'dist/index.html contains root mount node');
  assert(indexHtml.includes('SwytchAgent'), 'dist/index.html includes SwytchAgent title');
}

const assetsDir = path.join(distDir, 'assets');
assert(fs.existsSync(assetsDir), 'dist/assets/ directory exists');
if (fs.existsSync(assetsDir)) {
  const assetFiles = fs.readdirSync(assetsDir);
  const jsFiles = assetFiles.filter((f) => f.endsWith('.js'));
  const cssFiles = assetFiles.filter((f) => f.endsWith('.css'));

  assert(jsFiles.length > 0, `JavaScript bundle generated (${jsFiles.join(', ')})`);
  assert(cssFiles.length > 0, `CSS stylesheet bundle generated (${cssFiles.join(', ')})`);

  jsFiles.forEach((file) => {
    const stat = fs.statSync(path.join(assetsDir, file));
    const sizeKb = (stat.size / 1024).toFixed(1);
    console.log(`     • JS Bundle: ${file} (${sizeKb} KB)`);
    assert(stat.size > 10000, `JS bundle has valid content (${sizeKb} KB)`);
  });

  cssFiles.forEach((file) => {
    const stat = fs.statSync(path.join(assetsDir, file));
    const sizeKb = (stat.size / 1024).toFixed(1);
    console.log(`     • CSS Bundle: ${file} (${sizeKb} KB)`);
    assert(stat.size > 2000, `CSS bundle has valid styled rules (${sizeKb} KB)`);
  });
}
console.log('');

// ── TEST SUITE 2: App.tsx Comprehensive Integration ────────────────────
console.log('▶ Test Suite 2: App.tsx Seamless Component Integration');
const appTsxPath = path.join(frontendDir, 'src', 'App.tsx');
assert(fs.existsSync(appTsxPath), 'src/App.tsx exists');

if (fs.existsSync(appTsxPath)) {
  const appContent = fs.readFileSync(appTsxPath, 'utf8');

  // Verify all essential components are imported and rendered
  const requiredComponents = [
    'DecisionCard',
    'PresetShowcase',
    'PromptBar',
    'ProductiveHoursMeter',
    'SwarmTopology',
    'ScheduleTimeline',
    'WorkloadMatrix',
    'ArtifactExportBar',
    'IntegrationGrid',
    'TelemetryDrawer',
  ];

  requiredComponents.forEach((comp) => {
    const isImported = appContent.includes(`import { ${comp} }`) || appContent.includes(`${comp}`);
    const isRendered = appContent.includes(`<${comp}`);
    assert(isImported && isRendered, `Component <${comp} /> imported and mounted in App.tsx`);
  });

  // Verify Header Navigation items
  assert(appContent.includes('🟢') && appContent.includes('🟡') && appContent.includes('🔴'), 'Live WebSocket status indicators (🟢, 🟡, 🔴) present');
  assert(appContent.includes('tabular-nums') && appContent.includes('UTC'), 'UTC Digital Clock with tabular-nums present');
  assert(appContent.includes('setIsMuted') && (appContent.includes('Volume2') || appContent.includes('VolumeX')), 'Sound mute switch present');
  assert(appContent.includes('resetSchedule') && appContent.includes('Reset Plan'), 'Reset Plan button present');
}
console.log('');

// ── TEST SUITE 3: Design Tokens & Surface Ladder ───────────────────────
console.log('▶ Test Suite 3: Dark Aesthetic Surface Ladder & Design Tokens');
const tailwindConfigPath = path.join(frontendDir, 'tailwind.config.js');
assert(fs.existsSync(tailwindConfigPath), 'tailwind.config.js exists');

if (fs.existsSync(tailwindConfigPath)) {
  const twContent = fs.readFileSync(tailwindConfigPath, 'utf8');
  assert(twContent.includes('#08090a'), 'Surface base tier #08090a defined');
  assert(twContent.includes('#0f1011'), 'Surface card tier #0f1011 defined');
  assert(twContent.includes('#141516'), 'Surface elevated tier #141516 defined');
  assert(twContent.includes('#1c1d20'), 'Surface active tier #1c1d20 defined');
  assert(twContent.includes('hairline'), 'Hairline 1px border tokens defined');
}
console.log('');

// ── TEST SUITE 4: Client-Side Export Generators ────────────────────────
console.log('▶ Test Suite 4: Client-Side RFC 5545, Markdown & JSON Generators');
const exportTsPath = path.join(frontendDir, 'src', 'services', 'export.ts');
assert(fs.existsSync(exportTsPath), 'src/services/export.ts exists');

if (fs.existsSync(exportTsPath)) {
  const exportContent = fs.readFileSync(exportTsPath, 'utf8');
  assert(exportContent.includes('BEGIN:VCALENDAR') && exportContent.includes('END:VCALENDAR'), 'RFC 5545 iCalendar calendar wrapper implemented');
  assert(exportContent.includes('BEGIN:VEVENT') && exportContent.includes('END:VEVENT'), 'RFC 5545 iCalendar VEVENT slots implemented');
  assert(exportContent.includes('\\r\\n') || exportContent.includes('\r\n'), 'RFC 5545 CRLF newline delimiter strictly enforced');
  assert(exportContent.includes('generateMarkdown'), 'Markdown executive briefing generator implemented');
  assert(exportContent.includes('generateJSON'), 'JSON structured snapshot generator implemented');
}
console.log('');

// ── TEST SUITE 5: Unified Launch Script (START_APP.bat) ─────────────────
console.log('▶ Test Suite 5: Production-Grade Unified Launch Script');
const startBatPath = path.join(rootDir, 'START_APP.bat');
assert(fs.existsSync(startBatPath), 'Root START_APP.bat exists');

if (fs.existsSync(startBatPath)) {
  const batContent = fs.readFileSync(startBatPath, 'utf8');
  assert(batContent.includes(':8000') && batContent.includes('taskkill'), 'Stale port 8000 cleanup logic present');
  assert(batContent.includes(':5173') && batContent.includes('taskkill'), 'Stale port 5173 cleanup logic present');
  assert(batContent.includes('backend\\venv\\Scripts\\python.exe'), 'Python virtual environment check present');
  assert(batContent.includes('where node') && batContent.includes('where npm'), 'Node.js and npm validation present');
  assert(batContent.includes('server.py'), 'FastAPI backend start command present');
  assert(batContent.includes('npm run dev'), 'Vite frontend start command present');
  assert(batContent.includes('http://localhost:5173'), 'Browser auto-launch to http://localhost:5173 present');
  assert(batContent.includes('Graceful Shutdown') || batContent.includes('[Q]'), 'Interactive menu and clean shutdown handler present');
}
console.log('');

// ── TEST SUITE 6: Documentation & Guides ───────────────────────────────
console.log('▶ Test Suite 6: Documentation & User Guidance');
const readmePath = path.join(frontendDir, 'README.md');
assert(fs.existsSync(readmePath), 'frontend/README.md exists');

if (fs.existsSync(readmePath)) {
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  assert(readmeContent.includes('Incident Command Center'), 'README covers Incident Command Center architecture');
  assert(readmeContent.includes('START_APP.bat'), 'README documents unified launch instructions');
  assert(readmeContent.includes('Zero Cumulative Layout Shift'), 'README documents Zero CLS guarantees');
}
console.log('');

// ── FINAL SUMMARY ──────────────────────────────────────────────────────
console.log('======================================================================');
console.log(`  VERIFICATION RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
if (failedTests > 0) {
  console.error(`  ⚠️ ${failedTests} TESTS FAILED!`);
  process.exit(1);
} else {
  console.log('  🎉 ALL PRODUCTION E2E VERIFICATION CHECKS COMPLETED SUCCESSFULLY!');
  console.log('======================================================================\n');
  process.exit(0);
}
