import type { CareerStoryTimeline } from '~/lib/career/queries/career-timeline';

import { TimelineEntryCard } from './TimelineEntryCard';

/**
 * Groups timeline entries by year from startDate.
 * Years are sorted descending. Undated entries go to the end in a catch-all group.
 */
function groupByYear(timeline: CareerStoryTimeline) {
  const years = new Map<number, CareerStoryTimeline>();
  let undated: CareerStoryTimeline = [];

  for (const entry of timeline) {
    if (entry.startDate) {
      const year = new Date(entry.startDate).getFullYear();
      const bucket = years.get(year) ?? [];
      bucket.push(entry);
      years.set(year, bucket);
    } else {
      undated.push(entry);
    }
  }

  const sorted = [...years.entries()].sort(([a], [b]) => b - a);
  return { groups: sorted, undated };
}

export function TimelineSpine({ timeline }: { timeline: CareerStoryTimeline }) {
  if (timeline.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="body-2 text-muted-foreground">
          Your story starts as soon as you add a role, a project, or a skill.
        </p>
      </div>
    );
  }

  const { groups, undated } = groupByYear(timeline);

  return (
    <div className="relative">
      <div className="absolute top-2 bottom-2 left-[5px] w-px bg-border" />

      {groups.map(([year, entries]) => {
        const sorted = [...entries].sort((a, b) => b.order - a.order);
        return (
          <div key={year}>
            <div className="relative pb-4 pl-7">
              <div className="absolute top-0.5 left-[-2px] h-3.5 w-3.5 rotate-45 rounded-[3px] border-2 border-foreground bg-background" />
              <p className="heading-4 text-foreground">{year}</p>
            </div>
            {sorted.map((entry) => (
              <TimelineEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        );
      })}

      {undated.length > 0 && (
        <div>
          {undated
            .sort((a, b) => b.order - a.order)
            .map((entry) => (
              <TimelineEntryCard key={entry.id} entry={entry} />
            ))}
        </div>
      )}

      <div className="relative pl-7">
        <div className="absolute top-0.5 left-0 h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground/50 bg-background" />
        <p className="footnote text-muted-foreground">
          That's the beginning of what's logged. Your career started well before this — add it
          whenever you're ready.
        </p>
      </div>
    </div>
  );
}
