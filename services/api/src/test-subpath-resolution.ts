/**
 * Smoke test: validate @hominem/db/services/* subpath resolution
 * 
 * Run in build/typecheck only - this file is never executed.
 * Its purpose is to verify that TypeScript can resolve service subpath imports.
 * 
 * If this file has type errors, subpath imports are broken.
 */

// Verify services can be imported via subpaths
import type { TaskId } from '@hominem/db/services/tasks.service'
import type { TagId } from '@hominem/db/services/tags.service'
import type { PersonId } from '@hominem/db/services/persons.service'

// Just checking types compile
type TestTypes = TaskId | TagId | PersonId

const _test: TestTypes = 'test' as unknown as TestTypes

export { _test }
