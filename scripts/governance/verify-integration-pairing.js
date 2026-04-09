#!/usr/bin/env node
/**
 * Buddy System — Integration Test Pairing
 * Every source module must have at least one integration test that exercises it.
 * New source files without integration coverage are flagged.
 *
 * Amnesty: files existing before the baseline date are grandfathered.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/integration-pairing.json');

function getSourceModules() {
  const exclude = /^(index|jest\.config|env)\.ts$/;
  try {
    return execSync('git ls-files --cached *.ts', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f && !exclude.test(path.basename(f)));
  } catch { return []; }
}

function getIntegrationTestContent() {
  try {
    const files = execSync('git ls-files --cached tests/integration/', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(Boolean);
    return files.map(f => fs.existsSync(path.join(ROOT, f)) ? fs.readFileSync(path.join(ROOT, f), 'utf8') : '').join('\n');
  } catch { return ''; }
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function writeBaseline(unpaired) {
  fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
  fs.writeFileSync(BASELINE_FILE, JSON.stringify({ amnesty: unpaired, updatedAt: new Date().toISOString() }, null, 2));
}

function main() {
  const sources = getSourceModules();
  const integContent = getIntegrationTestContent();
  const baseline = readBaseline();

  const unpaired = sources.filter(f => {
    const moduleName = path.basename(f, '.ts');
    return !integContent.includes(moduleName) && !integContent.includes(`./${f}`) && !integContent.includes(`'../../${moduleName}'`);
  });

  console.log(`Buddy System — Integration Pairing:`);
  console.log(`  Source modules: ${sources.length}`);
  console.log(`  Unpaired: ${unpaired.length}`);

  if (!baseline) {
    writeBaseline(unpaired);
    console.log(`✅ Baseline initialized. Grandfathered ${unpaired.length} unpaired module(s): ${unpaired.join(', ') || 'none'}`);
    process.exit(0);
  }

  const newUnpaired = unpaired.filter(f => !baseline.amnesty.includes(f));

  if (newUnpaired.length > 0) {
    console.error(`❌ New source files without integration tests:`);
    newUnpaired.forEach(f => console.error(`   ${f}`));
    console.error('   Fix: add integration tests in tests/integration/');
    process.exit(1);
  }

  console.log(`✅ All new modules paired with integration tests`);
  if (unpaired.length > 0) console.log(`   (${unpaired.length} grandfathered: ${unpaired.join(', ')})`);
  process.exit(0);
}

main();
