import type { Meta, StoryObj } from '@storybook/react-vite';
import { http, HttpResponse } from 'msw';

import { UsagePage } from './usage-page';

const report = {
  range: { from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
  monthly: {
    totalCostUsd: 1.42,
    limitUsd: 5,
    remainingUsd: 3.58,
    isOverLimit: false,
    periodStart: '2026-08-01T00:00:00.000Z',
    periodEnd: '2026-09-01T00:00:00.000Z',
  },
  summary: {
    requestCount: 42,
    succeededCount: 40,
    failedCount: 2,
    usageAvailableCount: 40,
    promptTokens: 12000,
    completionTokens: 4800,
    totalTokens: 16800,
    totalCostUsd: 1.42,
    lastRecordedAt: '2026-08-23T12:00:00.000Z',
  },
  byFeature: [
    {
      feature: 'chat_stream',
      requestCount: 42,
      succeededCount: 40,
      failedCount: 2,
      usageAvailableCount: 40,
      promptTokens: 12000,
      completionTokens: 4800,
      totalTokens: 16800,
      totalCostUsd: 1.42,
    },
  ],
  byModel: [
    {
      model: 'openai/gpt-4o-mini',
      requestCount: 42,
      succeededCount: 40,
      failedCount: 2,
      usageAvailableCount: 40,
      promptTokens: 12000,
      completionTokens: 4800,
      totalTokens: 16800,
      totalCostUsd: 1.42,
    },
  ],
};

const points = [
  {
    bucketStart: '2026-08-20T00:00:00.000Z',
    model: 'openai/gpt-4o-mini',
    requestCount: 12,
    usageAvailableCount: 12,
    totalCostUsd: 0.42,
  },
  {
    bucketStart: '2026-08-21T00:00:00.000Z',
    model: 'openai/gpt-4o-mini',
    requestCount: 18,
    usageAvailableCount: 17,
    totalCostUsd: 0.51,
  },
];

const meta = {
  title: 'Account/Usage Page',
  component: UsagePage,
} satisfies Meta<typeof UsagePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithUsage: Story = {
  beforeEach({ msw }) {
    msw.use(
      http.get('/api/usage', () => HttpResponse.json(report)),
      http.get('/api/usage-timeseries', () =>
        HttpResponse.json({ ...report.range, granularity: 'day', points }),
      ),
    );
  },
};
export const Loading: Story = {
  beforeEach({ msw }) {
    msw.use(http.get('/api/usage', async () => new Promise(() => undefined)));
  },
};
export const Error: Story = {
  beforeEach({ msw }) {
    msw.use(http.get('/api/usage', () => HttpResponse.error()));
  },
};
