import { createInsertSchema } from 'drizzle-zod';
import { users } from './users.schema';

export const UserSchema = createInsertSchema(users);

export type UserSchemaType = typeof UserSchema;
