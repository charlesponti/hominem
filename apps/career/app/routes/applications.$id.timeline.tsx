import type { CareerApplicationWithRelations } from '@hominem/db';
import { useOutletContext } from 'react-router';

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
    <div className="space-y-4">
      {sortedStages.map((stage) => (
        <div key={stage.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-blue-500 mt-1.5" />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-6 flex-1">
            <p className="heading-4">{stage.stage}</p>
            <div className="body-3 text-muted-foreground mt-1 space-y-0.5">
              {stage.enteredAt && <p>Entered: {stage.enteredAt}</p>}
              {stage.exitedAt && <p>Exited: {stage.exitedAt}</p>}
            </div>
            {stage.notes && <p className="body-3 mt-2 text-muted-foreground">{stage.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
