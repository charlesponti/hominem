import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { dataEnvelopeSchema, parseDataEnvelope } from './response';

describe('RPC response helpers', () => {
  const userSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
  });

  it('derives a data envelope from the runtime response schema', () => {
    const parsed = parseDataEnvelope(userSchema, {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ada',
    });

    expect(parsed).toEqual({
      data: {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Ada',
      },
    });
    expect(dataEnvelopeSchema(userSchema).parse(parsed.data)).toEqual(parsed);
  });

  it('rejects response data that does not match the schema', () => {
    expect(() => parseDataEnvelope(userSchema, { id: 'not-a-uuid', name: 'Ada' })).toThrow();
  });
});
