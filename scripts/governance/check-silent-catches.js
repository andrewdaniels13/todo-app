#!/usr/bin/env node
/**
 * Iron Dome Ratchet — Silent Catches
 * Counts empty or trivial catch blocks { } in TypeScript/JavaScript.
 * Current count must not exceed the saved baseline.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/silent-catches.json');
const EXCLUDE = /node_modules|dist|coverage|\.d\.ts/;

function getSourceFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !EXCLUDE.test(f));
  } catch { return []; }
}

function countSilentCatches(files) {
  let count = 0;
  // Match: catch(...) { } or catch(...) { // comment only }
  const silentPattern = /catch\s*\([^)]*\)\s*\{\s*(\/\/[^\n]*)?\s*\}/g;
  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    const matches = content.match(silentPattern);
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
  const current = countSilentCatches(files);
  const baseline = readBaseline();

  console.log(`Iron Dome — silent catches: ${current} found`);

  if (!baseline) {
    writeBaseline(current);
    console.log(`✅ Baseline initialized: ${current} silent catches`);
    process.exit(0);
  }

  if (current > baseline.count) {
    console.error(`❌ Silent catches increased: ${baseline.count} → ${current} (+${current - baseline.count})`);
    console.error('   Fix: add error handling inside the catch block.');
    process.exit(1);
  }

  if (current < baseline.count) {
    writeBaseline(current);
    console.log(`✅ Baseline improved: ${baseline.count} → ${current}`);
  } else {
    console.log(`✅ Within baseline (${current}/${baseline.count})`);
  }
  process.exit(0);
}

main();
