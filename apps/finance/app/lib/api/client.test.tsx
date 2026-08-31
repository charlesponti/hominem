import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { useHonoQuery } from './client';
import { FinanceHonoProvider } from './provider';

function wrapper({ children }: { children: ReactNode }) {
  return <FinanceHonoProvider baseUrl="http://test.local">{children}</FinanceHonoProvider>;
}

describe('useHonoQuery (finance-scoped)', () => {
  it('resolves a finance client without needing career/chats/notes mock data', async () => {
    const { result } = renderHook(
      () =>
        useHonoQuery(['finance-client-shape'], async ({ finance }) => {
          return Boolean(finance.transactions);
        }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(true);
  });
});
