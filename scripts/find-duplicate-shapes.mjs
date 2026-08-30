#!/usr/bin/env node
/**
 * Finds exported interfaces/object type-aliases across the monorepo that
 * share an identical member shape (same property names + same resolved
 * types) but different names — candidates for consolidation.
 *
 * This is a job for the TypeScript Compiler API (`ts.createProgram` +
 * `TypeChecker`), not tsserver's editor protocol: tsserver is built for
 * one-symbol-at-a-time interactive queries (hover, references, go-to-def)
 * against a live session; there's no "list every type and compare shapes"
 * command in that protocol. A one-shot batch `Program` walk is the
 * idiomatic tool for whole-project structural analysis like this.
 *
 * Usage:
 *   node scripts/find-duplicate-shapes.mjs [--min-members N] [--json]
 *
 * Read-only: never writes anything.
 */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const minMembers = args.includes('--min-members')
  ? Number(args[args.indexOf('--min-members') + 1])
  : 2;
const asJson = args.includes('--json');

const SKIP_DIRS = new Set([
  'node_modules',
  'build',
  'dist',
  '.cache',
  '.turbo',
  'coverage',
  '.git',
]);
const ROOTS = ['packages', 'services', 'apps'];

function collectSourceFiles(dir, out) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectSourceFiles(path.join(dir, entry.name), out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry.name)) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    out.push(path.join(dir, entry.name));
  }
}

const files = [];
for (const r of ROOTS) {
  const dir = path.join(root, r);
  if (existsSync(dir)) collectSourceFiles(dir, files);
}
process.stderr.write(`[find-duplicate-shapes] scanning ${files.length} source files...\n`);

const compilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX,
  allowJs: false,
  strict: false,
  skipLibCheck: true,
  noEmit: true,
};

const program = ts.createProgram({ rootNames: files, options: compilerOptions });
const checker = program.getTypeChecker();

/** @type {Map<string, Array<{name: string, file: string, line: number, memberCount: number}>>} */
const shapeGroups = new Map();

function signatureFor(type) {
  const props = checker.getPropertiesOfType(type);
  if (props.length < minMembers) return null;
  // Skip types with call/construct/index signatures or clearly generic
  // structural noise (e.g. Record<string, X>-like resolved shapes) —
  // those aren't meaningful "someone re-declared this" duplicates.
  const parts = props
    .map((p) => {
      const t = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? p.declarations?.[0]);
      const optional = (p.flags & ts.SymbolFlags.Optional) !== 0;
      return `${p.name}${optional ? '?' : ''}:${checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation)}`;
    })
    .sort();
  return parts.join(';');
}

function visit(sourceFile) {
  if (sourceFile.isDeclarationFile) return;
  if (sourceFile.fileName.includes('/node_modules/')) return;

  ts.forEachChild(sourceFile, (node) => {
    let name;
    let type;

    if (ts.isInterfaceDeclaration(node) && hasExportModifier(node)) {
      name = node.name.text;
      type = checker.getTypeAtLocation(node);
    } else if (
      ts.isTypeAliasDeclaration(node) &&
      hasExportModifier(node) &&
      ts.isTypeLiteralNode(node.type)
    ) {
      name = node.name.text;
      type = checker.getTypeAtLocation(node.type);
    } else {
      return;
    }

    const sig = signatureFor(type);
    if (!sig) return;

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const memberCount = checker.getPropertiesOfType(type).length;
    const list = shapeGroups.get(sig) ?? [];
    list.push({
      name,
      file: path.relative(root, sourceFile.fileName),
      line: line + 1,
      memberCount,
    });
    shapeGroups.set(sig, list);
  });
}

function hasExportModifier(node) {
  return (
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  );
}

for (const sourceFile of program.getSourceFiles()) {
  if (files.includes(sourceFile.fileName)) visit(sourceFile);
}

const duplicates = [...shapeGroups.entries()]
  .map(([sig, entries]) => ({ entries, sig }))
  // Only report entries with different *declaration sites* that aren't
  // trivially the same name re-exported (a real duplicate has >1 distinct
  // file:line, and ideally different names -- same-name re-exports across
  // barrels are a different, less interesting kind of "duplication").
  .filter((g) => {
    const distinctSites = new Set(g.entries.map((e) => `${e.file}:${e.line}`));
    return distinctSites.size > 1;
  })
  .sort((a, b) => b.entries[0].memberCount - a.entries[0].memberCount);

if (asJson) {
  console.log(JSON.stringify(duplicates, null, 2));
} else {
  console.log(
    `\nScanned ${files.length} files, ${shapeGroups.size} distinct shapes (>=${minMembers} members).`,
  );
  console.log(`Found ${duplicates.length} shape(s) declared more than once:\n`);
  for (const { entries } of duplicates) {
    console.log(`--- ${entries[0].memberCount} member(s), ${entries.length} declaration(s) ---`);
    for (const e of entries) console.log(`  ${e.name.padEnd(30)} ${e.file}:${e.line}`);
    console.log();
  }
}
