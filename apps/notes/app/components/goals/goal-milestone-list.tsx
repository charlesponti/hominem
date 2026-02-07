import type { GoalMilestone } from '@hominem/hono-rpc/types';

import { Button } from '@hominem/ui/button';
import { Input } from '@hominem/ui/input';
import { Plus, XCircle } from 'lucide-react';

interface GoalMilestoneListProps {
  milestones: GoalMilestone[];
  onAdd: () => void;
  onChange: (index: number, field: keyof GoalMilestone, value: string | boolean) => void;
  onRemove: (index: number) => void;
}

export function GoalMilestoneList({
  milestones,
  onAdd,
  onChange,
  onRemove,
}: GoalMilestoneListProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Milestones</h3>
        <Button variant="outline" size="sm" onClick={onAdd} className="text-sm hover:bg-primary/5">
          <Plus className="size-4 mr-2" /> Add
        </Button>
      </div>
      {milestones?.map((milestone, index) => (
        <div
          key={`milestone-${index}-${milestone.description}`}
          className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
        >
          <Input
            value={milestone.description}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            className="flex-1"
            placeholder="Milestone description"
          />
          <input
            type="checkbox"
            checked={milestone.isCompleted}
            onChange={(e) => onChange(index, 'isCompleted', e.target.checked)}
            className="size-5"
          />
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <XCircle className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
