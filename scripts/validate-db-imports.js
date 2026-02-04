#!/usr/bin/env node
/**
 * Database Import Validation Script
 * 
 * This script enforces the architectural rule that apps must not import from @hominem/db.
 * Only the hono-rpc layer and service workers may have direct database access.
 * 
 * Run this in CI to catch violations:
 *   node scripts/validate-db-imports.js
 * 
 * Exit codes:
 *   0 - No violations found
 *   1 - Violations detected
 */

const fs = require('fs');
const path = require('path');

// Patterns that indicate a violation
const VIOLATION_PATTERNS = [
  /from\s+['"]@hominem\/db['"]/,
  /from\s+['"]@hominem\/db\/[^'"]+['"]/,
  /import\s+.*\s+from\s+['"]@hominem\/db/,
];

// Files/directories that are allowed to import from @hominem/db
const ALLOWED_PATHS = [
  /packages\/hono-rpc/,
  /services\/api/,
  /services\/workers/,
  /packages\/[^/]+\/src\/services/,
  /packages\/db/, // The DB package itself
];

// Check if a file path is allowed to import from @hominem/db
function isAllowedPath(filePath) {
  return ALLOWED_PATHS.some((pattern) => pattern.test(filePath));
}

// Check if a line contains a violation
function containsViolation(line) {
  return VIOLATION_PATTERNS.some((pattern) => pattern.test(line));
}

// Recursively find all TypeScript/JavaScript files in a directory
function findFiles(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules, build, and hidden directories
        if (entry.name === 'node_modules' || entry.name === 'build' || entry.name.startsWith('.')) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

// Check a single file for violations
function checkFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (containsViolation(line)) {
      violations.push({
        line: i + 1,
        content: line.trim(),
      });
    }
  }
  
  return violations;
}

// Main validation function
function validate() {
  console.log('🔍 Validating database import restrictions...\n');
  
  const appsDir = path.join(process.cwd(), 'apps');
  
  if (!fs.existsSync(appsDir)) {
    console.error('❌ Apps directory not found:', appsDir);
    process.exit(1);
  }
  
  const files = findFiles(appsDir);
  let totalViolations = 0;
  const violationsByFile = [];
  
  for (const file of files) {
    // Skip files in allowed paths (shouldn't happen in apps/, but just in case)
    if (isAllowedPath(file)) {
      continue;
    }
    
    const violations = checkFile(file);
    
    if (violations.length > 0) {
      totalViolations += violations.length;
      violationsByFile.push({
        file: path.relative(process.cwd(), file),
        violations,
      });
    }
  }
  
  if (totalViolations === 0) {
    console.log('✅ No database import violations found in apps/');
    console.log('   All apps are using the RPC client correctly.\n');
    return 0;
  }
  
  console.log(`❌ Found ${totalViolations} violation${totalViolations === 1 ? '' : 's'}:\n`);
  
  for (const { file, violations } of violationsByFile) {
    console.log(`📄 ${file}`);
    for (const violation of violations) {
      console.log(`   Line ${violation.line}: ${violation.content}`);
    }
    console.log('');
  }
  
  console.log('💡 To fix these violations:');
  console.log('   1. Replace DB imports with types from @hominem/hono-rpc/types');
  console.log('   2. Use the RPC client (@hominem/hono-client) for data access');
  console.log('   3. See docs/plans/2026-type-and-rpc-performance-project.md for details\n');
  
  return 1;
}

// Run validation
const exitCode = validate();
process.exit(exitCode);
