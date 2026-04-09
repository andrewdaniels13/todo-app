#!/usr/bin/env node
/**
 * Governance Metrics Report
 * Reads .memory-layer/reports/governance-metrics.json and prints a Markdown summary.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_FILE = path.join(ROOT, '.memory-layer/reports/governance-metrics.json');

function statusIcon(value, limit, lowerIsBetter = true) {
  if (value === null || value === undefined) return '❓';
  if (lowerIsBetter) return value <= limit ? '✅' : '❌';
  return value >= limit ? '✅' : '❌';
}

function main() {
  if (!fs.existsSync(REPORT_FILE)) {
    console.error('No metrics report found. Run: node scripts/governance/collect-metrics.js first.');
    process.exit(1);
  }

  const m = JSON.parse(fs.readFileSync(REPORT_FILE, 'utf8'));

  const report = `# Governance Metrics Report

**Generated:** ${new Date(m.collectedAt).toLocaleString()}
**SHA:** ${m.sha}

## Iron Dome Ratchet

| Metric | Count | Status |
|--------|-------|--------|
| \`any\` usages | ${m.ironDome.anyUsage} | ${statusIcon(m.ironDome.anyUsage, 0)} |
| Silent catches | ${m.ironDome.silentCatches} | ${statusIcon(m.ironDome.silentCatches, 0)} |
| \`eslint-disable\` | ${m.ironDome.eslintDisable} | ${statusIcon(m.ironDome.eslintDisable, 0)} |

## Rising Tide (Mock Tax)

| Metric | Value | Status |
|--------|-------|--------|
| Source LOC | ${m.risingTide.sourceLOC} | — |
| Test LOC | ${m.risingTide.testLOC} | — |
| Ratio | ${m.risingTide.ratio}x | ${statusIcon(m.risingTide.ratio, 2.0)} |

## Code Health

| Metric | Count | Status |
|--------|-------|--------|
| Orphan files | ${m.codeHealth.orphans} | ${statusIcon(m.codeHealth.orphans, 0)} |
| Circular deps | ${m.codeHealth.circularDeps} | ${statusIcon(m.codeHealth.circularDeps, 0)} |
| Duplicate groups | ${m.codeHealth.duplicateGroups} | ${statusIcon(m.codeHealth.duplicateGroups, 5)} |

## Coverage

| Metric | Value | Status |
|--------|-------|--------|
| Global line coverage | ${m.coverage.globalPct ?? 'N/A'}% | ${m.coverage.globalPct !== null ? statusIcon(m.coverage.globalPct, 70, false) : '❓'} |

## File Count

| Type | Count |
|------|-------|
| Source files | ${m.fileCount.source} |
| Test files | ${m.fileCount.test} |
`;

  console.log(report);

  // Also write to file
  const reportMd = path.join(ROOT, '.memory-layer/reports/governance-report.md');
  fs.writeFileSync(reportMd, report);
  console.log(`Report written to ${path.relative(ROOT, reportMd)}`);
  process.exit(0);
}

main();
