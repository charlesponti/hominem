import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';
import { colorThemes } from '@ponti-studios/ui/tokens';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import type { MonthlyActivity } from '~/lib/career/queries/dashboard-stats';

const colors = colorThemes.light;
const PRIMARY = colors.primary;

interface ActivityChartProps {
  data: MonthlyActivity[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        name: point.month,
        Applications: point.count,
      })),
    [data],
  );

  if (chartData.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Application activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="body-3 text-muted-foreground">No applications yet this year.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Application activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full max-w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'var(--color-muted)' }}
                labelStyle={{ color: colors['text-primary'] }}
              />
              <Bar dataKey="Applications" fill={PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
