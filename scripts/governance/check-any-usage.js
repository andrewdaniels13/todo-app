#!/usr/bin/env node
/**
 * Iron Dome Ratchet — Any Usage
 * Counts `: any` and `as any` in TypeScript source files.
 * Current count must not exceed the saved baseline.
 * Baseline can only go DOWN (quality ratchets toward zero).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/any-count.json');
const TS_GLOBS = ['*.ts'];
const EXCLUDE = /node_modules|dist|coverage|\.d\.ts|jest\.config/;

function getSourceFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f.endsWith('.ts') && !EXCLUDE.test(f) && !f.includes('tests/'));
  } catch { return []; }
}

function countAny(files) {
  let count = 0;
  const anyPattern = /:\s*any\b|as\s+any\b/g;
  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const matches = content.match(anyPattern);
    if (matches) count += matches.length;
  }
  return count;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function writeBaseline(count) {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ count, updatedAt: new Date().toISOString() }, null, 2));
}

function main() {
  const files = getSourceFiles();
  const current = countAny(files);
  const baseline = readBaseline();

  console.log(`Iron Dome — any usage: ${current} found`);

  if (!baseline) {
    writeBaseline(current);
    console.log(`✅ Baseline initialized: ${current} any usages`);
    process.exit(0);
  }

  if (current > baseline.count) {
    console.error(`❌ any count increased: ${baseline.count} → ${current} (+${current - baseline.count})`);
    console.error('   Fix: remove the new : any or as any and use proper types.');
    process.exit(1);
  }

  if (current < baseline.count) {
    writeBaseline(current);
    console.log(`✅ Baseline improved: ${baseline.count} → ${current} (ratcheted down)`);
  } else {
    console.log(`✅ Within baseline (${current}/${baseline.count})`);
  }
  process.exit(0);
}

main();
