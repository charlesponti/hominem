import { describe, expect, it } from 'vitest';

import { careerMcpProfileSchema } from './career.schema';

describe('career MCP profile schema', () => {
  it('omits contact information from the MCP projection', () => {
    const profile = careerMcpProfileSchema.parse({
      id: '11111111-1111-4111-8111-111111111111',
      firstName: 'Ada',
      lastName: 'Lovelace',
      headline: 'Engineer',
      summary: 'Builds useful things.',
      email: 'ada@example.com',
      phone: '+1 555 0100',
      location: 'London',
      industry: 'Technology',
      linkedinUrl: 'https://linkedin.com/in/ada',
      websites: null,
      twitterHandles: null,
    });

    expect(profile).not.toHaveProperty('email');
    expect(profile).not.toHaveProperty('phone');
    expect(profile).toMatchObject({ firstName: 'Ada', location: 'London' });
  });
});
