/**
 * Smoke test: validate @hominem/db/services/* subpath resolution
 * 
 * Run in build/typecheck only - this file is never executed.
 * Its purpose is to verify that TypeScript can resolve service subpath imports.
 * 
 * If this file has type errors, subpath imports are broken.
 */

// Verify services can be imported via subpaths
import { listTasks } from '@hominem/db/services/tasks.service'
import { listTags } from '@hominem/db/services/tags.service'
import { listPersons } from '@hominem/db/services/persons.service'

// Just checking symbols compile
type TestTypes = typeof listTasks | typeof listTags | typeof listPersons

const _test: TestTypes[] = [listTasks, listTags, listPersons]

export { _test }
