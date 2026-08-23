import type { UsageFeatureBreakdown, UsageModelBreakdown } from '@hominem/rpc/types';
import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '~/components/ui/button';
import { useUsageReport, useUsageTimeseries } from '~/hooks/use-usage';

const usdFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const preciseUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 12,
});
const numberFormatter = new Intl.NumberFormat('en-US');
const preciseNumberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 12 });
const periodFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const featureLabels: Record<string, string> = {
  chat_stream: 'Chat',
  text_enhance: 'Text enhancement',
  note_generate: 'Note generation',
  task_extract: 'Task extraction',
  voice_task_extract: 'Voice task extraction',
  time_block_extract: 'Time block extraction',
  voice_cleanup: 'Voice cleanup',
  chat_speech: 'Chat speech',
  embedding: 'Embeddings',
  mcp_tool_call: 'MCP tool calls',
  career_resume_convert: 'Resume conversion',
  career_resume_customize: 'Resume customization',
  career_job_scrape: 'Job scraping',
  career_skills_derive: 'Skill derivation',
  file_image_analyze: 'Image analysis',
  file_document_summarize: 'Document summarization',
};

function formatUsd(value: number, precise = false) {
  return (precise ? preciseUsdFormatter : usdFormatter).format(value);
}

function formatNumber(value: number, precise = false) {
  return (precise ? preciseNumberFormatter : numberFormatter).format(value);
}

function formatFeature(feature: string) {
  return featureLabels[feature] ?? feature.replaceAll('_', ' ');
}

function UsageTable({
  rows,
  kind,
  precise,
}: {
  rows: UsageFeatureBreakdown[] | UsageModelBreakdown[];
  kind: 'feature' | 'model';
  precise: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">{kind === 'feature' ? 'Feature' : 'Model'}</th>
            <th className="px-3 py-2 text-right font-medium">Requests</th>
            <th className="px-3 py-2 text-right font-medium">Input tokens</th>
            <th className="px-3 py-2 text-right font-medium">Output tokens</th>
            <th className="px-3 py-2 text-right font-medium">Total tokens</th>
            <th className="px-3 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const featureRow = row as UsageFeatureBreakdown;
            const modelRow = row as UsageModelBreakdown;
            const label =
              kind === 'feature'
                ? formatFeature(featureRow.feature)
                : (modelRow.model ?? 'Unknown model');
            const rowKey = kind === 'feature' ? featureRow.feature : (modelRow.model ?? 'unknown');
            return (
              <tr key={rowKey}>
                <th className="px-3 py-3 font-medium">{label}</th>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.requestCount, precise)}
                  {row.failedCount ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({row.failedCount} failed)
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.promptTokens, precise)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.completionTokens, precise)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatNumber(row.totalTokens, precise)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">
                  {formatUsd(row.totalCostUsd, precise)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const chartColors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];

function getCurrentMonthInputRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  return { from: toInputDate(from), to: toInputDate(to) };
}

function toInputDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toExclusiveIsoDate(input: string): string {
  const date = new Date(`${input}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

function getModelLabel(model: string | null): string {
  return model ?? 'Unknown model';
}

function UsageTrendsChart() {
  const initialRange = useMemo(getCurrentMonthInputRange, []);
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const [metric, setMetric] = useState<'requests' | 'price'>('requests');
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const options = useMemo(
    () => ({ from: `${from}T00:00:00.000Z`, to: toExclusiveIsoDate(to), granularity }),
    [from, granularity, to],
  );
  const { data, error, isPending, refetch } = useUsageTimeseries(options);
  const allModels = useMemo(
    () => [...new Set(data?.points.map((point) => getModelLabel(point.model)) ?? [])],
    [data],
  );
  const chart = useMemo(() => {
    if (!data) return { modelNames: [], data: [] };
    const selectedPoints = data.points.filter(
      (point) => selectedModels === null || selectedModels.includes(getModelLabel(point.model)),
    );
    const modelNames = [...new Set(selectedPoints.map((point) => getModelLabel(point.model)))];
    const buckets = new Map<string, Record<string, number>>();
    for (const point of selectedPoints) {
      const values = buckets.get(point.bucketStart) ?? {};
      const model = getModelLabel(point.model);
      values[model] =
        (values[model] ?? 0) + (metric === 'requests' ? point.requestCount : point.totalCostUsd);
      buckets.set(point.bucketStart, values);
    }
    return {
      modelNames,
      data: [...buckets.entries()].map(([bucketStart, values]) => ({
        name: bucketStart,
        ...Object.fromEntries(modelNames.map((model) => [model, values[model] ?? 0])),
      })),
    };
  }, [data, metric, selectedModels]);
  const hasUnavailablePrice =
    metric === 'price' &&
    (data?.points.some((point) => point.requestCount > point.usageAvailableCount) ?? false);

  const toggleModel = (model: string) => {
    if (selectedModels === null) {
      setSelectedModels(allModels.filter((currentModel) => currentModel !== model));
      return;
    }
    if (selectedModels.includes(model)) {
      if (selectedModels.length > 1) {
        setSelectedModels(selectedModels.filter((currentModel) => currentModel !== model));
      }
      return;
    }
    const next = [...selectedModels, model];
    setSelectedModels(next.length === allModels.length ? null : next);
  };

  return (
    <section className="space-y-4 border-t border-border pt-6" aria-labelledby="usage-trends-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="usage-trends-title" className="text-base font-semibold">
            Usage trends
          </h2>
          <p className="text-sm text-muted-foreground">Compare AI requests and price over time.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Usage chart controls">
          <Button
            aria-pressed={granularity === 'day'}
            onClick={() => setGranularity('day')}
            size="sm"
            variant={granularity === 'day' ? 'default' : 'outline'}
          >
            Day
          </Button>
          <Button
            aria-pressed={granularity === 'month'}
            onClick={() => setGranularity('month')}
            size="sm"
            variant={granularity === 'month' ? 'default' : 'outline'}
          >
            Month
          </Button>
          <Button
            aria-pressed={metric === 'requests'}
            onClick={() => setMetric('requests')}
            size="sm"
            variant={metric === 'requests' ? 'default' : 'outline'}
          >
            Requests
          </Button>
          <Button
            aria-pressed={metric === 'price'}
            onClick={() => setMetric('price')}
            size="sm"
            variant={metric === 'price' ? 'default' : 'outline'}
          >
            Price
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">From</span>
          <input
            aria-label="Usage trends from"
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            onChange={(event) => setFrom(event.target.value)}
            type="date"
            value={from}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">To</span>
          <input
            aria-label="Usage trends to"
            className="h-8 rounded-md border border-border bg-background px-2 text-sm"
            onChange={(event) => setTo(event.target.value)}
            type="date"
            value={to}
          />
        </label>
        {allModels.length ? (
          <div className="flex flex-wrap gap-2" aria-label="AI models">
            {allModels.map((model, index) => {
              const isSelected = selectedModels === null || selectedModels.includes(model);
              return (
                <Button
                  aria-pressed={isSelected}
                  key={model}
                  onClick={() => toggleModel(model)}
                  size="sm"
                  variant={isSelected ? 'secondary' : 'outline'}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: chartColors[index % chartColors.length] }}
                  />
                  {model}
                </Button>
              );
            })}
          </div>
        ) : null}
      </div>

      {isPending ? <p className="text-sm text-muted-foreground">Loading usage trends…</p> : null}
      {error ? (
        <div className="space-y-3">
          <p className="text-sm text-destructive">Usage trends unavailable.</p>
          <Button onClick={() => void refetch()} variant="secondary">
            Try again
          </Button>
        </div>
      ) : null}
      {!isPending && !error && !chart.data.length ? (
        <p className="text-sm text-muted-foreground">No usage in the selected range.</p>
      ) : null}
      {chart.data.length ? (
        <div className="h-80 w-full" data-testid="usage-trends-chart">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chart.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickFormatter={(value: string) =>
                  new Intl.DateTimeFormat(
                    'en-US',
                    granularity === 'day'
                      ? { month: 'short', day: 'numeric', timeZone: 'UTC' }
                      : { month: 'short', year: 'numeric', timeZone: 'UTC' },
                  ).format(new Date(value))
                }
              />
              <YAxis
                allowDecimals={metric === 'price'}
                tickFormatter={(value: number) =>
                  metric === 'price' ? formatUsd(value, true) : formatNumber(value)
                }
              />
              <Tooltip
                labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
                formatter={(value, name) => [
                  metric === 'price' ? formatUsd(Number(value), true) : formatNumber(Number(value)),
                  String(name),
                ]}
              />
              <Legend />
              {chart.modelNames.map((model, index) => (
                <Bar
                  dataKey={model}
                  fill={chartColors[index % chartColors.length]}
                  key={model}
                  stackId="usage"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {hasUnavailablePrice ? (
        <p className="text-xs text-muted-foreground">
          Some requests did not include provider pricing and are excluded from the price total.
        </p>
      ) : null}
    </section>
  );
}

export function UsagePage() {
  const { data: report, error, isPending, refetch } = useUsageReport();
  const [showPreciseValues, setShowPreciseValues] = useState(false);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Button aria-label="Back to account settings" asChild size="icon-sm" variant="ghost">
          <Link to="/settings">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI usage</h1>
          <p className="text-sm text-muted-foreground">
            See how your AI allowance is being used this month.
          </p>
        </div>
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted-foreground">
          <input
            checked={showPreciseValues}
            className="size-4 accent-foreground"
            onChange={(event) => setShowPreciseValues(event.target.checked)}
            type="checkbox"
          />
          Show exact values
        </label>
      </div>

      <div className="space-y-8 rounded-xl border border-border bg-card p-5 sm:p-7">
        {isPending ? <p className="text-sm text-muted-foreground">Loading usage…</p> : null}
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">Usage unavailable.</p>
            <Button onClick={() => void refetch()} variant="secondary">
              Try again
            </Button>
          </div>
        ) : null}
        {report ? (
          <>
            <section className="space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">
                  {periodFormatter.format(new Date(report.range.from))}
                </h2>
                <span className="text-sm text-muted-foreground">
                  {formatUsd(report.monthly.totalCostUsd, showPreciseValues)} of{' '}
                  {formatUsd(report.monthly.limitUsd, showPreciseValues)}
                </span>
              </div>
              <progress
                aria-label={`AI usage: ${Math.min(100, (report.monthly.totalCostUsd / report.monthly.limitUsd) * 100).toFixed(0)}%`}
                className="h-2 w-full appearance-none overflow-hidden rounded-full border bg-border [&::-moz-progress-bar]:rounded-full [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-value]:bg-foreground"
                max={100}
                value={Math.min(100, (report.monthly.totalCostUsd / report.monthly.limitUsd) * 100)}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Remaining"
                  value={formatUsd(report.monthly.remainingUsd, showPreciseValues)}
                />
                <Metric
                  label="Requests"
                  value={formatNumber(report.summary.requestCount, showPreciseValues)}
                />
                <Metric
                  label="Total tokens"
                  value={formatNumber(report.summary.totalTokens, showPreciseValues)}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {report.monthly.isOverLimit
                  ? "You've reached this month's free AI usage limit."
                  : 'Resets at the start of next month.'}
                {report.summary.lastRecordedAt
                  ? ` Last recorded ${new Date(report.summary.lastRecordedAt).toLocaleString()}.`
                  : ''}
              </p>
            </section>

            {report.byFeature.length || report.byModel.length ? (
              <>
                <section className="space-y-3 border-t border-border pt-6">
                  <h2 className="text-base font-semibold">Usage by feature</h2>
                  <UsageTable kind="feature" precise={showPreciseValues} rows={report.byFeature} />
                </section>
                <section className="space-y-3 border-t border-border pt-6">
                  <h2 className="text-base font-semibold">Usage by model</h2>
                  <UsageTable kind="model" precise={showPreciseValues} rows={report.byModel} />
                </section>
              </>
            ) : (
              <section className="border-t border-border pt-6">
                <h2 className="font-medium">No AI usage yet</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your feature and model breakdowns will appear here after you use an AI feature.
                </p>
              </section>
            )}
            <UsageTrendsChart />
          </>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
