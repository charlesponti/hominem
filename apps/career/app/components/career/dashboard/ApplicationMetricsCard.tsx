import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';
import { colorThemes } from '@ponti-studios/ui/tokens';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { SourcePerformance, StatusBreakdown } from '~/lib/career/queries/dashboard-stats';

const colors = colorThemes.light;
const PALETTE = [
  colors.primary,
  colors.success,
  colors.warning,
  colors.destructive,
  colors['chart-neutral'],
];

interface ApplicationMetricsCardProps {
  statusBreakdown: StatusBreakdown;
  sourcePerformance: SourcePerformance;
}

export function ApplicationMetricsCard({
  statusBreakdown,
  sourcePerformance,
}: ApplicationMetricsCardProps) {
  const statusData = useMemo(
    () =>
      statusBreakdown.map((item) => ({
        name: item.status,
        value: item.count,
      })),
    [statusBreakdown],
  );

  const hasStatusData = statusData.some((item) => item.value > 0);
  const hasSourceData = sourcePerformance.length > 0;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>Pipeline breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasStatusData ? (
          <div>
            <div className="h-48 w-full max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip labelStyle={{ color: colors['text-primary'] }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 space-y-1">
              {statusData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
                    />
                    {item.name}
                  </span>
                  <span className="font-medium text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="body-3 text-muted-foreground">No applications to break down yet.</p>
        )}

        {hasSourceData && (
          <div className="border-t border-dashed border-border pt-4">
            <p className="ui-eyebrow mb-3">Applications by source</p>
            <div className="space-y-2">
              {sourcePerformance.map((source) => (
                <div key={source.source} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{source.source}</span>
                  <span className="font-medium text-foreground">{source.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
