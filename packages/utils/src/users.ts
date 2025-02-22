import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { users } from './db/schema/users.schema'

export const UserInsertSchema = createInsertSchema(users)
export const UserSelectSchema = createSelectSchema(users)
