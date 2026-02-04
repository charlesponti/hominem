#!/usr/bin/env bun

/**
 * Enhanced Type Performance Analysis Tool - Phase 1 Implementation
 *
 * New capabilities added:
 *  - tsserver log parsing for IDE performance metrics
 *  - Dependency graph analysis for type import/export tracking
 *  - Granular instantiation call site tracking
 *  - Cross-package type dependency visualization
 *  - Type hub detection (files causing cascade re-checks)
 *
 * Modes:
 *  - run-all: run tsc traces for all apps/packages and produce a summary
 *  - analyze <traceDir>: analyze an existing trace directory (trace.json)
 *  - audit: run a focused per-package inference audit with suggestions
 *  - diagnose: detailed file-level metrics with code analysis
 *  - tsserver: analyze tsserver logs for IDE performance (NEW)
 *  - graph: build and analyze type dependency graph (NEW)
 *  - instantiations: granular instantiation site tracking (NEW)
 *
 * Examples:
 *  bun run scripts/type-performance.ts run-all --summary-json out.json
 *  bun run scripts/type-performance.ts analyze ./.type-traces/packages-db
 *  bun run scripts/type-performance.ts audit --json audit.json --threshold 1.0
 *  bun run scripts/type-performance.ts tsserver --logfile ./tsserver.log
 *  bun run scripts/type-performance.ts graph --output graph.json
 *  bun run scripts/type-performance.ts instantiations --package packages/db
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = process.cwd();

// ============================================================================
// Shared Types & Interfaces
// ============================================================================

interface Result {
  name: string;
  path: string;
  success: boolean;
  duration: number;
  error?: string;
}

interface TraceEvent {
  name?: string;
  dur?: number;
  args?: { path?: string; count?: number; line?: number; character?: number };
  ts?: number;
  cat?: string;
  ph?: string;
}

interface FileMetric {
  path: string;
  checkMs: number;
  instantiations: number;
  suggestions: string[];
  instantiationSites?: InstantiationSite[];
}

interface InstantiationSite {
  location: string;
  count: number;
  type: 'MappedType' | 'ConditionalType' | 'GenericInference' | 'IndexedAccess' | 'Other';
  line?: number;
  column?: number;
}

interface DetailedFileMetric extends FileMetric {
  loc: number;
  imports: number;
  exports: number;
  complexity: number;
  problematicSnippets: Array<{ line: number; code: string; issue: string }>;
  dependencies: string[];
  importedBy: string[];
  typeCentrality: number;
}

interface PkgResult {
  name: string;
  ok: boolean;
  durationSec: number;
  errorType?: 'type_error' | 'recursion_limit' | 'oom';
  files: FileMetric[];
  topSlowFiles: Array<{ path: string; ms: number; suggestions: string[] }>;
  summary: {
    totalFiles: number;
    slowFiles: number;
    totalTypeCheckMs: number;
    avgMsPerFile: number;
    totalInstantiations: number;
    typeHubFiles: number;
  };
}

interface DetailedPkgResult extends Omit<PkgResult, 'files'> {
  files: DetailedFileMetric[];
}

interface TypeDependencyNode {
  path: string;
  importedBy: string[];
  exportsTypes: boolean;
  typeInstantiationCost: number;
  centrality: number;
  isBarrelFile: boolean;
  exportCount: number;
}

interface TypeDependencyGraph {
  nodes: TypeDependencyNode[];
  edges: Array<{ from: string; to: string; isTypeOnly: boolean }>;
  hubs: TypeDependencyNode[];
  cycles: string[][];
}

interface TSServerMetrics {
  autocompleteLatency: number;
  diagnosticsLatency: number;
  memoryUsage: number;
  fileCount: number;
  symbolCount: number;
  moduleResolutionCount: number;
  slowOperations: Array<{ operation: string; duration: number; file?: string }>;
}

// ============================================================================
// Phase 1.1: TSServer Log Analysis
// ============================================================================

function parseTSServerLog(logPath: string): TSServerMetrics {
  if (!existsSync(logPath)) {
    throw new Error(`TSServer log not found: ${logPath}`);
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');

  let autocompleteLatency = 0;
  let diagnosticsLatency = 0;
  let memoryUsage = 0;
  let fileCount = 0;
  let symbolCount = 0;
  let moduleResolutionCount = 0;
  const slowOperations: Array<{ operation: string; duration: number; file?: string }> = [];

  // Track timing for operations
  const operationTimes: Map<string, number> = new Map();

  for (const line of lines) {
    // Parse completion requests
    const completionMatch = line.match(/completionEntryDetails\(\d+\):\s*(\d+)ms/);
    if (completionMatch) {
      const duration = Number.parseInt(completionMatch[1]);
      autocompleteLatency = Math.max(autocompleteLatency, duration);
    }

    // Parse autocomplete requests
    const autoMatch = line.match(/completionInfo\(\d+\):\s*(\d+)ms/);
    if (autoMatch) {
      const duration = Number.parseInt(autoMatch[1]);
      if (duration > 500) {
        slowOperations.push({ operation: 'completionInfo', duration });
      }
    }

    // Parse diagnostics
    const diagMatch = line.match(/geterr\(\d+\):\s*(\d+)ms/);
    if (diagMatch) {
      diagnosticsLatency = Math.max(diagnosticsLatency, Number.parseInt(diagMatch[1]));
    }

    // Parse memory usage
    const memMatch = line.match(/memory used: (\d+)K/);
    if (memMatch) {
      memoryUsage = Math.max(memoryUsage, Number.parseInt(memMatch[1]) / 1024);
    }

    // Parse file count
    const filesMatch = line.match(/Files:\s+(\d+)/);
    if (filesMatch) {
      fileCount = Math.max(fileCount, Number.parseInt(filesMatch[1]));
    }

    // Parse symbol count
    const symbolsMatch = line.match(/Symbols:\s+(\d+)/);
    if (symbolsMatch) {
      symbolCount = Math.max(symbolCount, Number.parseInt(symbolsMatch[1]));
    }

    // Parse module resolution
    if (line.includes('======== Resolving module')) {
      moduleResolutionCount++;
    }

    // Track slow module resolution
    const resolveMatch = line.match(/Resolving module.*took (\d+)ms/);
    if (resolveMatch) {
      const duration = Number.parseInt(resolveMatch[1]);
      if (duration > 100) {
        const moduleMatch = line.match(/module '([^']+)'/);
        slowOperations.push({
          operation: 'moduleResolution',
          duration,
          file: moduleMatch?.[1],
        });
      }
    }
  }

  return {
    autocompleteLatency,
    diagnosticsLatency,
    memoryUsage,
    fileCount,
    symbolCount,
    moduleResolutionCount,
    slowOperations: slowOperations.sort((a, b) => b.duration - a.duration).slice(0, 20),
  };
}

function analyzeTSServerLog(logPath: string, jsonOut?: string) {
  console.log(`🔍 Analyzing tsserver log: ${logPath}\n`);

  const metrics = parseTSServerLog(logPath);

  console.log('📊 TSServer Performance Metrics\n');
  console.log('='.repeat(70));

  console.log('\n🎯 Latency Metrics:');
  console.log(`  Autocomplete latency:     ${metrics.autocompleteLatency.toFixed(0)}ms ${getLatencyStatus(metrics.autocompleteLatency)}`);
  console.log(`  Diagnostics latency:      ${metrics.diagnosticsLatency.toFixed(0)}ms ${getLatencyStatus(metrics.diagnosticsLatency)}`);

  console.log('\n💾 Memory & Scale:');
  console.log(`  Memory usage:             ${metrics.memoryUsage.toFixed(0)}MB`);
  console.log(`  Files in memory:          ${metrics.fileCount}`);
  console.log(`  Symbols loaded:           ${metrics.symbolCount.toLocaleString()}`);
  console.log(`  Module resolutions:       ${metrics.moduleResolutionCount}`);

  if (metrics.slowOperations.length > 0) {
    console.log('\n🐌 Slow Operations (Top 10):');
    console.log('Duration | Operation | File/Module');
    console.log('---------|----------|------------');
    for (const op of metrics.slowOperations.slice(0, 10)) {
      const file = op.file ? ` | ${op.file.slice(0, 40)}` : '';
      console.log(`${op.duration.toString().padStart(7)}ms | ${op.operation.padEnd(18)}${file}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(getTSServerRecommendations(metrics));

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(metrics, null, 2));
    console.log(`\n📁 JSON report written to ${jsonOut}`);
  }
}

function getLatencyStatus(latency: number): string {
  if (latency < 100) return '✅ Good';
  if (latency < 500) return '⚠️  Slow';
  return '🔥 Critical';
}

function getTSServerRecommendations(metrics: TSServerMetrics): string {
  const issues: string[] = [];

  if (metrics.autocompleteLatency > 500) {
    issues.push('  • Autocomplete >500ms: Check for barrel file imports and large type unions');
  }

  if (metrics.diagnosticsLatency > 1000) {
    issues.push('  • Diagnostics >1s: Reduce cross-file type dependencies, add explicit return types');
  }

  if (metrics.memoryUsage > 2048) {
    issues.push('  • Memory >2GB: Split monorepo into smaller projects or use project references more aggressively');
  }

  if (metrics.fileCount > 1000) {
    issues.push('  • Files >1000: Consider excluding test files and generated code from tsconfig');
  }

  if (metrics.slowOperations.some(o => o.operation === 'moduleResolution' && o.duration > 500)) {
    issues.push('  • Slow module resolution: Check tsconfig paths mappings, avoid deep import chains');
  }

  if (issues.length === 0) {
    return '✅ TSServer performance looks healthy!';
  }

  return '🚨 Performance Issues Detected:\n' + issues.join('\n');
}

// ============================================================================
// Phase 1.2: Type Dependency Graph Analysis
// ============================================================================

function buildTypeDependencyGraph(pkgPath: string, traceEvents: TraceEvent[]): TypeDependencyGraph {
  const nodes = new Map<string, TypeDependencyNode>();
  const edges: Array<{ from: string; to: string; isTypeOnly: boolean }> = [];

  // Scan all TypeScript files in package
  const srcDir = join(ROOT, pkgPath, 'src');
  if (!existsSync(srcDir)) {
    return { nodes: [], edges: [], hubs: [], cycles: [] };
  }

  const tsFiles = findTypeScriptFiles(srcDir);

  for (const filePath of tsFiles) {
    const relativePath = normalizePath(filePath);
    const content = readFileSync(filePath, 'utf-8');

    // Parse imports
    const imports = parseImports(content);
    const exports = parseExports(content);
    const isBarrelFile = isBarrelExportFile(content);

    // Get instantiation cost from trace
    const fileEvents = traceEvents.filter(e => e.args?.path === filePath);
    const instantiationCost = fileEvents.reduce((sum, e) => sum + (e.args?.count || 0), 0);

    const node: TypeDependencyNode = {
      path: relativePath,
      importedBy: [],
      exportsTypes: exports.length > 0,
      typeInstantiationCost: instantiationCost,
      centrality: 0,
      isBarrelFile,
      exportCount: exports.length,
    };

    nodes.set(relativePath, node);

    // Create edges for imports
    for (const imp of imports) {
      if (imp.source.startsWith('.')) {
        const resolvedPath = resolveImportPath(filePath, imp.source);
        if (resolvedPath) {
          edges.push({
            from: relativePath,
            to: normalizePath(resolvedPath),
            isTypeOnly: imp.isTypeOnly,
          });
        }
      }
    }
  }

  // Calculate importedBy (reverse edges)
  for (const edge of edges) {
    const targetNode = nodes.get(edge.to);
    if (targetNode) {
      targetNode.importedBy.push(edge.from);
    }
  }

  // Calculate centrality (how critical this file is to the type graph)
  for (const node of nodes.values()) {
    node.centrality = calculateCentrality(node, nodes, edges);
  }

  // Detect type hubs (high centrality + exports types)
  const hubs = Array.from(nodes.values())
    .filter(n => n.centrality > 0.5 && n.exportsTypes)
    .sort((a, b) => b.centrality - a.centrality);

  // Detect cycles (simplified)
  const cycles = detectCycles(edges, nodes);

  return {
    nodes: Array.from(nodes.values()),
    edges,
    hubs: hubs.slice(0, 10),
    cycles,
  };
}

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];

  function scan(currentDir: string) {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }
  }

  scan(dir);
  return files;
}

function parseImports(content: string): Array<{ source: string; isTypeOnly: boolean }> {
  const imports: Array<{ source: string; isTypeOnly: boolean }> = [];

  // Match: import type { ... } from '...'
  const typeImportRegex = /import\s+type\s+.*?\s+from\s+['"]([^'"]+)['"];?/g;
  let match;
  while ((match = typeImportRegex.exec(content)) !== null) {
    imports.push({ source: match[1], isTypeOnly: true });
  }

  // Match: import { ... } from '...' (mixed - treat as runtime for safety)
  const regularImportRegex = /import\s+(?!type\s)[^'"]*\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = regularImportRegex.exec(content)) !== null) {
    imports.push({ source: match[1], isTypeOnly: false });
  }

  return imports;
}

function parseExports(content: string): string[] {
  const exports: string[] = [];

  // Match: export type X = ...
  const typeExportRegex = /export\s+type\s+(\w+)/g;
  let match;
  while ((match = typeExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Match: export interface X ...
  const interfaceExportRegex = /export\s+interface\s+(\w+)/g;
  while ((match = interfaceExportRegex.exec(content)) !== null) {
    exports.push(match[1]);
  }

  // Match: export * from '...'
  const starExportRegex = /export\s+\*\s+from\s+['"]([^'"]+)['"];?/g;
  while ((match = starExportRegex.exec(content)) !== null) {
    exports.push(`*:${match[1]}`);
  }

  return exports;
}

function isBarrelExportFile(content: string): boolean {
  // Check if file is primarily re-exporting from other files
  const exportStarMatches = (content.match(/export\s+\*\s+from/g) || []).length;
  const totalLines = content.split('\n').length;
  return exportStarMatches > 2 || (exportStarMatches > 0 && totalLines < 50);
}

function resolveImportPath(fromFile: string, importPath: string): string | null {
  const fromDir = dirname(fromFile);
  let resolved = join(fromDir, importPath);

  // Try common extensions
  const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
  for (const ext of extensions) {
    const fullPath = resolved + ext;
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }

  return null;
}

function calculateCentrality(
  node: TypeDependencyNode,
  allNodes: Map<string, TypeDependencyNode>,
  edges: Array<{ from: string; to: string }>,
): number {
  // Simple centrality: how many files transitively import this file
  const visited = new Set<string>();
  const queue = [...node.importedBy];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const currentNode = allNodes.get(current);
    if (currentNode) {
      queue.push(...currentNode.importedBy);
    }
  }

  // Normalize by total node count
  return visited.size / allNodes.size;
}

function detectCycles(
  edges: Array<{ from: string; to: string }>,
  nodes: Map<string, TypeDependencyNode>,
): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, path: string[]): boolean {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const outgoingEdges = edges.filter(e => e.from === node);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.to)) {
        if (dfs(edge.to, path)) {
          return true;
        }
      } else if (recStack.has(edge.to)) {
        // Found cycle
        const cycleStart = path.indexOf(edge.to);
        const cycle = path.slice(cycleStart);
        cycles.push(cycle);
      }
    }

    path.pop();
    recStack.delete(node);
    return false;
  }

  for (const node of nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function analyzeTypeGraph(pkgPath: string, traceDir: string, jsonOut?: string) {
  console.log(`📊 Building type dependency graph for: ${pkgPath}\n`);

  // Load trace events
  const traceFile = join(traceDir, pkgPath.replace(/\//g, '-'), 'trace.json');
  let traceEvents: TraceEvent[] = [];

  if (existsSync(traceFile)) {
    let raw = readFileSync(traceFile, 'utf-8').trim();
    if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
    traceEvents = JSON.parse(raw);
  }

  const graph = buildTypeDependencyGraph(pkgPath, traceEvents);

  console.log('🔗 Type Dependency Graph Analysis\n');
  console.log('='.repeat(70));

  console.log(`\n📦 Total Nodes: ${graph.nodes.length}`);
  console.log(`📎 Total Edges: ${graph.edges.length}`);

  if (graph.hubs.length > 0) {
    console.log('\n🎯 Type Hub Files (High Impact on IDE Performance):');
    console.log('Centrality | File | Barrel | Exports');
    console.log('-----------|------|--------|--------');
    for (const hub of graph.hubs.slice(0, 10)) {
      const barrel = hub.isBarrelFile ? '✅' : '❌';
      console.log(
        `${hub.centrality.toFixed(3).padStart(10)} | ${hub.path.slice(0, 45).padEnd(45)} | ${barrel} | ${hub.exportCount}`,
      );
    }
  }

  if (graph.cycles.length > 0) {
    console.log(`\n🔄 Type Import Cycles Detected: ${graph.cycles.length}`);
    for (const cycle of graph.cycles.slice(0, 5)) {
      console.log(`  • ${cycle.join(' → ')} → ${cycle[0]}`);
    }
  }

  // Identify problematic patterns
  const barrelFiles = graph.nodes.filter(n => n.isBarrelFile);
  if (barrelFiles.length > 0) {
    console.log(`\n📦 Barrel Files (${barrelFiles.length}):`);
    for (const barrel of barrelFiles) {
      console.log(`  • ${barrel.path} (imported by ${barrel.importedBy.length} files)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log(getGraphRecommendations(graph));

  if (jsonOut) {
    writeFileSync(jsonOut, JSON.stringify(graph, null, 2));
    console.log(`\n📁 Graph data written to ${jsonOut}`);
  }

  return graph;
}

function getGraphRecommendations(graph: TypeDependencyGraph): string {
  const recommendations: string[] = [];

  if (graph.hubs.length > 5) {
    recommendations.push('  • More than 5 type hubs detected - consider splitting these files');
  }

  const highCentralityBarrels = graph.hubs.filter(h => h.isBarrelFile && h.centrality > 0.7);
  if (highCentralityBarrels.length > 0) {
    recommendations.push(`  • ${highCentralityBarrels.length} high-centrality barrel files found - these cause cascade re-checks`);
    recommendations.push('    Replace with direct imports to reduce IDE lag');
  }

  if (graph.cycles.length > 0) {
    recommendations.push(`  • ${graph.cycles.length} import cycles detected - break these to improve type resolution`);
  }

  if (graph.nodes.some(n => n.typeInstantiationCost > 10000)) {
    recommendations.push('  • Files with >10k type instantiations found - add explicit return types');
  }

  if (recommendations.length === 0) {
    return '✅ Type dependency graph looks healthy!';
  }

  return '🚨 Recommendations:\n' + recommendations.join('\n');
}

// ============================================================================
// Phase 1.3: Granular Instantiation Site Tracking
// ============================================================================

function analyzeInstantiationSites(tracePath: string, pkgPath: string, top = 20): Map<string, InstantiationSite[]> {
  const traceFile = join(tracePath, 'trace.json');
  if (!existsSync(traceFile)) {
    return new Map();
  }

  let raw = readFileSync(traceFile, 'utf-8').trim();
  if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
  const events: TraceEvent[] = JSON.parse(raw);

  const fileSites = new Map<string, Map<string, InstantiationSite>>();

  for (const ev of events) {
    const path = ev.args?.path;
    if (!path || !ev.args?.count) continue;

    const normalizedPath = normalizePath(path);
    if (!fileSites.has(normalizedPath)) {
      fileSites.set(normalizedPath, new Map());
    }

    const sites = fileSites.get(normalizedPath)!;

    // Extract location from event name or args
    const line = ev.args?.line || extractLineFromEvent(ev);
    const column = ev.args?.character || 0;
    const location = line ? `${normalizedPath}:${line}:${column}` : normalizedPath;

    // Determine instantiation type
    const instType = classifyInstantiationType(ev);

    const key = `${location}-${instType}`;
    const existing = sites.get(key);
    if (existing) {
      existing.count += ev.args.count;
    } else {
      sites.set(key, {
        location,
        count: ev.args.count,
        type: instType,
        line,
        column,
      });
    }
  }

  // Convert to array format and sort
  const result = new Map<string, InstantiationSite[]>();
  for (const [filePath, sitesMap] of fileSites) {
    const sites = Array.from(sitesMap.values()).sort((a, b) => b.count - a.count);
    result.set(filePath, sites);
  }

  return result;
}

function extractLineFromEvent(ev: TraceEvent): number | undefined {
  // Try to extract line from event name or other fields
  const name = ev.name || '';
  const match = name.match(/:(\d+):/);
  if (match) {
    return Number.parseInt(match[1]);
  }
  return undefined;
}

function classifyInstantiationType(ev: TraceEvent): InstantiationSite['type'] {
  const name = ev.name || '';

  if (name.includes('mappedType') || name.includes('MappedType')) {
    return 'MappedType';
  }
  if (name.includes('conditionalType') || name.includes('ConditionalType')) {
    return 'ConditionalType';
  }
  if (name.includes('generic') || name.includes('infer')) {
    return 'GenericInference';
  }
  if (name.includes('indexedAccess') || name.includes('IndexType')) {
    return 'IndexedAccess';
  }

  return 'Other';
}

function reportInstantiationSites(tracePath: string, pkgPath: string, threshold = 1000) {
  console.log(`🔬 Granular Instantiation Analysis: ${pkgPath}\n`);

  const sites = analyzeInstantiationSites(tracePath, pkgPath);

  if (sites.size === 0) {
    console.log('⚠️  No trace data found. Run tsc with --generateTrace first.');
    return;
  }

  console.log('📍 Top Instantiation Sites by File\n');
  console.log('='.repeat(80));

  for (const [filePath, fileSites] of sites) {
    const total = fileSites.reduce((sum, s) => sum + s.count, 0);
    if (total < threshold) continue;

    console.log(`\n📄 ${filePath} (Total: ${total.toLocaleString()} instantiations)\n`);
    console.log('Count      | Type             | Location');
    console.log('-----------|------------------|----------------------------------------');

    for (const site of fileSites.slice(0, 10)) {
      const count = site.count.toLocaleString().padStart(10);
      const type = site.type.padEnd(16);
      const location = site.location.slice(0, 40);
      console.log(`${count} | ${type} | ${location}`);
    }
  }

  console.log('\n' + '='.repeat(80));

  // Cross-file analysis
  const allSites = Array.from(sites.entries()).flatMap(([file, sites]) =>
    sites.map(s => ({ ...s, file })),
  );

  const topSites = allSites.sort((a, b) => b.count - a.count).slice(0, 20);

  console.log('\n🔥 Top 20 Instantiation Sites (Cross-File):\n');
  console.log('Count      | Type             | File:Line');
  console.log('-----------|------------------|----------------------------------------');

  for (const site of topSites) {
    const count = site.count.toLocaleString().padStart(10);
    const type = site.type.padEnd(16);
    const location = `${site.file}:${site.line || '?'}`.slice(0, 40);
    console.log(`${count} | ${type} | ${location}`);
  }

  console.log('\n' + getInstantiationRecommendations(topSites));
}

function getInstantiationRecommendations(topSites: Array<InstantiationSite & { file: string }>): string {
  const typeCounts = new Map<InstantiationSite['type'], number>();
  for (const site of topSites) {
    typeCounts.set(site.type, (typeCounts.get(site.type) || 0) + 1);
  }

  const recommendations: string[] = [];

  if ((typeCounts.get('MappedType') || 0) > 5) {
    recommendations.push('  • High mapped type usage - simplify { [K in T]: V } patterns');
  }

  if ((typeCounts.get('ConditionalType') || 0) > 5) {
    recommendations.push('  • High conditional type usage - reduce T extends U ? X : Y chains');
  }

  if ((typeCounts.get('GenericInference') || 0) > 5) {
    recommendations.push('  • Heavy generic inference - add explicit type parameters or return types');
  }

  if ((typeCounts.get('IndexedAccess') || 0) > 5) {
    recommendations.push('  • High indexed access usage - extract commonly accessed properties to named types');
  }

  if (recommendations.length === 0) {
    return '✅ Instantiation patterns look healthy!';
  }

  return '🚨 Optimization Opportunities:\n' + recommendations.join('\n');
}

// ============================================================================
// Original Functions (Preserved)
// ============================================================================

function runTscWithTrace(tsconfigPath: string, outDir: string, memMb = 4096): void {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  execSync(`bunx tsc -p ${tsconfigPath} --noEmit --generateTrace ${outDir} --skipLibCheck`, {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, NODE_OPTIONS: `--max-old-space-size=${memMb}` },
  });
}

async function runCheck(name: string, path: string, traceBase: string): Promise<Result | null> {
  const tsconfigPath = join(ROOT, path, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) return null;

  process.stdout.write(`Checking ${name.padEnd(30)} ... `);

  const outputDir = join(traceBase, name.replace(/\//g, '-'));
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const start = Date.now();
  try {
    runTscWithTrace(tsconfigPath, outputDir, 8192);
    const duration = (Date.now() - start) / 1000;
    console.log(`✅ Success (${duration.toFixed(2)}s)`);
    return { name, path, success: true, duration };
  } catch (error: any) {
    const duration = (Date.now() - start) / 1000;
    const output = (error.stdout?.toString() || '') + (error.stderr?.toString() || '');

    if (output.includes('TS2589') || output.includes('excessively deep')) {
      console.log(`🔥 RECURSION LIMIT (${duration.toFixed(2)}s)`);
      return { name, path, success: false, duration, error: 'recursion_limit' };
    }

    if (output.includes('heap out of memory') || error.status === 134) {
      console.log(`💥 CRASH / OOM (${duration.toFixed(2)}s)`);
      return { name, path, success: false, duration, error: 'oom' };
    }

    console.log(`⚠️  ERRORS FOUND (${duration.toFixed(2)}s)`);
    return { name, path, success: false, duration, error: 'type_errors' };
  }
}

function analyzeTrace(tracePath: string, top = 20) {
  const traceFile = join(tracePath, 'trace.json');
  if (!existsSync(traceFile)) {
    console.error(`Trace file not found at ${traceFile}`);
    process.exit(1);
  }

  let traceContent = readFileSync(traceFile, 'utf-8').trim();
  if (!traceContent.endsWith(']')) {
    traceContent = traceContent.replace(/,\s*$/, '') + ']';
  }

  let trace: TraceEvent[];
  try {
    trace = JSON.parse(traceContent);
  } catch {
    console.error('❌ Failed to parse trace file.');
    process.exit(1);
  }

  const typeChecks = trace.filter((e) => e.name && e.name.includes('check') && e.dur);
  const slowestChecks = typeChecks.sort((a, b) => (b.dur || 0) - (a.dur || 0)).slice(0, top);

  console.log('⏱️  Top Slowest Type Checks:\n');
  console.log('Duration (ms) | Event');
  console.log('--------------|------');
  for (const c of slowestChecks) {
    const durationMs = ((c.dur || 0) / 1000).toFixed(2);
    console.log(`${durationMs.padStart(13)} | ${c.name}`);
  }

  const instantiations = new Map<string, number>();
  for (const ev of trace) {
    if (ev.args?.path && ev.args?.count) {
      const existing = instantiations.get(ev.args.path) || 0;
      instantiations.set(ev.args.path, existing + ev.args.count);
    }
  }

  if (instantiations.size > 0) {
    const sorted = Array.from(instantiations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, top);
    console.log('\n\n📈 Top Files by Type Instantiations:\n');
    console.log('Count     | File');
    console.log('----------|-----');
    for (const [path, count] of sorted) {
      const shortPath = path.replace(process.cwd(), '.');
      console.log(`${count.toString().padStart(9)} | ${shortPath}`);
    }
  }

  const totalDuration = trace.reduce((s, e) => s + (e.dur || 0), 0);
  const totalMs = (totalDuration / 1000).toFixed(2);
  console.log(`\n\n⏱️  Total Type Checking Time: ${totalMs}ms`);
  console.log(`📝 Total Events: ${trace.length}`);
}

function normalizePath(p: string): string {
  return p.replace(ROOT, '.');
}

function getSuggestionsForFile(
  filePath: string,
  checkMs: number,
  instantiations: number,
): string[] {
  const suggestions: string[] = [];
  let content = '';
  try {
    content = readFileSync(join(ROOT, filePath), 'utf-8');
  } catch {}

  if (checkMs > 1000)
    suggestions.push(
      `🔥 Type check >1s (${(checkMs / 1000).toFixed(2)}s). Consider splitting file or extracting large inline types.`,
    );
  if (instantiations > 5000)
    suggestions.push(
      `🔁 High instantiations (${instantiations}). Reduce generic nesting, avoid complex unions/intersections.`,
    );
  if (instantiations > 10000)
    suggestions.push(
      `🚨 Critical instantiations (${instantiations}). Refactor to modules and use explicit return types.`,
    );

  const patterns: Array<{ regex: RegExp; msg: string }> = [
    {
      regex: /type\s+\w+\s*=\s*Pick<.*Omit<.*>>/,
      msg: 'Avoid deep Pick/Omit chains; extract intermediate types.',
    },
    {
      regex: /export\s+type\s+\w+\s*=\s*.*&.*&.*&/,
      msg: 'Flatten intersection types; use interfaces or named aliases.',
    },
    {
      regex: /\[\s*\w+\s+in\s+.*\|\|\w+\s*]/,
      msg: 'Large indexed access unions slow; use discriminated unions or enums.',
    },
    {
      regex: /(\w+\s*:\s*\(.*\)\s*=>\s*.*\s*=>\s*.*)/,
      msg: 'Nested generic functions may cause inference loops; annotate returns.',
    },
    {
      regex: /export\s*\*\s+from\s+['"]@\w+\//,
      msg: 'Re-export entire package creates heavy reference graphs; re-export specific symbols.',
    },
  ];

  for (const { regex, msg } of patterns) {
    if (regex.test(content)) suggestions.push(`💡 ${msg}`);
  }

  if (filePath.includes('schema') || filePath.includes('types'))
    suggestions.push(
      '📦 Schema/type files should be minimal. Avoid deriving complex query types here.',
    );
  if (
    filePath.includes('prisma') &&
    (content.includes('@prisma/client') || content.includes('Prisma'))
  )
    suggestions.push(
      '🐘 Prisma re-exports via schema/index can cause cyclic imports. Prefer direct @prisma/client imports in hot files.',
    );

  return suggestions;
}

function analyzeFileDetails(
  filePath: string,
  checkMs: number,
  instantiations: number,
  importedBy: string[] = [],
): DetailedFileMetric {
  const fullPath = join(ROOT, filePath);
  let content = '';
  try {
    content = readFileSync(fullPath, 'utf-8');
  } catch {}

  const lines = content.split('\n');
  const loc = lines.length;

  const importMatches = content.match(/import\s+.*from\s+['"]/g) || [];
  const imports = importMatches.length;

  const exportMatches = content.match(/export\s+(const|function|class|type|interface)/g) || [];
  const exports = exportMatches.length;

  // Simple complexity metric: count of type-related keywords
  const complexity = (content.match(/\b(type|interface|class|function|const|let|var)\b/g) || [])
    .length;

  const dependencies: string[] = [];
  const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    dependencies.push(match[1]);
  }

  const problematicSnippets: Array<{ line: number; code: string; issue: string }> = [];
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.includes('Pick<') && line.includes('Omit<')) {
      problematicSnippets.push({ line: lineNum, code: line.trim(), issue: 'Deep Pick/Omit chain' });
    }
    if (line.includes('&') && line.includes('&') && line.includes('&')) {
      problematicSnippets.push({
        line: lineNum,
        code: line.trim(),
        issue: 'Complex intersection type',
      });
    }
    if (line.includes('[') && line.includes('in') && line.includes(']')) {
      problematicSnippets.push({ line: lineNum, code: line.trim(), issue: 'Indexed access union' });
    }
  });

  const suggestions = getSuggestionsForFile(filePath, checkMs, instantiations);

  // Calculate type centrality based on imports
  const typeCentrality = importedBy.length / 100; // Normalize

  return {
    path: normalizePath(filePath),
    checkMs,
    instantiations,
    suggestions,
    loc,
    imports,
    exports,
    complexity,
    problematicSnippets,
    dependencies,
    importedBy,
    typeCentrality,
  };
}

async function auditPackage(
  name: string,
  pkgPath: string,
  traceBase: string,
  thresholdSec = 1.0,
  enableGraph = false,
): Promise<PkgResult> {
  const tsconfig = join(pkgPath, 'tsconfig.json');
  if (!existsSync(tsconfig))
    return {
      name,
      ok: false,
      durationSec: 0,
      files: [],
      topSlowFiles: [],
      summary: { totalFiles: 0, slowFiles: 0, totalTypeCheckMs: 0, avgMsPerFile: 0, totalInstantiations: 0, typeHubFiles: 0 },
    };

  process.stdout.write(`Auditing ${name.padEnd(30)} ... `);
  const pkgTraceDir = join(traceBase, name.replace(/\//g, '-'));
  if (!existsSync(pkgTraceDir)) mkdirSync(pkgTraceDir, { recursive: true });

  const start = Date.now();
  let output = '';
  let exitOk = true;
  let errorType: PkgResult['errorType'];
  try {
    execSync(`bunx tsc -p ${tsconfig} --noEmit --generateTrace ${pkgTraceDir} --skipLibCheck`, {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' },
    });
  } catch (e: any) {
    exitOk = false;
    output = (e.stdout?.toString() || '') + (e.stderr?.toString() || '');
    if (/TS2589|excessively deep/.test(output)) errorType = 'recursion_limit';
    else if (/heap out of memory|exit status 134/.test(output)) errorType = 'oom';
    else errorType = 'type_error';
  }
  const duration = (Date.now() - start) / 1000;
  if (exitOk) console.log(`✅ ${duration.toFixed(2)}s`);
  else
    console.log(
      `${errorType === 'recursion_limit' ? '🔥' : errorType === 'oom' ? '💥' : '⚠️'} ${duration.toFixed(2)}s (${errorType})`,
    );

  const traceFile = join(pkgTraceDir, 'trace.json');
  const filesMetrics: FileMetric[] = [];
  let totalTypeCheckMs = 0;
  let totalInstantiations = 0;

  // Build dependency graph if enabled
  let graph: TypeDependencyGraph | null = null;
  if (enableGraph && existsSync(traceFile)) {
    let raw = readFileSync(traceFile, 'utf-8').trim();
    if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
    const events: TraceEvent[] = JSON.parse(raw);
    graph = buildTypeDependencyGraph(pkgPath, events);
  }

  if (existsSync(traceFile)) {
    let raw = readFileSync(traceFile, 'utf-8').trim();
    if (!raw.endsWith(']')) raw = raw.replace(/,\s*$/, '') + ']';
    const events: TraceEvent[] = JSON.parse(raw);

    const fileTimes = new Map<string, { checkMs: number; instantiations: number }>();
    for (const ev of events) {
      const path = ev.args?.path;
      if (!path) continue;
      const existing = fileTimes.get(path) ?? { checkMs: 0, instantiations: 0 };
      if (ev.name?.includes('check') && ev.dur) existing.checkMs += ev.dur / 1000;
      if (ev.args?.count) existing.instantiations += ev.args.count;
      fileTimes.set(path, existing);
    }

    for (const [path, metric] of fileTimes.entries()) {
      const suggestions = getSuggestionsForFile(path, metric.checkMs, metric.instantiations);

      // Add graph-based insights
      if (graph) {
        const node = graph.nodes.find(n => n.path === normalizePath(path));
        if (node && node.isBarrelFile) {
          suggestions.push(`📦 Barrel file (imported by ${node.importedBy.length} files) - causes cascade type checking`);
        }
        if (node && node.centrality > 0.7) {
          suggestions.push(`🎯 High-centrality type hub (${(node.centrality * 100).toFixed(0)}% of graph) - changes trigger widespread re-checks`);
        }
      }

      filesMetrics.push({
        path: normalizePath(path),
        checkMs: metric.checkMs,
        instantiations: metric.instantiations,
        suggestions,
      });
      totalTypeCheckMs += metric.checkMs;
      totalInstantiations += metric.instantiations;
    }
  }

  const totalFiles = filesMetrics.length;
  const slowFiles = filesMetrics.filter((f) => f.checkMs > thresholdSec * 1000).length;
  const avgMsPerFile = totalFiles > 0 ? totalTypeCheckMs / totalFiles : 0;
  const typeHubFiles = graph?.hubs.length || 0;

  const topSlowFiles = filesMetrics
    .filter((f) => f.checkMs > thresholdSec * 1000)
    .sort((a, b) => b.checkMs - a.checkMs)
    .slice(0, 10)
    .map((f) => ({ path: f.path, ms: f.checkMs, suggestions: f.suggestions }));

  return {
    name,
    ok: exitOk,
    durationSec: duration,
    errorType,
    files: filesMetrics,
    topSlowFiles,
    summary: { totalFiles, slowFiles, totalTypeCheckMs, avgMsPerFile, totalInstantiations, typeHubFiles },
  };
}

async function diagnosePackage(
  name: string,
  pkgPath: string,
  traceBase: string,
  thresholdSec = 1.0,
): Promise<DetailedPkgResult> {
  const baseResult = await auditPackage(name, pkgPath, traceBase, thresholdSec, true);
  const projectFiles = baseResult.files.filter(
    (f) => !f.path.includes('node_modules') && f.path.startsWith('./'),
  );

  // Build full import graph for centrality calculation
  const graph = buildTypeDependencyGraph(pkgPath, []);

  const allDetailedFiles = baseResult.files.map((f) => {
    const isProjectFile = projectFiles.some((pf) => pf.path === f.path);
    if (isProjectFile) {
      const importedBy = graph.nodes.find(n => n.path === f.path)?.importedBy || [];
      return analyzeFileDetails(f.path, f.checkMs, f.instantiations, importedBy);
    } else {
      return {
        ...f,
        loc: 0,
        imports: 0,
        exports: 0,
        complexity: 0,
        problematicSnippets: [],
        dependencies: [],
        importedBy: [],
        typeCentrality: 0,
      };
    }
  });

  return {
    ...baseResult,
    files: allDetailedFiles,
  };
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';

  // Phase 1.1: TSServer Log Analysis
  if (cmd === 'tsserver') {
    let logfile: string | undefined;
    let jsonOut: string | undefined;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--logfile' && args[i + 1]) logfile = args[i + 1];
      if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
    }

    if (!logfile) {
      console.log('Usage: bun run scripts/type-performance.ts tsserver --logfile <path> [--json out.json]');
      console.log('');
      console.log('To generate tsserver logs:');
      console.log('  1. In VS Code, set "typescript.tsserver.log": "verbose" in settings');
      console.log('  2. Restart TS server (Cmd+Shift+P > TypeScript: Restart TS Server)');
      console.log('  3. Find log location in TS Server logs panel');
      console.log('  4. Or use: tsc --logFile ./tsserver.log --logVerbosity detailed');
      process.exit(1);
    }

    analyzeTSServerLog(logfile, jsonOut);
    return;
  }

  // Phase 1.2: Type Dependency Graph
  if (cmd === 'graph') {
    let pkg: string | undefined;
    let traceDir: string | undefined;
    let jsonOut: string | undefined;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--package' && args[i + 1]) pkg = args[i + 1];
      if (args[i] === '--trace-dir' && args[i + 1]) traceDir = args[i + 1];
      if (args[i] === '--output' && args[i + 1]) jsonOut = args[i + 1];
    }

    if (!pkg) {
      console.log('Usage: bun run scripts/type-performance.ts graph --package <pkg-path> [--trace-dir <dir>] [--output graph.json]');
      console.log('Example: bun run scripts/type-performance.ts graph --package packages/db');
      process.exit(1);
    }

    const effectiveTraceDir = traceDir || join(ROOT, '.type-analysis');

    // Run audit first if no trace exists
    const traceFile = join(effectiveTraceDir, pkg.replace(/\//g, '-'), 'trace.json');
    if (!existsSync(traceFile)) {
      console.log('No trace found. Running audit first...\n');
      await auditPackage(pkg, pkg, effectiveTraceDir, 1.0, true);
    }

    analyzeTypeGraph(pkg, effectiveTraceDir, jsonOut);
    return;
  }

  // Phase 1.3: Granular Instantiation Analysis
  if (cmd === 'instantiations') {
    let pkg: string | undefined;
    let traceDir: string | undefined;
    let threshold = 1000;

    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--package' && args[i + 1]) pkg = args[i + 1];
      if (args[i] === '--trace-dir' && args[i + 1]) traceDir = args[i + 1];
      if (args[i] === '--threshold' && args[i + 1]) threshold = Number.parseInt(args[i + 1]);
    }

    if (!pkg) {
      console.log('Usage: bun run scripts/type-performance.ts instantiations --package <pkg-path> [--trace-dir <dir>] [--threshold 1000]');
      console.log('Example: bun run scripts/type-performance.ts instantiations --package packages/db');
      process.exit(1);
    }

    const effectiveTraceDir = traceDir || join(ROOT, '.type-analysis');

    // Run audit first if no trace exists
    const pkgTraceDir = join(effectiveTraceDir, pkg.replace(/\//g, '-'));
    if (!existsSync(join(pkgTraceDir, 'trace.json'))) {
      console.log('No trace found. Running audit first...\n');
      await auditPackage(pkg, pkg, effectiveTraceDir, 1.0, true);
    }

    reportInstantiationSites(pkgTraceDir, pkg, threshold);
    return;
  }

  // Original commands (run-all, analyze, audit, diagnose)
  if (cmd === 'run-all') {
    const TRACE_DIR = join(ROOT, '.type-traces');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    const apps = readdirSync(join(ROOT, 'apps')).map((d) => ({
      name: `apps/${d}`,
      path: join('apps', d),
    }));
    const packages = readdirSync(join(ROOT, 'packages')).map((d) => ({
      name: `packages/${d}`,
      path: join('packages', d),
    }));
    const targets = [...apps, ...packages].filter((t) =>
      existsSync(join(ROOT, t.path, 'tsconfig.json')),
    );

    const results: Result[] = [];
    for (const t of targets) {
      const r = await runCheck(t.name, t.path, TRACE_DIR);
      if (r) results.push(r);
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TYPE PERFORMANCE SUMMARY');
    console.log('='.repeat(70));
    const sorted = results.slice().sort((a, b) => b.duration - a.duration);
    console.log(`\n${'STATUS'.padEnd(15)} | ${'TIME'.padEnd(8)} | ${'PROJECT'}`);
    console.log('-'.repeat(70));
    for (const res of sorted) {
      let status = '✅ OK';
      if (res.error === 'recursion_limit') status = '🔥 RECURSION';
      else if (res.error === 'oom') status = '💥 OOM';
      else if (res.error === 'type_errors') status = '⚠️ ERRORS';
      console.log(`${status.padEnd(15)} | ${res.duration.toFixed(2)}s | ${res.name}`);
    }

    const summaryOutIdx = args.indexOf('--summary-json');
    const out =
      summaryOutIdx !== -1 && args[summaryOutIdx + 1]
        ? args[summaryOutIdx + 1]
        : join(TRACE_DIR, 'summary.json');
    const summary = results.map((r) => ({
      name: r.name,
      path: r.path,
      success: r.success,
      durationSec: r.duration,
      error: r.error || null,
      traceDir: join(TRACE_DIR, r.name.replace(/\//g, '-')),
    }));
    writeFileSync(
      out,
      JSON.stringify({ results: summary, generatedAt: new Date().toISOString() }, null, 2),
    );
    console.log(`\n📁 Summary written to ${out}`);
    const critical = results.filter((r) => r.error === 'recursion_limit' || r.error === 'oom');
    if (critical.length > 0) process.exitCode = 2;
    return;
  }

  if (cmd === 'analyze') {
    const traceArg = args[1] || '.';
    analyzeTrace(traceArg);
    return;
  }

  if (cmd === 'audit') {
    const TRACE_DIR = join(ROOT, '.type-analysis');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    let jsonOut: string | undefined;
    let threshold = 1.0;
    let enableGraph = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
      if (args[i] === '--threshold' && args[i + 1]) threshold = Number.parseFloat(args[i + 1]);
      if (args[i] === '--graph') enableGraph = true;
    }

    const apps = readdirSync(join(ROOT, 'apps')).map((d) => ({
      name: `apps/${d}`,
      path: join('apps', d),
    }));
    const packages = readdirSync(join(ROOT, 'packages')).map((d) => ({
      name: `packages/${d}`,
      path: join('packages', d),
    }));
    const targets = [...apps, ...packages].filter((t) =>
      existsSync(join(ROOT, t.path, 'tsconfig.json')),
    );

    const results: PkgResult[] = [];
    for (const t of targets) {
      const res = await auditPackage(t.name, t.path, TRACE_DIR, threshold, enableGraph);
      results.push(res);
    }

    // Print compact table
    console.log('\n' + '='.repeat(80));
    console.log('TYPE INFERENCE AUDIT REPORT');
    console.log('='.repeat(80));
    console.log(
      `\n${'STATUS'.padEnd(8)} | ${'TIME'.padEnd(7)} | ${'FILES'.padEnd(5)} | ${'SLOW'.padEnd(4)} | ${'AVG'.padEnd(6)} | INSTANTS | PACKAGE`,
    );
    console.log('-'.repeat(80));
    for (const r of results) {
      const status = r.ok
        ? '✅'
        : r.errorType === 'recursion_limit'
          ? '🔥'
          : r.errorType === 'oom'
            ? '💥'
            : '⚠️';
      console.log(
        `${status.padEnd(8)} | ${r.durationSec.toFixed(2).padEnd(7)} | ${String(r.summary.totalFiles).padEnd(5)} | ${String(r.summary.slowFiles).padEnd(4)} | ${(r.summary.avgMsPerFile / 1000).toFixed(3).padEnd(6)} | ${(r.summary.totalInstantiations / 1000).toFixed(0).padStart(6)}k | ${r.name}`,
      );
    }

    const allSlowFiles = results.flatMap((r) => r.topSlowFiles);
    if (allSlowFiles.length > 0) {
      console.log('\n🔥 SLOW FILES (by descending cost):\n');
      for (const f of allSlowFiles) {
        console.log(`${(f.ms / 1000).toFixed(2)}s | ${f.path}`);
        for (const s of f.suggestions) console.log(`    • ${s}`);
      }
    }

    // Show type hubs if graph analysis was enabled
    if (enableGraph) {
      const packagesWithHubs = results.filter(r => r.summary.typeHubFiles > 0);
      if (packagesWithHubs.length > 0) {
        console.log('\n🎯 TYPE HUBS DETECTED:\n');
        for (const r of packagesWithHubs) {
          console.log(`  • ${r.name}: ${r.summary.typeHubFiles} type hub files`);
        }
      }
    }

    const totalSlowFiles = results.reduce((sum, r) => sum + r.summary.slowFiles, 0);
    const anyCritical = results.some(
      (r) => r.errorType === 'recursion_limit' || r.errorType === 'oom',
    );
    if (anyCritical || totalSlowFiles > 0) {
      console.log('\n🚨 ACTIONS REQUIRED:');
      console.log('  • Prioritize files with 🔥 icons; they likely crash your IDE/TS server.');
      console.log('  • Reduce instantiations by avoiding generic infer on every property access.');
      console.log('  • Use explicit return types in functions that return derived types.');
      console.log('  • Split large files; keep each file under ~300 LOC for type checker.');
      if (enableGraph) {
        console.log('  • Run "graph" command to identify type hubs causing cascade re-checks.');
      }
    } else {
      console.log('\n✅ All files under threshold! Type inference looks healthy.');
    }

    if (jsonOut) {
      writeFileSync(
        jsonOut,
        JSON.stringify({ generatedAt: new Date().toISOString(), threshold, results }, null, 2),
      );
      console.log(`\n📁 JSON report written to ${jsonOut}`);
    }

    if (anyCritical) process.exit(2);
    else if (totalSlowFiles > 0) process.exit(1);
    return;
  }

  if (cmd === 'diagnose') {
    const TRACE_DIR = join(ROOT, '.type-diagnosis-traces');
    if (existsSync(TRACE_DIR)) rmSync(TRACE_DIR, { recursive: true });
    mkdirSync(TRACE_DIR, { recursive: true });

    let jsonOut: string | undefined;
    let threshold = 1.0;
    let specificPackage: string | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--json' && args[i + 1]) jsonOut = args[i + 1];
      if (args[i] === '--threshold' && args[i + 1]) threshold = parseFloat(args[i + 1]);
      if (args[i] === '--package' && args[i + 1]) specificPackage = args[i + 1];
    }

    // If specific package requested, only analyze that
    let targets: Array<{ name: string; path: string }>;
    if (specificPackage) {
      targets = [{ name: specificPackage, path: specificPackage }];
    } else {
      const apps = readdirSync(join(ROOT, 'apps')).map((d) => ({
        name: `apps/${d}`,
        path: join('apps', d),
      }));
      const packages = readdirSync(join(ROOT, 'packages')).map((d) => ({
        name: `packages/${d}`,
        path: join('packages', d),
      }));
      targets = [...apps, ...packages].filter((t) =>
        existsSync(join(ROOT, t.path, 'tsconfig.json')),
      );
    }

    const results: DetailedPkgResult[] = [];
    for (const t of targets) {
      const res = await diagnosePackage(t.name, t.path, TRACE_DIR, threshold);
      results.push(res);
    }

    console.log('\n🔍 DETAILED TYPE PERFORMANCE DIAGNOSIS REPORT');
    console.log('='.repeat(80));
    console.log('This report contains detailed metrics for agent analysis and fix implementation.');
    console.log(`Generated at: ${new Date().toISOString()}`);
    console.log(`Threshold: ${threshold}s`);
    console.log('='.repeat(80));

    const allFiles = results.flatMap((r) => r.files);
    const criticalFiles = allFiles.filter(
      (f) => f.checkMs > threshold * 1000 || f.instantiations > 10000,
    );
    const totalProblematicSnippets = allFiles.reduce(
      (sum, f) => sum + f.problematicSnippets.length,
      0,
    );

    // Calculate type hub statistics
    const typeHubFiles = allFiles.filter(f => f.typeCentrality > 0.1);

    console.log(`\n📊 SUMMARY:`);
    console.log(`  • Total packages analyzed: ${results.length}`);
    console.log(`  • Total files analyzed: ${allFiles.length}`);
    console.log(
      `  • Critical files (> ${threshold}s or >10k instantiations): ${criticalFiles.length}`,
    );
    console.log(`  • Type hub files (high centrality): ${typeHubFiles.length}`);
    console.log(`  • Total problematic code snippets identified: ${totalProblematicSnippets}`);
    console.log(
      `  • Average LOC per file: ${(allFiles.reduce((sum, f) => sum + f.loc, 0) / allFiles.length).toFixed(0)}`,
    );
    console.log(
      `  • Average complexity per file: ${(allFiles.reduce((sum, f) => sum + f.complexity, 0) / allFiles.length).toFixed(0)}`,
    );

    if (typeHubFiles.length > 0) {
      console.log('\n🎯 TYPE HUB FILES (High Impact):');
      typeHubFiles
        .sort((a, b) => b.typeCentrality - a.typeCentrality)
        .slice(0, 10)
        .forEach((f) => {
          console.log(
            `  • ${f.path} (${(f.typeCentrality * 100).toFixed(0)}% centrality, imported by ${f.importedBy.length} files)`,
          );
        });
    }

    if (criticalFiles.length > 0) {
      console.log('\n🚨 TOP CRITICAL FILES:');
      criticalFiles
        .sort((a, b) => b.checkMs - a.checkMs)
        .slice(0, 10)
        .forEach((f) => {
          console.log(
            `  • ${f.path} (${(f.checkMs / 1000).toFixed(2)}s, ${f.instantiations} inst, ${f.loc} LOC)`,
          );
        });
    }

    const out = jsonOut || join(TRACE_DIR, 'diagnosis-report.json');
    writeFileSync(
      out,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          threshold,
          summary: {
            totalPackages: results.length,
            totalFiles: allFiles.length,
            criticalFiles: criticalFiles.length,
            typeHubFiles: typeHubFiles.length,
            totalProblematicSnippets,
            avgLocPerFile: allFiles.reduce((sum, f) => sum + f.loc, 0) / allFiles.length,
            avgComplexityPerFile:
              allFiles.reduce((sum, f) => sum + f.complexity, 0) / allFiles.length,
          },
          results,
        },
        null,
        2,
      ),
    );
    console.log(`\n📁 Detailed diagnosis report written to ${out}`);
    console.log(
      'This JSON contains all key data needed for automated diagnosis and fix implementation.',
    );
    return;
  }

  console.log('Enhanced Type Performance Tool - Phase 1 Implementation\n');
  console.log('Usage:');
  console.log('  bun run scripts/type-performance.ts run-all [--summary-json out.json]');
  console.log('  bun run scripts/type-performance.ts analyze <traceDir>');
  console.log('  bun run scripts/type-performance.ts audit [--json out.json] [--threshold 1.0] [--graph]');
  console.log('  bun run scripts/type-performance.ts diagnose [--json out.json] [--threshold 1.0] [--package <pkg>]');
  console.log('');
  console.log('Phase 1 - New Commands:');
  console.log('  bun run scripts/type-performance.ts tsserver --logfile <path> [--json out.json]');
  console.log('  bun run scripts/type-performance.ts graph --package <pkg> [--output graph.json]');
  console.log('  bun run scripts/type-performance.ts instantiations --package <pkg> [--threshold 1000]');
}

main().catch((err) => {
  console.error('Tool failed:', err);
  process.exit(1);
});
