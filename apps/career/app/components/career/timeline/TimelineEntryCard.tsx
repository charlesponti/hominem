import { Badge, Card, CardContent } from '@ponti-studios/ui/primitives';

import type { TimelineEntry } from '~/lib/career/queries/career-timeline';

const TYPE_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  position: 'default',
  education: 'secondary',
  application: 'outline',
};

const TYPE_LABEL: Record<string, string> = {
  position: 'Position',
  education: 'Education',
  application: 'Application',
};

function formatEntryDate(date: string | null): string {
  if (!date) return 'Unknown date';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TimelineEntryCard({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="relative pb-4 pl-7">
      <div className="absolute top-2 left-0 h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
      <Card>
        <CardContent>
          <div className="flex items-baseline justify-between gap-3">
            <p className="body-2 font-medium text-foreground">{entry.title}</p>
            <span className="footnote shrink-0 whitespace-nowrap text-muted-foreground">
              {formatEntryDate(entry.startDate)}
            </span>
          </div>
          {entry.subtitle && (
            <p className="body-3 text-muted-foreground leading-relaxed">{entry.subtitle}</p>
          )}
          <Badge variant={TYPE_BADGE_VARIANT[entry.type] ?? 'secondary'} className="mt-1 w-fit">
            {TYPE_LABEL[entry.type] ?? entry.type}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
