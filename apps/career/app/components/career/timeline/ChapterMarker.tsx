import type { CareerPositionRecord } from '@hominem/db';

function formatTenure(startDate: string | null, endDate: string | null): string {
  const start = startDate
    ? new Date(startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;
  if (!start) return endDate ? 'Ended' : 'Ongoing';

  const end = endDate
    ? new Date(endDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : 'present';

  return `${start} – ${end}`;
}

export function ChapterMarker({ workExperience }: { workExperience: CareerPositionRecord }) {
  return (
    <div className="relative pb-4 pl-7">
      <div className="absolute top-0.5 left-[-2px] h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-foreground bg-background" />
      <p className="heading-4 text-foreground">{workExperience.title}</p>
      <p className="body-3 text-muted-foreground">
        {workExperience.company} ·{' '}
        <span className="text-muted-foreground/70">
          {formatTenure(workExperience.startDate, workExperience.endDate)}
        </span>
      </p>
    </div>
  );
}
