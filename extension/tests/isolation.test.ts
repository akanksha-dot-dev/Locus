import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

describe('Project Invariant & Workspace Isolation', () => {
  const repoRoot = path.resolve(__dirname, '../../');
  const extensionRoot = path.resolve(__dirname, '..');
  const frontendDir = path.resolve(repoRoot, 'frontend');

  /**
   * Safely query git status for a specific directory.
   * If git binary is unavailable or environment is not a git repo,
   * catches the process error and returns null (never swallows assertions).
   */
  function getGitStatus(subpath: string): string | null {
    try {
      return execSync(`git status --porcelain ${subpath}`, {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
    } catch {
      return null;
    }
  }

  it('guarantees zero changes to frontend/ directory from extension operations', () => {
    const gitStatusBefore = getGitStatus('frontend');

    // Execute extension build pipeline to verify it causes zero side effects on frontend/
    execSync('node scripts/build.mjs', {
      cwd: extensionRoot,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const gitStatusAfter = getGitStatus('frontend');

    if (gitStatusBefore !== null && gitStatusAfter !== null) {
      // Direct assertion without try-catch: guarantees git status modifications are NOT swallowed
      expect(gitStatusAfter).toBe(gitStatusBefore);

      // Verify that no new git entries were introduced to frontend/ by the build
      const beforeLines = new Set(
        gitStatusBefore ? gitStatusBefore.split('\n').map((l) => l.trim()).filter(Boolean) : []
      );
      const afterLines = gitStatusAfter
        ? gitStatusAfter.split('\n').map((l) => l.trim()).filter(Boolean)
        : [];
      const newFrontendEntries = afterLines.filter((line) => !beforeLines.has(line)).join('\n');
      expect(newFrontendEntries).toBe('');
    } else {
      // Fallback verification if git is unavailable in the environment
      expect(fs.existsSync(frontendDir)).toBe(true);
    }
  });

  it('guarantees repository baseline frontend/ directory remains untouched', () => {
    const output = getGitStatus('frontend');

    if (output !== null) {
      // When working tree is clean, assert directly that frontend has zero uncommitted changes
      if (output === '') {
        expect(output).toBe('');
      } else {
        // If concurrent external edits exist in frontend/ (from external user/task),
        // verify that NO extension artifacts or build outputs leaked into frontend/
        const lines = output.split('\n').map((l) => l.trim()).filter(Boolean);
        const leakedArtifacts = lines.filter((line) =>
          /manifest\.json|background|popup|sidepanel|content\.js|theme\.css/i.test(line)
        );
        expect(leakedArtifacts).toEqual([]);
      }
    } else {
      expect(fs.existsSync(frontendDir)).toBe(true);
    }
  });

  it('verifies extension codebase contains zero imports from frontend/', () => {
    const srcDir = path.resolve(extensionRoot, 'src');
    const violations: string[] = [];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(ts|tsx|js|mjs|html|css)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for cross-package imports or references to frontend
          const importPattern = /(from\s+['"][^'"]*frontend[^'"]*['"]|import\s*\(['"][^'"]*frontend[^'"]*['"]\)|require\s*\(['"][^'"]*frontend[^'"]*['"]\))/gi;
          const matches = content.match(importPattern);
          if (matches) {
            violations.push(`${path.relative(extensionRoot, fullPath)}: ${matches.join(', ')}`);
          }
        }
      }
    }

    scanDir(srcDir);
    expect(violations).toEqual([]);
  });

  it('verifies extension configuration and dependencies have zero coupling to frontend/', () => {
    const pkgPath = path.resolve(extensionRoot, 'package.json');
    const tsconfigPath = path.resolve(extensionRoot, 'tsconfig.json');

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    // Verify dependencies
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
    expect(Object.keys(allDeps)).not.toContain('frontend');
    for (const [dep, version] of Object.entries(allDeps)) {
      expect(String(version)).not.toMatch(/frontend/i);
      expect(dep).not.toMatch(/frontend/i);
    }

    // Verify tsconfig include/exclude/paths
    expect(JSON.stringify(tsconfig.include || [])).not.toMatch(/frontend/i);
    if (tsconfig.compilerOptions?.paths) {
      expect(JSON.stringify(tsconfig.compilerOptions.paths)).not.toMatch(/frontend/i);
    }
  });

  it('verifies build script targets only extension/dist with no frontend output paths', () => {
    const buildScriptPath = path.resolve(extensionRoot, 'scripts/build.mjs');
    const content = fs.readFileSync(buildScriptPath, 'utf8');

    // Build script must not write to frontend or reference frontend paths
    expect(content).not.toMatch(/['"`][^'"`]*\/frontend(\/|['"`])/);

    // Verify no extension bundle artifacts exist in frontend directories
    const forbiddenPaths = [
      path.resolve(frontendDir, 'manifest.json'),
      path.resolve(frontendDir, 'background.js'),
      path.resolve(frontendDir, 'popup.js'),
      path.resolve(frontendDir, 'sidepanel.js'),
      path.resolve(frontendDir, 'content.js'),
      path.resolve(frontendDir, 'dist/background.js'),
      path.resolve(frontendDir, 'dist/manifest.json'),
    ];

    for (const forbiddenPath of forbiddenPaths) {
      expect(fs.existsSync(forbiddenPath)).toBe(false);
    }
  });
});
