#!/usr/bin/env node
/**
 * UC18: Structural Governance Script
 *
 * Enforces rules defined in docs/mault.yaml under the top-level `rules` key.
 * Checks TypeScript source and test files for forbidden patterns.
 *
 * Exit 0 = all rules pass
 * Exit 1 = violations found
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();

// Rules mirroring docs/mault.yaml rules section
const RULES = [
  {
    id: 'TEST-001',
    name: 'No Focused Tests',
    severity: 'error',
    glob: '**/*.test.ts',
    pattern: /(\bdescribe|\bit|\btest)\.only\b/,
    message: 'Remove .only() before committing',
  },
  {
    id: 'TEST-002',
    name: 'No Skipped Tests',
    severity: 'error',
    glob: '**/*.test.ts',
    pattern: /(\bdescribe|\bit|\btest)\.skip\b/,
    message: 'Do not commit skipped tests',
  },
  {
    id: 'SRC-002',
    name: 'No hardcoded secrets',
    severity: 'error',
    glob: '**/*.ts',
    pattern: /(password|secret|token|apiKey)\s*=\s*['"][^'"]{8,}/i,
    message: 'Do not hardcode secrets — use environment variables',
    exclude: /node_modules|dist|coverage/,
  },
];

function getTrackedFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard', {
      encoding: 'utf8',
      cwd: ROOT,
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return [];
  }
}

function matchesGlob(file, glob) {
  // Simple glob: support **/*.test.ts and **/*.ts patterns
  const pattern = glob
    .replace(/\./g, '\\.')
    .replace(/\*\*\//g, '(.+/)?')
    .replace(/\*/g, '[^/]*');
  return new RegExp(`^${pattern}$`).test(file);
}

function main() {
  console.log('══════════════════════════════════════════');
  console.log('  Structural Governance Check (UC18)');
  console.log('══════════════════════════════════════════');

  const files = getTrackedFiles();
  let violations = 0;

  for (const rule of RULES) {
    const matchingFiles = files.filter(
      (f) => matchesGlob(f, rule.glob) && (!rule.exclude || !rule.exclude.test(f))
    );

    for (const file of matchingFiles) {
      const filePath = path.join(ROOT, file);
      if (!fs.existsSync(filePath)) continue;

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, i) => {
        if (rule.pattern.test(line)) {
          violations++;
          console.error(
            `[${rule.severity.toUpperCase()}] ${rule.id} ${rule.name}`
          );
          console.error(`  ${file}:${i + 1}: ${line.trim()}`);
          console.error(`  → ${rule.message}`);
        }
      });
    }
  }

  if (violations === 0) {
    console.log('✅ All structural governance checks pass');
    process.exit(0);
  } else {
    console.error(`\n❌ ${violations} governance violation(s) found`);
    process.exit(1);
  }
}

main();
