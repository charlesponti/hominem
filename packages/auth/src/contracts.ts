import type { Database, Selectable } from '@hominem/db'

export type UserRow = Selectable<Database['auth.users']>
