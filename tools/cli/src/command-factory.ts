import { z } from 'zod';

import type { CommandDefinition } from './contracts';

export function createCommand<TArgs extends z.ZodTypeAny, TFlags extends z.ZodTypeAny, TOutput>(
  definition: CommandDefinition<TArgs, TFlags, TOutput>,
): CommandDefinition<TArgs, TFlags, TOutput> {
  return definition;
}
