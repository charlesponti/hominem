import { useMemo, useState } from 'react';
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
import { useUsageTimeseries } from '~/hooks/use-usage';

const colors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];
const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 12,
});
const number = new Intl.NumberFormat('en-US');

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}
function formatModel(model: string | null) {
  return model ?? 'Unknown model';
}
function currentRange() {
  const now = new Date();
  return {
    from: dateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
    to: dateInput(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))),
  };
}
function exclusiveDate(input: string) {
  const date = new Date(`${input}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export function UsageTrendsChart() {
  const range = useMemo(currentRange, []);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [granularity, setGranularity] = useState<'day' | 'month'>('day');
  const [metric, setMetric] = useState<'requests' | 'price'>('requests');
  const [selectedModels, setSelectedModels] = useState<string[] | null>(null);
  const options = useMemo(
    () => ({ from: `${from}T00:00:00.000Z`, to: exclusiveDate(to), granularity }),
    [from, granularity, to],
  );
  const { data, error, isPending, refetch } = useUsageTimeseries(options);
  const models = useMemo(
    () => [...new Set(data?.points.map((point) => formatModel(point.model)) ?? [])],
    [data],
  );
  const chart = useMemo(() => {
    if (!data) return { names: [], rows: [] };
    const points = data.points.filter(
      (point) => selectedModels === null || selectedModels.includes(formatModel(point.model)),
    );
    const names = [...new Set(points.map((point) => formatModel(point.model)))];
    const buckets = new Map<string, Record<string, number>>();
    for (const point of points) {
      const values = buckets.get(point.bucketStart) ?? {};
      const model = formatModel(point.model);
      values[model] =
        (values[model] ?? 0) + (metric === 'requests' ? point.requestCount : point.totalCostUsd);
      buckets.set(point.bucketStart, values);
    }
    return {
      names,
      rows: [...buckets.entries()].map(([name, values]) => ({
        name,
        ...Object.fromEntries(names.map((model) => [model, values[model] ?? 0])),
      })),
    };
  }, [data, metric, selectedModels]);
  const toggleModel = (model: string) => {
    if (selectedModels === null) return setSelectedModels(models.filter((item) => item !== model));
    if (selectedModels.includes(model))
      return setSelectedModels(
        selectedModels.length > 1
          ? selectedModels.filter((item) => item !== model)
          : selectedModels,
      );
    const next = [...selectedModels, model];
    setSelectedModels(next.length === models.length ? null : next);
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
        {models.length ? (
          <div className="flex flex-wrap gap-2" aria-label="AI models">
            {models.map((model, index) => (
              <Button
                aria-pressed={selectedModels === null || selectedModels.includes(model)}
                key={model}
                onClick={() => toggleModel(model)}
                size="sm"
                variant={
                  selectedModels === null || selectedModels.includes(model)
                    ? 'secondary'
                    : 'outline'
                }
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {model}
              </Button>
            ))}
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
      {!isPending && !error && !chart.rows.length ? (
        <p className="text-sm text-muted-foreground">No usage in the selected range.</p>
      ) : null}
      {chart.rows.length ? (
        <div className="h-80 w-full" data-testid="usage-trends-chart">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chart.rows} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
                  metric === 'price' ? usd.format(value) : number.format(value)
                }
              />
              <Tooltip labelFormatter={(value) => new Date(String(value)).toLocaleDateString()} />
              <Legend />
              {chart.names.map((model, index) => (
                <Bar
                  dataKey={model}
                  fill={colors[index % colors.length]}
                  key={model}
                  stackId="usage"
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {metric === 'price' &&
      (data?.points.some((point) => point.requestCount > point.usageAvailableCount) ?? false) ? (
        <p className="text-xs text-muted-foreground">
          Some requests did not include provider pricing and are excluded from the price total.
        </p>
      ) : null}
    </section>
  );
}
