#!/usr/bin/env node
/**
 * Test Impact Analysis (TIA) with CI Safety Latch
 *
 * Local: runs only tests related to changed files (fast feedback)
 * CI:    runs ALL tests (Safety Latch — no shortcuts)
 *
 * Usage:
 *   npm run test:tia              # Local: affected tests only
 *   CI=true npm run test:tia      # CI:    all tests (Safety Latch)
 */
const { execSync, spawn } = require('child_process');

const IS_CI = process.env.CI === 'true';

function getChangedFiles() {
  try {
    return execSync('git diff --name-only origin/main...HEAD', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    try {
      return execSync('git diff --name-only HEAD', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      })
        .trim()
        .split('\n')
        .filter(Boolean);
    } catch {
      return [];
    }
  }
}

function main() {
  console.log('══════════════════════════════════════════');
  console.log('  Test Impact Analysis (TIA)');
  console.log('══════════════════════════════════════════');

  if (IS_CI) {
    console.log('🔒 CI Safety Latch: running ALL tests');
    const child = spawn('npm', ['test'], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code || 0));
    return;
  }

  const changed = getChangedFiles().filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.includes('node_modules')
  );

  if (changed.length === 0) {
    console.log('✅ No source files changed — no tests to run');
    process.exit(0);
  }

  console.log(`🎯 TIA: running tests for ${changed.length} changed file(s)`);
  changed.forEach((f) => console.log(`   ${f}`));

  const child = spawn(
    'npx',
    ['jest', '--findRelatedTests', ...changed, '--passWithNoTests', '--forceExit'],
    { stdio: 'inherit', shell: true }
  );
  child.on('exit', (code) => process.exit(code || 0));
}

main();
