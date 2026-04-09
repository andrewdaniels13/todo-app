#!/usr/bin/env node
/**
 * DRY Enforcement — Duplicate Code Detection
 * Detects copy-paste duplication using a line-hash approach.
 * Blocks if new duplication exceeds the amnesty baseline.
 *
 * Threshold: 6+ identical consecutive non-trivial lines = clone
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/duplicate-code.json');
const CLONE_WINDOW = 6; // consecutive lines to consider a clone
const EXCLUDE = /node_modules|dist|coverage|\.d\.ts/;

function getSourceFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !EXCLUDE.test(f));
  } catch { return []; }
}

function getSignificantLines(content) {
  return content.split('\n').map(l => l.trim())
    .filter(l => l.length > 5 && !l.startsWith('//') && !l.startsWith('*') && l !== '{' && l !== '}' && l !== '');
}

function hashWindow(lines, start) {
  return crypto.createHash('md5').update(lines.slice(start, start + CLONE_WINDOW).join('\n')).digest('hex');
}

function detectClones(files) {
  const hashMap = new Map(); // hash → [{file, line}]

  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const lines = getSignificantLines(fs.readFileSync(fp, 'utf8'));
    for (let i = 0; i <= lines.length - CLONE_WINDOW; i++) {
      const hash = hashWindow(lines, i);
      if (!hashMap.has(hash)) hashMap.set(hash, []);
      hashMap.get(hash).push({ file, line: i + 1 });
    }
  }

  return [...hashMap.values()].filter(locs => locs.length > 1);
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function main() {
  const files = getSourceFiles();
  const clones = detectClones(files);
  const baseline = readBaseline();

  console.log(`DRY Enforcement — Duplicate Code: ${clones.length} clone group(s) detected`);

  if (!baseline) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ count: clones.length, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`✅ Baseline initialized: ${clones.length} clone group(s) grandfathered`);
    process.exit(0);
  }

  if (clones.length > baseline.count) {
    console.error(`❌ New code duplication introduced: ${baseline.count} → ${clones.length} clone groups`);
    clones.slice(0, 5).forEach(g => console.error(`   Cloned in: ${g.map(l => l.file).join(', ')}`));
    process.exit(1);
  }

  if (clones.length < baseline.count) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ count: clones.length, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`✅ Duplication reduced: ${baseline.count} → ${clones.length} (baseline updated)`);
  } else {
    console.log(`✅ Within baseline (${clones.length}/${baseline.count})`);
  }
  process.exit(0);
}

main();
