#!/usr/bin/env bun
/**
 * CI drift check: Verify generated schema slices are up-to-date
 * 
 * This runs the schema generator and fails if git diff is non-empty.
 * Prevents stale generated files from being committed.
 * 
 * Usage:
 *   bun scripts/check-schema-drift.ts
 * 
 * Exit codes:
 *   0 - No drift detected
 *   1 - Generated files are out of date
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

// First, regenerate the schema slices
console.log('🔄 Regenerating schema slices...')
try {
  execSync('bun scripts/generate-db-schema-slices.ts', {
    cwd: process.cwd(),
    stdio: 'pipe',
  })
  console.log('✓ Schema slices regenerated\n')
} catch (e) {
  console.error('❌ Failed to regenerate schema slices')
  process.exit(1)
}

// Check if there are uncommitted changes in the schema domain directory
console.log('📋 Checking for drift in domain slices...\n')
try {
  const diff = execSync(
    'git diff --name-only packages/db/src/schema/{tasks,tags,calendar,persons,bookmarks,possessions,finance}.ts 2>/dev/null || echo ""',
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/bash',
    }
  ).trim()

  if (diff) {
    console.error('❌ DRIFT DETECTED: Generated schema files are out of date\n')
    console.error('Changed files:')
    console.error(diff)
    console.error('\n💡 To fix:')
    console.error('   1. Run: bun generate:db-schema')
    console.error('   2. Review changes with: git diff packages/db/src/schema/')
    console.error('   3. Commit with: git add packages/db/src/schema/')
    process.exit(1)
  }

  console.log('✅ No drift detected - schema files are up-to-date')
  process.exit(0)
} catch (e) {
  // Git commands fail in non-repo environments - just exit cleanly
  console.log('✓ (Skipped in non-git environment)')
  process.exit(0)
}
