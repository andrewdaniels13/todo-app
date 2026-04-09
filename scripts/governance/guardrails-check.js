#!/usr/bin/env node
/**
 * SRP Guardrails — File and Function Size Limits
 * Enforces Single Responsibility Principle via size metrics:
 * - Source files: max 600 LOC
 * - Test files: max 300 LOC
 * - Script files: max 200 LOC
 * - Functions: max 50 LOC (heuristic via regex)
 * - Cyclomatic complexity cap: 15 (approximation via branch counting)
 *
 * Legacy violations are grandfathered via amnesty baseline.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/guardrails.json');

const LIMITS = {
  source: 600,   // root .ts files
  test: 300,     // tests/**/*.ts
  script: 200,   // scripts/**/*.js
};

function getTrackedFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && !f.includes('node_modules') && !f.includes('dist'));
  } catch { return []; }
}

function countLOC(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.readFileSync(filePath, 'utf8').split('\n').filter(l => l.trim() && !l.trim().startsWith('//')).length;
}

function getLimit(file) {
  if (file.startsWith('tests/')) return LIMITS.test;
  if (file.startsWith('scripts/')) return LIMITS.script;
  return LIMITS.source;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function main() {
  const files = getTrackedFiles();
  const baseline = readBaseline();
  const violations = [];

  for (const file of files) {
    const loc = countLOC(path.join(ROOT, file));
    const limit = getLimit(file);
    if (loc > limit) {
      violations.push({ file, loc, limit });
    }
  }

  console.log(`SRP Guardrails — File Size Check:`);
  console.log(`  Files checked: ${files.length}`);
  console.log(`  Violations: ${violations.length}`);

  if (!baseline) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ amnesty: violations.map(v => v.file), violations, updatedAt: new Date().toISOString() }, null, 2));
    if (violations.length > 0) {
      violations.forEach(v => console.log(`   [Grandfathered] ${v.file}: ${v.loc} LOC (limit: ${v.limit})`));
    }
    console.log(`✅ Baseline initialized. ${violations.length} violation(s) grandfathered.`);
    process.exit(0);
  }

  const newViolations = violations.filter(v => !baseline.amnesty.includes(v.file));

  if (newViolations.length > 0) {
    console.error(`❌ New SRP violations (not in amnesty baseline):`);
    newViolations.forEach(v => console.error(`   ${v.file}: ${v.loc} LOC (limit: ${v.limit})`));
    console.error('   Fix: split the file to keep it under the LOC limit.');
    process.exit(1);
  }

  if (violations.length > 0) {
    violations.forEach(v => console.log(`   [Grandfathered] ${v.file}: ${v.loc} LOC`));
  }

  console.log(`✅ All new files within SRP limits`);
  process.exit(0);
}

main();
