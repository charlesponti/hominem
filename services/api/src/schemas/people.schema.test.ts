import { describe, expect, it } from 'vitest';

import { peopleSearchInputSchema, personCreateSchema } from './people.schema';

describe('people schemas', () => {
  it('accepts a person name with an optional email', () => {
    expect(
      personCreateSchema.parse({ displayName: 'Maya Chen', email: 'maya@example.com' }),
    ).toEqual({ displayName: 'Maya Chen', email: 'maya@example.com' });
    expect(personCreateSchema.parse({ displayName: 'Alex Rivera' })).toEqual({
      displayName: 'Alex Rivera',
    });
  });

  it('requires a non-empty people search query', () => {
    expect(peopleSearchInputSchema.parse({ query: 'maya' }).limit).toBe(10);
    expect(() => peopleSearchInputSchema.parse({ query: '  ' })).toThrow();
  });
});
