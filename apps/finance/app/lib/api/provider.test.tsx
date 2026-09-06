import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import { FinanceHonoProvider, useFinanceApiClient } from './provider';

function Consumer() {
  const client = useFinanceApiClient();
  return <div data-testid="shape">{client.transactions ? 'yes' : 'no'}</div>;
}

describe('useFinanceApiClient', () => {
  it('throws when called outside FinanceHonoProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Consumer />)).toThrow(
        /useFinanceApiClient must be used within FinanceHonoProvider/,
      );
    } finally {
      console.error = consoleError;
    }
  });
});

describe('FinanceHonoProvider', () => {
  it('provides a finance-shaped client to descendants', () => {
    render(
      <FinanceHonoProvider baseUrl="http://test.local">
        <Consumer />
      </FinanceHonoProvider>,
    );

    expect(screen.getByTestId('shape').textContent).toBe('yes');
  });

  it('keeps the same client instance across re-renders', () => {
    let first: unknown;
    let second: unknown;

    function IdentityConsumer({ onRender }: { onRender: (client: unknown) => void }) {
      const client = useFinanceApiClient();
      useEffect(() => onRender(client), [client, onRender]);
      return null;
    }

    const { rerender } = render(
      <FinanceHonoProvider baseUrl="http://test.local">
        <IdentityConsumer onRender={(c) => (first = c)} />
      </FinanceHonoProvider>,
    );

    rerender(
      <FinanceHonoProvider baseUrl="http://test.local">
        <IdentityConsumer onRender={(c) => (second = c)} />
      </FinanceHonoProvider>,
    );

    expect(second).toBe(first);
  });
});
