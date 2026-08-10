import { centsToDollars } from '@hominem/utils/numbers';
import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';
import { colorThemes } from '@ponti-studios/ui/tokens';
import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SalaryPoint } from '~/lib/career/queries/dashboard-stats';

const colors = colorThemes.light;
const SUCCESS = colors.success;

interface SalaryChartProps {
  data: SalaryPoint[];
}

function formatDollars(value: number): string {
  const dollars = centsToDollars(value);
  if (dollars >= 1000) return `$${(dollars / 1000).toFixed(0)}k`;
  return `$${dollars.toFixed(0)}`;
}

export function SalaryChart({ data }: SalaryChartProps) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        name: point.year,
        'Average base salary': point.averageBaseSalary,
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Salary history</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-3 text-muted-foreground">Offers with salary data will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Salary history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full max-w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatDollars(Number(value))}
              />
              <Tooltip
                labelStyle={{ color: colors['text-primary'] }}
                formatter={(value) => [formatDollars(Number(value)), 'Avg. base salary']}
              />
              <Line
                type="monotone"
                dataKey="Average base salary"
                stroke={SUCCESS}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
