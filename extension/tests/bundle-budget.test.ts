import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Bundle Size & Distribution Asset Integrity', () => {
  const distDir = path.resolve(__dirname, '../dist');

  function scanDir(dir: string): { relativePath: string; bytes: number }[] {
    const results: { relativePath: string; bytes: number }[] = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...scanDir(full));
      } else {
        results.push({
          relativePath: path.relative(distDir, full).replace(/\\/g, '/'),
          bytes: fs.statSync(full).size,
        });
      }
    }
    return results;
  }

  it('dist directory contains all essential MV3 surfaces', () => {
    expect(fs.existsSync(distDir)).toBe(true);

    const essentialFiles = [
      'manifest.json',
      'background.js',
      'popup.html',
      'popup.js',
      'popup.css',
      'sidepanel.html',
      'sidepanel.js',
      'sidepanel.css',
      'content.js',
      'theme.css',
      'icons/icon-16.png',
      'icons/icon-32.png',
      'icons/icon-48.png',
      'icons/icon-128.png',
    ];

    for (const file of essentialFiles) {
      const fullPath = path.join(distDir, file);
      expect(fs.existsSync(fullPath), `Expected ${file} to exist in dist/`).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(0);
    }
  });

  it('total uncompressed dist size is under 500 KB hard budget', () => {
    const files = scanDir(distDir);
    const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
    const totalKb = totalBytes / 1024;

    const HARD_BUDGET_KB = 500;
    expect(totalKb).toBeLessThan(HARD_BUDGET_KB);

    // Also assert it satisfies the tight target budget (< 150 KB for feature-complete companion)
    const TARGET_BUDGET_KB = 150;
    expect(totalKb).toBeLessThan(TARGET_BUDGET_KB);
  });

  it('bundles do not contain forbidden eval or unsafe scripts', () => {
    const jsFiles = ['background.js', 'popup.js', 'sidepanel.js', 'content.js'];
    for (const jsFile of jsFiles) {
      const content = fs.readFileSync(path.join(distDir, jsFile), 'utf8');
      expect(content).not.toMatch(/\beval\(/);
      expect(content).not.toMatch(/new\s+Function\(/);
    }
  });
});
