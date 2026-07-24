import { Badge, Card, CardContent } from '@ponti-studios/ui/primitives';

import { replaceUnderscores } from '@hominem/utils/text';

import type { TimelineEntry } from '~/lib/career/queries/career-timeline';

const STATUS_PILL_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OFFER: 'default',
  ACCEPTED: 'default',
  REJECTED: 'destructive',
  WITHDRAWN: 'outline',
};

function formatEntryDate(date: string): string {
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
        <CardContent className="flex flex-col gap-1 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="body-2 font-medium text-foreground">{entry.title}</p>
            <span className="footnote shrink-0 whitespace-nowrap text-muted-foreground">
              {formatEntryDate(entry.date)}
            </span>
          </div>
          {entry.subtitle && (
            <p className="body-3 text-muted-foreground leading-relaxed">{entry.subtitle}</p>
          )}
          {entry.statusPill && (
            <Badge
              variant={STATUS_PILL_VARIANT[entry.statusPill] ?? 'secondary'}
              className="mt-1 w-fit"
            >
              {replaceUnderscores(entry.statusPill)}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
