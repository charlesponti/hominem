import { z } from 'zod';

import { ValidationError } from '../errors';

const resourceIdSchema = z.string().uuid();

function getResourceId(
  c: { req: { param: (name: string) => string | undefined } },
  name: string,
  label: string,
): string {
  const value = c.req.param(name);
  if (!value) throw new ValidationError(`${label} is required`);
  if (!resourceIdSchema.safeParse(value).success) throw new ValidationError(`Invalid ${label}`);
  return value;
}

export function getChatId(c: { req: { param: (name: string) => string | undefined } }): string {
  return getResourceId(c, 'id', 'chat id');
}

export function getMessageId(c: { req: { param: (name: string) => string | undefined } }): string {
  return getResourceId(c, 'messageId', 'message id');
}

export function getGenerationId(c: {
  req: { param: (name: string) => string | undefined };
}): string {
  return getResourceId(c, 'generationId', 'generation id');
}
