#!/usr/bin/env node
/**
 * Rising Tide — Mock Tax (2x Rule)
 * Test LOC must not exceed 2x source LOC.
 * If test LOC bloats, replace unit mocks with integration tests.
 *
 * Source: root-level *.ts files (excluding entry point and test config)
 * Tests: tests/unit/ + tests/integration/ (NOT tests/mocks/ — shared helpers)
 *
 * Flags:
 *   --update   Write/update the baseline (use after intentional changes)
 *   --init     Same as --update (alias for first-time setup)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const MOCK_TAX_LIMIT = 2.0;
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/mock-tax.json');

const SOURCE_EXCLUDE = /^(index|jest\.config)\.ts$/;
const TEST_EXCLUDE = /^tests\/mocks\//;
const UPDATE = process.argv.includes('--update') || process.argv.includes('--init');

function countLines(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, 'utf8').split('\n').length;
}

function getFiles(gitPattern) {
  try {
    return execSync(`git ls-files --cached ${gitPattern}`, { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(Boolean);
  } catch { return []; }
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
  const sourceFiles = getFiles('*.ts').filter(f => !SOURCE_EXCLUDE.test(path.basename(f)));
  const testFiles = getFiles('tests/**/*.ts').filter(f => !TEST_EXCLUDE.test(f));

  const sourceLOC = sourceFiles.reduce((sum, f) => sum + countLines(path.join(ROOT, f)), 0);
  const testLOC = testFiles.reduce((sum, f) => sum + countLines(path.join(ROOT, f)), 0);
  const ratio = sourceLOC > 0 ? testLOC / sourceLOC : 0;

  console.log('Rising Tide — Mock Tax:');
  console.log(`  Source LOC: ${sourceLOC} (${sourceFiles.length} files: ${sourceFiles.join(', ')})`);
  console.log(`  Test LOC:   ${testLOC} (${testFiles.length} files)`);
  console.log(`  Ratio:      ${ratio.toFixed(2)}x (limit: ${MOCK_TAX_LIMIT}x)`);

  if (ratio > MOCK_TAX_LIMIT) {
    console.error(`❌ Mock tax exceeded: ${ratio.toFixed(2)}x > ${MOCK_TAX_LIMIT}x`);
    console.error('   Fix: Delete bloated unit mocks. Write integration tests instead.');
    process.exit(1);
  }

  const baseline = readBaseline();
  const data = { sourceLOC, testLOC, ratio: parseFloat(ratio.toFixed(2)) };

  if (UPDATE || !baseline) {
    writeBaseline(data);
    console.log(`✅ ${baseline ? 'Baseline updated' : 'Baseline initialized'}: ${ratio.toFixed(2)}x`);
  } else {
    // Read-only check during normal pre-commit run
    console.log(`✅ Mock tax within limit (${ratio.toFixed(2)}x) [baseline: ${baseline.ratio}x]`);
  }
  process.exit(0);
}

main();
