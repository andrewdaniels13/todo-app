#!/usr/bin/env node
/**
 * Dependency Health — Circular Import Detection
 * Detects circular import cycles in TypeScript source files.
 * Uses static analysis (does not require runtime execution).
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, '.memory-layer/baselines/circular-deps.json');
const EXCLUDE = /node_modules|dist|coverage|\.d\.ts/;

function getSourceFiles() {
  try {
    return execSync('git ls-files --cached *.ts scripts/**/*.ts', { encoding: 'utf8', cwd: ROOT })
      .trim().split('\n').filter(f => f && !EXCLUDE.test(f));
  } catch { return []; }
}

function extractImports(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const importPattern = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
  const imports = [];
  let match;
  while ((match = importPattern.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function resolveImport(fromFile, importPath) {
  const dir = path.dirname(fromFile);
  let resolved = path.join(dir, importPath);
  if (!path.extname(resolved)) resolved += '.ts';
  return resolved;
}

function detectCycles(files) {
  // Build adjacency map
  const graph = new Map();
  for (const file of files) {
    const absFile = path.join(ROOT, file);
    const imports = extractImports(absFile).map(imp => resolveImport(absFile, imp));
    graph.set(absFile, imports.filter(f => files.some(sf => path.join(ROOT, sf) === f)));
  }

  const cycles = [];
  const visited = new Set();
  const stack = new Set();

  function dfs(node, pathSoFar) {
    if (stack.has(node)) {
      const cycleStart = pathSoFar.indexOf(node);
      cycles.push(pathSoFar.slice(cycleStart).map(f => path.relative(ROOT, f)).join(' → '));
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    for (const neighbor of (graph.get(node) || [])) {
      dfs(neighbor, [...pathSoFar, node]);
    }
    stack.delete(node);
  }

  for (const file of files) {
    dfs(path.join(ROOT, file), []);
  }

  return [...new Set(cycles)];
}

function readBaseline() {
  if (!fs.existsSync(BASELINE_FILE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch { return null; }
}

function main() {
  const files = getSourceFiles();
  const cycles = detectCycles(files);
  const baseline = readBaseline();

  console.log(`Dependency Health — Circular Imports: ${cycles.length} cycle(s)`);

  if (!baseline) {
    fs.mkdirSync(path.dirname(BASELINE_FILE), { recursive: true });
    fs.writeFileSync(BASELINE_FILE, JSON.stringify({ count: cycles.length, cycles, updatedAt: new Date().toISOString() }, null, 2));
    console.log(`✅ Baseline initialized: ${cycles.length} cycle(s) grandfathered`);
    process.exit(0);
  }

  if (cycles.length > baseline.count) {
    console.error(`❌ New circular dependency introduced (${baseline.count} → ${cycles.length})`);
    cycles.forEach(c => console.error(`   Cycle: ${c}`));
    process.exit(1);
  }

  if (cycles.length > 0) {
    cycles.forEach(c => console.log(`   [Grandfathered] ${c}`));
  }

  console.log(`✅ No new circular dependencies (${cycles.length}/${baseline.count})`);
  process.exit(0);
}

main();
