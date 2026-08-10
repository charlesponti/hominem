import type { CareerApplicationWithRelations } from '@hominem/db';
import { Card, CardContent } from '@ponti-studios/ui/primitives';
import { useOutletContext } from 'react-router';

import { formatApplicationDate } from '~/lib/utils/applicationUtils';

export default function ApplicationTimelineRoute() {
  const application = useOutletContext<CareerApplicationWithRelations>();

  if (!application.stages?.length) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <p className="body-2">No pipeline stages recorded.</p>
      </div>
    );
  }

  const sortedStages = [...application.stages].sort((a, b) => {
    const dateA = a.enteredAt ?? '';
    const dateB = b.enteredAt ?? '';
    return dateB.localeCompare(dateA);
  });

  return (
    <Card>
      <CardContent className="space-y-0">
        <ol className="space-y-0">
          {sortedStages.map((stage, index) => (
            <li key={stage.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="mt-1.5 h-3 w-3 rounded-full bg-accent" />
                {index < sortedStages.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className={index < sortedStages.length - 1 ? 'pb-6 flex-1' : 'flex-1'}>
                <p className="heading-4">{stage.stage}</p>
                <div className="body-3 mt-1 space-y-0.5 text-muted-foreground">
                  {stage.enteredAt && <p>Entered: {formatApplicationDate(stage.enteredAt)}</p>}
                  {stage.exitedAt && <p>Exited: {formatApplicationDate(stage.exitedAt)}</p>}
                </div>
                {stage.notes && <p className="body-3 mt-2 text-muted-foreground">{stage.notes}</p>}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
