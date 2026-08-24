// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UsagePage } from './usage-page';

const useUsageTimeseries = vi.hoisted(() =>
  vi.fn(() => ({
    data: {
      range: { from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
      granularity: 'day' as const,
      points: [
        {
          bucketStart: '2026-08-01T00:00:00.000Z',
          model: 'model-a',
          requestCount: 2,
          usageAvailableCount: 2,
          totalCostUsd: 0.2,
        },
        {
          bucketStart: '2026-08-01T00:00:00.000Z',
          model: 'model-b',
          requestCount: 1,
          usageAvailableCount: 0,
          totalCostUsd: 0,
        },
      ],
    },
    error: null,
    isPending: false,
    refetch: vi.fn(),
  })),
);

vi.mock('react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/settings">{children}</a>,
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({ children, ...props }: ComponentProps<'button'>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('~/hooks/use-usage', () => ({
  useUsageReport: () => ({
    data: {
      range: { from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
      monthly: {
        totalCostUsd: 0.001305,
        limitUsd: 1,
        remainingUsd: 0.998695,
        isOverLimit: false,
        periodStart: '2026-08-01T00:00:00.000Z',
        periodEnd: '2026-09-01T00:00:00.000Z',
      },
      summary: {
        requestCount: 1,
        succeededCount: 1,
        failedCount: 0,
        usageAvailableCount: 1,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        totalCostUsd: 0.001305,
        lastRecordedAt: '2026-08-23T17:38:29.000Z',
      },
      byFeature: [
        {
          feature: 'chat_speech',
          requestCount: 1,
          succeededCount: 1,
          failedCount: 0,
          usageAvailableCount: 1,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          totalCostUsd: 0.001305,
        },
      ],
      byModel: [],
    },
    error: null,
    isPending: false,
    refetch: vi.fn(),
  }),
  useUsageTimeseries,
}));

afterEach(() => cleanup());

describe('UsagePage', () => {
  it('reveals precise costs when exact values are enabled', () => {
    render(<UsagePage />);

    expect(screen.getAllByText('$0.00')).not.toHaveLength(0);
    expect(screen.queryAllByText('$0.001305')).toHaveLength(0);

    fireEvent.click(screen.getByLabelText('Show exact values'));

    expect(screen.getAllByText('$0.001305')).not.toHaveLength(0);
    expect(screen.queryAllByText('$0.00')).toHaveLength(0);
  });

  it('supports changing granularity, metric, and model selection', async () => {
    render(<UsagePage />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Month' })).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'Month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Price' }));
    fireEvent.click(screen.getByRole('button', { name: 'model-a' }));

    expect(screen.getByRole('button', { name: 'Month' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Price' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'model-a' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    expect(useUsageTimeseries).toHaveBeenLastCalledWith(
      expect.objectContaining({ granularity: 'month' }),
    );
  });
});
