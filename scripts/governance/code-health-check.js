#!/usr/bin/env node
/**
 * Code Health — Orphan File + Dead Export Detection
 * Detects TypeScript files that are not imported by anything in the project.
 * Uses static import analysis (no runtime execution required).
 *
 * Amnesty: existing orphans are grandfathered at baseline.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/code-health.json');

// Files that are entry points (not imported by others — expected to be "orphans")
const ENTRY_POINTS = new Set(['index.ts', 'jest.config.ts', 'env.ts', 'eslint.config.js']);

function getSourceFiles() {
  try {
    return execSync('git ls-files --cached *.ts', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f && !f.includes('tests/') && !ENTRY_POINTS.has(f));
  } catch { return []; }
}

function getAllFiles() {
  try {
    return execSync('git ls-files --cached', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  } catch { return []; }
}

function getImportedModules(files) {
  const imported = new Set();
  const importPattern = /from\s+['"](\.[^'"]+)['"]/g;

  for (const file of files) {
    const fp = path.join(ROOT, file);
    if (!fs.existsSync(fp)) continue;
    const content = fs.readFileSync(fp, 'utf8');
    let match;
    while ((match = importPattern.exec(content)) !== null) {
      const resolved = path.relative(ROOT, path.resolve(path.dirname(fp), match[1]));
      imported.add(resolved);
      imported.add(resolved + '.ts');
      imported.add(resolved + '.js');
    }
  }
  return imported;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function main() {
  const sourceFiles = getSourceFiles();
  const allFiles = getAllFiles();
  const imported = getImportedModules(allFiles);

  const orphans = sourceFiles.filter(f => !imported.has(f) && !imported.has(f.replace(/\.ts$/, '')));
  const baseline = readBaseline();

  console.log(`Code Health — Orphan Detection:`);
  console.log(`  Source modules: ${sourceFiles.length}`);
  console.log(`  Orphans: ${orphans.length}`);

  if (!baseline) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ amnesty: orphans, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`✅ Baseline initialized. ${orphans.length} orphan(s) grandfathered: ${orphans.join(', ') || 'none'}`);
    process.exit(0);
  }

  const newOrphans = orphans.filter(f => !baseline.amnesty.includes(f));

  if (newOrphans.length > 0) {
    console.error(`❌ New orphaned files detected (not imported anywhere):`);
    newOrphans.forEach(f => console.error(`   ${f}`));
    console.error('   Fix: import this file somewhere or delete it.');
    process.exit(1);
  }

  if (orphans.length > 0) orphans.forEach(f => console.log(`   [Grandfathered] ${f}`));
  console.log(`✅ No new orphan files`);
  process.exit(0);
}

main();
