#!/usr/bin/env node
/**
 * Test Discipline — Skipped Test Gate
 * Skipped tests (describe.skip / it.skip / test.skip / xdescribe / xit / xtest)
 * must not exceed 5% of total tests.
 * Zero tolerance for focused tests (.only).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const MAX_SKIP_RATIO = 0.05; // 5%

function getTestFiles() {
  try {
    return execSync('git ls-files --cached tests/', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f.endsWith('.test.ts') || f.endsWith('.test.js') || f.endsWith('.spec.ts'));
  } catch { return []; }
}

function analyzeTests(files) {
  let total = 0;
  let skipped = 0;
  let focused = 0;

  const itPattern = /^\s*(it|test|describe)\s*\(/gm;
  const skipPattern = /^\s*(it|test|describe|x(it|test|describe))\.(skip|todo)\s*\(|^\s*(xit|xtest|xdescribe)\s*\(/gm;
  const focusPattern = /^\s*(it|test|describe)\.(only)\s*\(/gm;

  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    total += (content.match(itPattern) || []).length;
    skipped += (content.match(skipPattern) || []).length;
    focused += (content.match(focusPattern) || []).length;
  }

  return { total, skipped, focused };
}

function main() {
  const files = getTestFiles();
  const { total, skipped, focused } = analyzeTests(files);
  const ratio = total > 0 ? skipped / total : 0;

  console.log(`Test Discipline — Skipped Tests:`);
  console.log(`  Total tests: ${total}`);
  console.log(`  Skipped: ${skipped} (${(ratio * 100).toFixed(1)}%, limit: ${(MAX_SKIP_RATIO * 100).toFixed(0)}%)`);
  console.log(`  Focused (.only): ${focused}`);

  if (focused > 0) {
    console.error(`❌ ${focused} focused test(s) found (.only). Remove before committing.`);
    process.exit(1);
  }

  if (ratio > MAX_SKIP_RATIO) {
    console.error(`❌ Too many skipped tests: ${(ratio * 100).toFixed(1)}% > ${(MAX_SKIP_RATIO * 100).toFixed(0)}%`);
    console.error(`   Fix: unskip or delete ${skipped} test(s).`);
    process.exit(1);
  }

  console.log(`✅ Test discipline OK`);
  process.exit(0);
}

main();
