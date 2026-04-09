#!/usr/bin/env node
/**
 * Gatekeeper Protocol — Security Critical Review Gate
 * Functions/methods marked @security-critical require human review before merge.
 * Blocks automated merge if any @security-critical function was modified.
 *
 * Mark critical functions with: // @security-critical
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const SECURITY_TAG = '@security-critical';

function getChangedFiles() {
  try {
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => (f.endsWith('.ts') || f.endsWith('.js')) && f);
    return staged;
  } catch { return []; }
}

function containsSecurityCritical(filePath) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, 'utf8').includes(SECURITY_TAG);
}

function wasSecurityCriticalModified(file) {
  try {
    const diff = execSync(`git diff --cached ${file}`, { encoding: 'utf8', cwd: ROOT });
    // Check if the diff touches lines near @security-critical annotations
    return diff.includes(SECURITY_TAG) || containsSecurityCritical(path.join(ROOT, file));
  } catch { return false; }
}

function main() {
  const changedFiles = getChangedFiles();
  console.log(`Gatekeeper — Security Critical Review:`);

  if (changedFiles.length === 0) {
    console.log('✅ No staged TypeScript/JavaScript changes');
    process.exit(0);
  }

  const criticalFiles = changedFiles.filter(f => wasSecurityCriticalModified(f));

  if (criticalFiles.length > 0) {
    console.error(`❌ Security-critical code modified without human review:`);
    criticalFiles.forEach(f => console.error(`   ${f}`));
    console.error('\n   These files contain @security-critical annotations.');
    console.error('   REQUIRED: Human review before merging.');
    console.error('   Add a PR review from a maintainer before proceeding.');
    process.exit(1);
  }

  console.log(`✅ No security-critical code modified`);
  process.exit(0);
}

main();
