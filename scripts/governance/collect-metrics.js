#!/usr/bin/env node
/**
 * Governance Metrics Collection
 * Aggregates all governance metrics into a single JSON report.
 * Written to .memory-layer/reports/governance-metrics.json
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, '.memory-layer/reports');
const REPORT_FILE = path.join(REPORT_DIR, 'governance-metrics.json');
const BASELINE_DIR = path.join(ROOT, '.memory-layer/baselines');

function readBaseline(name) {
  const f = path.join(BASELINE_DIR, `${name}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; }
}

function countPattern(pattern, files) {
  let count = 0;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const m = content.match(pattern);
    if (m) count += m.length;
  }
  return count;
}

function getTrackedFiles(ext) {
  try {
    return execSync('git ls-files --cached', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => !ext || f.endsWith(ext))
      .filter(f => !f.includes('node_modules') && !f.includes('dist'))
      .map(f => path.join(ROOT, f));
  } catch { return []; }
}

function main() {
  console.log('Collecting governance metrics...');
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const tsFiles = getTrackedFiles('.ts');
  const testFiles = tsFiles.filter(f => f.includes('/tests/'));
  const sourceFiles = tsFiles.filter(f => !f.includes('/tests/') && !f.includes('/scripts/'));

  const metrics = {
    collectedAt: new Date().toISOString(),
    sha: (() => { try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8', cwd: ROOT }).trim(); } catch { return 'unknown'; } })(),
    ironDome: {
      anyUsage: readBaseline('any-count')?.count ?? 0,
      silentCatches: readBaseline('silent-catches')?.count ?? 0,
      eslintDisable: readBaseline('eslint-disable')?.count ?? 0,
    },
    risingTide: {
      sourceLOC: readBaseline('mock-tax')?.sourceLOC ?? 0,
      testLOC: readBaseline('mock-tax')?.testLOC ?? 0,
      ratio: readBaseline('mock-tax')?.ratio ?? 0,
    },
    codeHealth: {
      orphans: readBaseline('code-health')?.amnesty?.length ?? 0,
      circularDeps: readBaseline('circular-deps')?.count ?? 0,
      duplicateGroups: readBaseline('duplicate-code')?.count ?? 0,
    },
    coverage: {
      globalPct: readBaseline('coverage-per-file')?.global ?? null,
    },
    fileCount: {
      source: sourceFiles.length,
      test: testFiles.length,
    },
  };

  fs.writeFileSync(REPORT_FILE, JSON.stringify(metrics, null, 2));
  console.log(`✅ Metrics written to ${path.relative(ROOT, REPORT_FILE)}`);
  console.log(JSON.stringify(metrics, null, 2));
  process.exit(0);
}

main();
