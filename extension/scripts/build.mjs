// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSION_ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.resolve(EXTENSION_ROOT, 'dist');
const SRC_DIR = path.resolve(EXTENSION_ROOT, 'src');
const PUBLIC_DIR = path.resolve(EXTENSION_ROOT, 'public');

const HARD_BUDGET_BYTES = 500 * 1024; // 500 KB limit
const TARGET_BUDGET_BYTES = 100 * 1024; // 100 KB engineering target

/**
 * Windows-resilient directory cleaner.
 * If root directory deletion fails due to transient Windows file locks (EBUSY/EPERM),
 * falls back to deleting inner directory contents.
 * @param {string} dir
 */
function cleanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.warn(`[build] Notice: Direct rmSync on ${dir} encountered lock; emptying contents...`);
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const entryPath = path.join(dir, entry);
      fs.rmSync(entryPath, { recursive: true, force: true });
    }
  }
}

/**
 * Safely copy a file if source exists.
 * @param {string} src
 * @param {string} dest
 */
function copyFileSafe(src, dest) {
  if (fs.existsSync(src)) {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.copyFileSync(src, dest);
  }
}

/**
 * Safely copy a directory recursively if source exists.
 * @param {string} src
 * @param {string} dest
 */
function copyDirSafe(src, dest) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

/**
 * Recursively scans directory and collects file sizes.
 * @param {string} dir
 * @param {string} [baseDir]
 * @returns {Array<{ relativePath: string, bytes: number }>}
 */
function scanDistFiles(dir, baseDir = dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDistFiles(fullPath, baseDir));
    } else {
      const stats = fs.statSync(fullPath);
      results.push({
        relativePath: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
        bytes: stats.size,
      });
    }
  }
  return results;
}

/**
 * Main build pipeline orchestrator.
 */
async function buildExtension() {
  const startTime = Date.now();
  console.log('[build] Starting Locus Chrome Extension (MV3) compilation...');

  // 1. Clean output directory
  console.log('[build] Cleaning dist/...');
  cleanDirectory(DIST_DIR);

  // 2. Copy Static Assets
  console.log('[build] Copying static assets (manifest, icons, HTML, CSS)...');
  
  // Manifest
  const manifestSrc = path.join(PUBLIC_DIR, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    copyFileSafe(manifestSrc, path.join(DIST_DIR, 'manifest.json'));
  } else {
    console.warn(`[build] Warning: ${manifestSrc} does not exist yet.`);
  }

  // Icons
  const iconsSrc = path.join(PUBLIC_DIR, 'icons');
  if (fs.existsSync(iconsSrc)) {
    copyDirSafe(iconsSrc, path.join(DIST_DIR, 'icons'));
  }

  // HTML Entry Points
  const popupHtmlSrc = fs.existsSync(path.join(SRC_DIR, 'popup/popup.html'))
    ? path.join(SRC_DIR, 'popup/popup.html')
    : path.join(PUBLIC_DIR, 'popup.html');
  copyFileSafe(popupHtmlSrc, path.join(DIST_DIR, 'popup.html'));

  const sidepanelHtmlSrc = fs.existsSync(path.join(SRC_DIR, 'sidepanel/sidepanel.html'))
    ? path.join(SRC_DIR, 'sidepanel/sidepanel.html')
    : path.join(PUBLIC_DIR, 'sidepanel.html');
  copyFileSafe(sidepanelHtmlSrc, path.join(DIST_DIR, 'sidepanel.html'));

  // CSS Stylesheets (Minified with esbuild)
  const cssFiles = [
    { src: path.join(SRC_DIR, 'styles/theme.css'), dest: path.join(DIST_DIR, 'theme.css') },
    { src: path.join(SRC_DIR, 'popup/popup.css'), dest: path.join(DIST_DIR, 'popup.css') },
    { src: path.join(SRC_DIR, 'sidepanel/sidepanel.css'), dest: path.join(DIST_DIR, 'sidepanel.css') },
  ];
  for (const { src, dest } of cssFiles) {
    if (fs.existsSync(src)) {
      const rawCss = fs.readFileSync(src, 'utf8');
      const minified = esbuild.transformSync(rawCss, { loader: 'css', minify: true }).code;
      fs.writeFileSync(dest, minified, 'utf8');
    }
  }

  // 3. Compile Bundles with esbuild
  console.log('[build] Compiling TypeScript bundles with esbuild...');

  /** @type {import('esbuild').BuildOptions} */
  const commonOptions = {
    bundle: true,
    minify: true,
    target: ['chrome114'],
    platform: 'browser',
    sourcemap: false,
    legalComments: 'none',
    treeShaking: true,
    logLevel: 'warning',
  };

  const builds = [];

  // A. Background Service Worker (ESM, Chrome MV3 "type": "module")
  const bgEntry = path.join(SRC_DIR, 'background/service-worker.ts');
  if (fs.existsSync(bgEntry)) {
    builds.push(
      esbuild.build({
        ...commonOptions,
        entryPoints: [bgEntry],
        outfile: path.join(DIST_DIR, 'background.js'),
        format: 'esm',
      })
    );
  } else {
    console.warn(`[build] Warning: Entry point ${bgEntry} not found.`);
  }

  // B. Popup Script (ESM)
  const popupEntry = path.join(SRC_DIR, 'popup/popup.ts');
  if (fs.existsSync(popupEntry)) {
    builds.push(
      esbuild.build({
        ...commonOptions,
        entryPoints: [popupEntry],
        outfile: path.join(DIST_DIR, 'popup.js'),
        format: 'esm',
      })
    );
  } else {
    console.warn(`[build] Warning: Entry point ${popupEntry} not found.`);
  }

  // C. Side Panel Script (ESM)
  const sidepanelEntry = path.join(SRC_DIR, 'sidepanel/sidepanel.ts');
  if (fs.existsSync(sidepanelEntry)) {
    builds.push(
      esbuild.build({
        ...commonOptions,
        entryPoints: [sidepanelEntry],
        outfile: path.join(DIST_DIR, 'sidepanel.js'),
        format: 'esm',
      })
    );
  } else {
    console.warn(`[build] Warning: Entry point ${sidepanelEntry} not found.`);
  }

  // D. Content Script (Strictly IIFE, isolated world, zero external imports)
  const contentEntry = path.join(SRC_DIR, 'content/index.ts');
  if (fs.existsSync(contentEntry)) {
    builds.push(
      esbuild.build({
        ...commonOptions,
        entryPoints: [contentEntry],
        outfile: path.join(DIST_DIR, 'content.js'),
        format: 'iife',
        globalName: 'LocusContentScript',
      })
    );
  } else {
    console.warn(`[build] Warning: Entry point ${contentEntry} not found.`);
  }

  // Await all bundle tasks
  await Promise.all(builds);

  // 4. Measure & Validate Bundle Budget
  const files = scanDistFiles(DIST_DIR);
  let totalBytes = 0;

  console.log('\n================== LOCUS EXTENSION DIST AUDIT ==================');
  console.log(
    `${'Asset'.padEnd(35)} | ${'Size (Bytes)'.padStart(14)} | ${'Size (KB)'.padStart(10)}`
  );
  console.log('-'.repeat(65));

  for (const file of files.sort((a, b) => b.bytes - a.bytes)) {
    totalBytes += file.bytes;
    const kb = (file.bytes / 1024).toFixed(2);
    console.log(
      `${file.relativePath.padEnd(35)} | ${file.bytes.toString().padStart(14)} | ${(kb + ' KB').padStart(10)}`
    );
  }

  const totalKB = (totalBytes / 1024).toFixed(2);
  const budgetUsagePercent = ((totalBytes / HARD_BUDGET_BYTES) * 100).toFixed(1);
  console.log('-'.repeat(65));
  console.log(
    `${'TOTAL UNCOMPRESSED DIST'.padEnd(35)} | ${totalBytes.toString().padStart(14)} | ${(totalKB + ' KB').padStart(10)}`
  );
  console.log(`Hard Budget Limit: 500.00 KB (${budgetUsagePercent}% consumed)`);
  console.log(`Target Budget:     100.00 KB`);
  console.log('================================================================\n');

  // Hard Budget Assertion (< 500 KB)
  if (totalBytes >= HARD_BUDGET_BYTES) {
    console.error(
      `[build] ERROR: Total dist bundle size (${totalKB} KB) EXCEEDS hard limit of 500 KB!`
    );
    process.exit(1);
  }

  if (totalBytes > TARGET_BUDGET_BYTES) {
    console.warn(
      `[build] NOTICE: Total dist size (${totalKB} KB) exceeds the 100 KB engineering target, but satisfies the hard 500 KB budget.`
    );
  } else {
    console.log(
      `[build] SUCCESS: Total dist size (${totalKB} KB) is well within the 100 KB target.`
    );
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`[build] Compilation completed cleanly in ${elapsedMs}ms.\n`);
}

buildExtension().catch((err) => {
  console.error('[build] Unhandled build error:', err);
  process.exit(1);
});
