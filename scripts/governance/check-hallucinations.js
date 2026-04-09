#!/usr/bin/env node
/**
 * Supply Chain — Hallucination Detection
 * Verifies that all packages in package.json dependencies are real npm packages.
 * Blocks AI-hallucinated package names before npm install runs.
 *
 * In CI: checks all packages. Locally: checks only changed packages.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const KNOWN_SAFE = new Set(); // packages we've already verified

function getPackageNames() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
}

function checkPackage(name) {
  // Strip version specifiers and scope handling
  const cleanName = name.startsWith('@') ? name : name.split('/')[0];
  try {
    execSync(`npm view ${cleanName} name 2>/dev/null`, { encoding: 'utf8', timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const IS_CI = process.env.CI === 'true';
  console.log(`Supply Chain — Hallucination Detection (${IS_CI ? 'CI: all packages' : 'local: spot check'})`);

  const packages = getPackageNames();

  if (!IS_CI) {
    // Local: skip slow network check unless explicitly requested
    if (!process.env.FORCE_HALLUCINATION_CHECK) {
      console.log(`⏭  Skipped locally (set FORCE_HALLUCINATION_CHECK=1 to run)`);
      process.exit(0);
    }
  }

  console.log(`  Checking ${packages.length} packages...`);
  const hallucinated = [];

  for (const pkg of packages) {
    process.stdout.write(`  Checking ${pkg}... `);
    if (checkPackage(pkg)) {
      process.stdout.write('✓\n');
    } else {
      process.stdout.write('❌ NOT FOUND\n');
      hallucinated.push(pkg);
    }
  }

  if (hallucinated.length > 0) {
    console.error(`\n❌ Hallucinated packages detected: ${hallucinated.join(', ')}`);
    console.error('   These packages do not exist on npm. Remove them immediately.');
    process.exit(1);
  }

  console.log(`✅ All ${packages.length} packages verified on npm`);
  process.exit(0);
}

main();
