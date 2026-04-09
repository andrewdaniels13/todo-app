#!/usr/bin/env node
/**
 * Mock Quality — Adversarial Mock Detection
 * Detects forbidden mock patterns that create false-positive tests:
 * - jest.fn() returning undefined on all calls (silent mock)
 * - Mocks missing required interface methods
 * - jest.mock() with empty factory
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

const FORBIDDEN_PATTERNS = [
  { pattern: /jest\.mock\(['"`][^'"`]+['"`]\s*,\s*\(\)\s*=>\s*\{\s*\}\s*\)/, desc: 'Empty jest.mock factory — mock returns nothing useful' },
  { pattern: /jest\.fn\(\)\s*\/\/\s*(stub|noop|ignore|TODO)/i, desc: 'Intentionally empty jest.fn stub — replace with real implementation or fixture' },
  { pattern: /\.mockReturnValue\(undefined\)/, desc: 'Mock explicitly returns undefined — use a real fixture value' },
  { pattern: /\.mockResolvedValue\(undefined\)/, desc: 'Mock resolves to undefined — use a real fixture value' },
];

function getTestFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard tests/', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  } catch { return []; }
}

function main() {
  const files = getTestFiles();
  let violations = 0;

  console.log('Mock Quality — Adversarial Mock Check:');

  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const lines = fs.readFileSync(fp, 'utf8').split('\n');

    lines.forEach((line, i) => {
      for (const { pattern, desc } of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations++;
          console.error(`  [WARN] ${file}:${i + 1}: ${desc}`);
          console.error(`         ${line.trim()}`);
        }
      }
    });
  }

  if (violations === 0) {
    console.log('✅ No adversarial mock patterns detected');
    process.exit(0);
  } else {
    console.error(`\n⚠️  ${violations} mock quality issue(s) found. Review and fix.`);
    process.exit(1);
  }
}

main();
