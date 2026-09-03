import { describe, expect, it } from 'vitest';

import { resolveAiProvider, resolveEmailProvider } from './provider-mode';

describe('provider mode', () => {
  it('selects both scripted providers with ENV=scripted', () => {
    expect(resolveAiProvider({ ENV: 'scripted' })).toBe('scripted');
    expect(
      resolveEmailProvider({
        ENV: 'scripted',
        NODE_ENV: 'production',
      }),
    ).toBe('scripted');
  });

  it('keeps the existing defaults outside scripted mode', () => {
    expect(resolveAiProvider({ ENV: undefined })).toBe('openrouter');
    expect(
      resolveEmailProvider({
        ENV: undefined,
        NODE_ENV: 'production',
      }),
    ).toBe('resend');
    expect(
      resolveEmailProvider({
        ENV: undefined,
        NODE_ENV: 'development',
      }),
    ).toBe('scripted');
  });
});
