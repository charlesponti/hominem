import { describe, expect, it } from 'vitest';

import { DEFAULT_TRANSFERS_FILTERS, parseTransfersParams, parseTrueUpForm } from './inputs';

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

describe('parseTrueUpForm', () => {
  it('accepts a complete submission', () => {
    expect(
      parseTrueUpForm(
        form({
          accountId: 'acc-1',
          balance: '-2717.99',
          date: '2026-09-01',
          note: 'Copilot reading',
          force: 'on',
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        accountId: 'acc-1',
        targetBalance: -2717.99,
        date: '2026-09-01',
        note: 'Copilot reading',
        force: true,
      },
    });
  });

  it('defaults date, note, and force when omitted', () => {
    expect(parseTrueUpForm(form({ accountId: 'acc-1', balance: '100' }))).toEqual({
      ok: true,
      value: { accountId: 'acc-1', targetBalance: 100, force: false },
    });
  });

  it('rejects missing accounts, non-numeric balances, and bad dates', () => {
    expect(parseTrueUpForm(form({ balance: '100' })).ok).toBe(false);
    expect(parseTrueUpForm(form({ accountId: 'acc-1', balance: 'lots' })).ok).toBe(false);
    expect(parseTrueUpForm(form({ accountId: 'acc-1', balance: '' })).ok).toBe(false);
    expect(
      parseTrueUpForm(form({ accountId: 'acc-1', balance: '100', date: '09/01/2026' })).ok,
    ).toBe(false);
    expect(
      parseTrueUpForm(form({ accountId: 'acc-1', balance: '100', date: '2026-02-30' })).ok,
    ).toBe(false);
  });
});

describe('parseTransfersParams', () => {
  it('parses valid filters', () => {
    expect(parseTransfersParams(new URLSearchParams('windowDays=5&minAmount=25&limit=10'))).toEqual(
      { windowDays: 5, minAmount: 25, limit: 10 },
    );
  });

  it('falls back to defaults on missing or invalid values', () => {
    expect(parseTransfersParams(new URLSearchParams(''))).toEqual(DEFAULT_TRANSFERS_FILTERS);
    expect(
      parseTransfersParams(new URLSearchParams('windowDays=-1&minAmount=nope&limit=99999')),
    ).toEqual(DEFAULT_TRANSFERS_FILTERS);
  });
});
