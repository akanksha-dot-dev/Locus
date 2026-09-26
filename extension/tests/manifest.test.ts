import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Manifest V3 Compliance & Schema Validation', () => {
  const manifestPath = path.resolve(__dirname, '../public/manifest.json');
  const distManifestPath = path.resolve(__dirname, '../dist/manifest.json');

  it('public/manifest.json exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    expect(manifest).toBeDefined();
  });

  it('adheres strictly to Manifest V3 specification', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    // MV3 core
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('Locus Day Planner');
    expect(manifest.version).toBeDefined();

    // Permissions
    expect(manifest.permissions).toContain('storage');
    expect(manifest.permissions).toContain('sidePanel');
    expect(manifest.permissions).toContain('alarms');

    // Host permissions for backend
    expect(manifest.host_permissions).toContain('http://localhost:8000/*');

    // Background service worker
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBe('background.js');
    expect(manifest.background.type).toBe('module');

    // Action popup
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toBe('popup.html');

    // Side panel API
    expect(manifest.side_panel).toBeDefined();
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');

    // Content scripts matching Jira & GitHub
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    const cs = manifest.content_scripts[0];
    expect(cs.matches).toContain('*://*.atlassian.net/*');
    expect(cs.matches).toContain('*://github.com/*');
    expect(cs.js).toContain('content.js');
  });

  it('all referenced icon assets exist on disk in public/icons', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const icons = manifest.icons;
    expect(icons).toBeDefined();

    for (const [size, iconRelPath] of Object.entries(icons)) {
      const fullPath = path.resolve(__dirname, '../public', iconRelPath as string);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('dist/manifest.json matches public/manifest.json after build', () => {
    if (fs.existsSync(distManifestPath)) {
      const publicManifest = fs.readFileSync(manifestPath, 'utf8');
      const distManifest = fs.readFileSync(distManifestPath, 'utf8');
      expect(JSON.parse(distManifest)).toEqual(JSON.parse(publicManifest));
    }
  });
});
