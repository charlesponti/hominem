import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';

export function validateWithZod<T>(schema: ZodSchema, data: unknown): T {
  try {
    return schema.parse(data) as T;
  } catch (error) {
    if (error instanceof ZodError) {
      const messages = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(', ');
      throw new Error(`Validation failed: ${messages}`);
    }
    throw error;
  }
}
