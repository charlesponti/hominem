import { Card, CardContent } from '@ponti-studios/ui/primitives';
import { BriefcaseIcon, CheckCircle2Icon, RocketIcon, XCircleIcon } from 'lucide-react';

interface MetricsGridProps {
  totalApplications: number;
  activeApplications: number;
  rejectedApplications: number;
  offerCount: number;
}

export function MetricsGrid({
  totalApplications,
  activeApplications,
  rejectedApplications,
  offerCount,
}: MetricsGridProps) {
  const metrics = [
    {
      label: 'Total applications',
      value: totalApplications,
      icon: BriefcaseIcon,
      color: 'text-foreground',
    },
    {
      label: 'Active',
      value: activeApplications,
      icon: RocketIcon,
      color: 'text-primary',
    },
    {
      label: 'Rejected',
      value: rejectedApplications,
      icon: XCircleIcon,
      color: 'text-warning',
    },
    {
      label: 'Offers',
      value: offerCount,
      icon: CheckCircle2Icon,
      color: 'text-success',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="border-border bg-card">
          <CardContent className="flex items-center justify-between gap-3 pt-6">
            <div>
              <p className="display-2 text-foreground">{metric.value}</p>
              <p className="body-3 mt-1 text-muted-foreground">{metric.label}</p>
            </div>
            <metric.icon className={`size-8 ${metric.color}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
