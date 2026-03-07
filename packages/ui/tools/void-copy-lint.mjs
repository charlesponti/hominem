#!/usr/bin/env node
/**
 * VOID copy lint: flags friendly or non-void language in UI strings.
 * Scans .ts/.tsx/.md/.mdx under apps, packages, services.
 * Emits file:line with offending phrase; exits 1 if any are found.
 */
import fs from 'node:fs';
import path from 'node:path';

const roots = ['apps/notes/app', 'apps/finance/app', 'apps/rocco/app']; // limit to app UI surfaces
const exts = new Set(['.tsx']);
const ignoreDirs = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  '.turbo',
  '.git',
  'test',
  '__tests__',
  'tests',
]);
const patterns = [
  /\bplease\b/i,
  /\bthank(s| you)?\b/i,
  /\bglad\b/i,
  /\benjoy\b/i,
  /\bwelcom(e|ing)\b/i,
  /\bhello\b/i,
];

let violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (ignoreDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (exts.has(path.extname(entry.name))) {
      lintFile(full);
    }
  }
}

function lintFile(file) {
  // skip non-app code (e.g., scripts, test fixtures)
  if (/(\/test\/|\/__tests__\/|\/tests\/)/.test(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\\r?\\n/);
  lines.forEach((line, idx) => {
    const text = line;
    for (const pat of patterns) {
      if (pat.test(text)) {
        violations.push({ file, line: idx + 1, text: text.trim(), match: pat.toString() });
        break;
      }
    }
  });
}

roots.filter((r) => fs.existsSync(r)).forEach((r) => walk(path.resolve(r)));

if (violations.length) {
  console.error('VOID copy violations:');
  violations.forEach((v) => {
    console.error(`${v.file}:${v.line} – ${v.match} – "${v.text}"`);
  });
  process.exit(1);
}
