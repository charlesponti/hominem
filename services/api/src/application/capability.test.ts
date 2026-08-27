import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { defineCapability, parseCapabilityInput, parseCapabilityOutput } from './capability';

describe('capability foundation', () => {
  const capability = defineCapability({
    name: 'finance.monthly_summary',
    title: 'Monthly finance summary',
    description: 'Returns monthly finance metadata.',
    inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(25) }),
    outputSchema: z.object({ events: z.array(z.object({ title: z.string() })) }),
    readOnly: true,
    scopes: ['finance:read'],
    resultCap: 50,
  });

  it('parses inputs and outputs from the registered runtime schemas', () => {
    expect(parseCapabilityInput(capability, {})).toEqual({ limit: 25 });
    expect(parseCapabilityOutput(capability, { events: [{ title: 'Dinner' }] })).toEqual({
      events: [{ title: 'Dinner' }],
    });
  });

  it('rejects invalid schema input before service invocation', () => {
    expect(() => parseCapabilityInput(capability, { limit: 100 })).toThrow();
  });
});
