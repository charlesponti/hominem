import type { Goal } from '@hominem/utils/types';

import { Button } from '@hominem/ui/button';
import { Progress } from '@hominem/ui/components/ui/progress';
import { CalendarCheck, Edit, Trash2 } from 'lucide-react';

import { PriorityBadge } from './priority-badge';
import { StatusBadge } from './status-badge';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const completedMilestones = goal.milestones?.filter((m) => m.completed).length || 0;
  const totalMilestones = goal.milestones?.length || 0;
  const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  return (
    <div className="group flex flex-col bg-card rounded-lg border p-6 hover:shadow-lg transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold mb-1 pr-4">{goal.title}</h3>
          {goal.description && (
            <p className="text-muted-foreground text-sm line-clamp-2 mb-2">{goal.description}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
            <Edit className="size-4 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(goal)}>
            <Trash2 className="size-4 text-red-500" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 mb-4 flex-1">
        {goal.milestones && goal.milestones.length > 0 && (
          <div className="space-y-2">
            <Progress value={progress} className="mb-4 h-2" />
            {goal.milestones.map((milestone, idx) => (
              <div key={`${goal.id}-milestone-${idx}`} className="flex items-start gap-2 text-sm">
                <div
                  className={`mt-1 size-4 rounded-full border-2 flex items-center justify-center ${
                    milestone.completed ? 'bg-green-500 border-green-500' : 'border-muted'
                  }`}
                >
                  {milestone.completed && <CalendarCheck className="size-3 text-white" />}
                </div>
                <span
                  className={`flex-1 ${
                    milestone.completed ? 'text-muted-foreground line-through' : ''
                  }`}
                >
                  {milestone.description}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        {goal.goalCategory && (
          <span className="text-muted-foreground bg-muted px-2 py-1 rounded">
            {goal.goalCategory}
          </span>
        )}
        <StatusBadge status={goal.status} />
        {goal.priority && <PriorityBadge priority={goal.priority} />}
      </div>
    </div>
  );
}
