#!/usr/bin/env node
/**
 * Perception Check — Behavioral Test Pairing
 * Perception-critical modules (those with user-facing output or CLI behavior)
 * should have behavioral tests in tests/behavioral/.
 *
 * Amnesty: existing modules without behavioral tests are grandfathered.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/behavioral-pairing.json');

// Modules considered perception-critical (user-facing output)
const PERCEPTION_CRITICAL = ['todo.ts', 'index.ts'];

function getBehavioralTestContent() {
  const dir = path.join(ROOT, 'tests/behavioral');
  if (!fs.existsSync(dir)) return '';
  try {
    const files = execSync('git ls-files --cached tests/behavioral/', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(Boolean);
    return files.map(f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '').join('\n');
  } catch { return ''; }
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function writeBaseline(unpaired) {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ amnesty: unpaired, updatedAt: new Date().toISOString() }, null, 2));
}

function main() {
  const behavContent = getBehavioralTestContent();
  const baseline = readBaseline();

  const unpaired = PERCEPTION_CRITICAL.filter(f => {
    const moduleName = path.basename(f, '.ts');
    return !behavContent.includes(moduleName);
  });

  console.log(`Perception Check — Behavioral Pairing:`);
  console.log(`  Perception-critical modules: ${PERCEPTION_CRITICAL.length}`);
  console.log(`  Unpaired: ${unpaired.length}`);

  if (!baseline) {
    writeBaseline(unpaired);
    console.log(`✅ Baseline initialized. Grandfathered ${unpaired.length} unpaired: ${unpaired.join(', ') || 'none'}`);
    process.exit(0);
  }

  const newUnpaired = unpaired.filter(f => !baseline.amnesty.includes(f));

  if (newUnpaired.length > 0) {
    console.error(`❌ New perception-critical files without behavioral tests:`);
    newUnpaired.forEach(f => console.error(`   ${f}`));
    console.error('   Fix: add behavioral tests in tests/behavioral/');
    process.exit(1);
  }

  console.log(`✅ No new perception-critical modules missing behavioral tests`);
  if (unpaired.length > 0) console.log(`   (${unpaired.length} grandfathered: ${unpaired.join(', ')})`);
  process.exit(0);
}

main();
