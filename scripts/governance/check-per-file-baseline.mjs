#!/usr/bin/env node
/**
 * Coverage Fortress — Per-File Coverage Ratchet
 * Reads the Jest coverage JSON report and enforces:
 * - Global minimum: 70%
 * - New files: 80% floor
 * - Existing files: cannot regress beyond ±0.2% tolerance
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const COVERAGE_JSON = path.join(ROOT, 'coverage/coverage-summary.json');
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/coverage-per-file.json');

const GLOBAL_MIN = 70;
const NEW_FILE_FLOOR = 80;
const REGRESSION_TOLERANCE = 0.2;

function readCoverageSummary() {
  if (!fs.existsSync(COVERAGE_JSON)) {
    console.error(`❌ No coverage report found at ${COVERAGE_JSON}`);
    console.error('   Run: npm run test:coverage first');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(COVERAGE_JSON, 'utf8'));
}

function getLineCoverage(entry) {
  return entry.lines?.pct ?? 0;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function writeBaseline(data) {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2));
}

function main() {
  const summary = readCoverageSummary();
  const total = summary.total;
  const globalPct = getLineCoverage(total);

  console.log(`Coverage Fortress — Per-File Ratchet:`);
  console.log(`  Global line coverage: ${globalPct}% (min: ${GLOBAL_MIN}%)`);

  if (globalPct < GLOBAL_MIN) {
    console.error(`❌ Global coverage below minimum: ${globalPct}% < ${GLOBAL_MIN}%`);
    process.exit(1);
  }

  const fileEntries = Object.entries(summary).filter(([k]) => k !== 'total');
  const baseline = readBaseline();

  if (!baseline) {
    const initial = {};
    for (const [file, entry] of fileEntries) {
      initial[file] = getLineCoverage(entry);
    }
    writeBaseline({ files: initial, global: globalPct });
    console.log(`✅ Baseline initialized for ${fileEntries.length} files`);
    process.exit(0);
  }

  let regressions = 0;
  const updated = { ...baseline.files };

  for (const [file, entry] of fileEntries) {
    const current = getLineCoverage(entry);
    const prev = baseline.files[file];
    const relFile = path.relative(ROOT, file);

    if (prev === undefined) {
      // New file
      if (current < NEW_FILE_FLOOR) {
        console.error(`❌ New file below ${NEW_FILE_FLOOR}% floor: ${relFile} = ${current}%`);
        regressions++;
      } else {
        console.log(`  [NEW] ${relFile}: ${current}% ✓`);
        updated[file] = current;
      }
    } else {
      const delta = current - prev;
      if (delta < -REGRESSION_TOLERANCE) {
        console.error(`❌ Coverage regressed: ${relFile}: ${prev}% → ${current}% (-${Math.abs(delta).toFixed(1)}%)`);
        regressions++;
      } else if (current > prev) {
        updated[file] = current; // ratchet up
      }
    }
  }

  if (regressions > 0) {
    console.error(`\n${regressions} coverage regression(s). Fix before committing.`);
    process.exit(1);
  }

  writeBaseline({ files: updated, global: globalPct });
  console.log(`✅ Coverage ratchet passed (${fileEntries.length} files, global: ${globalPct}%)`);
  process.exit(0);
}

main();
