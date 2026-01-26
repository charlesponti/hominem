import type { GoalJson } from '@hominem/hono-rpc/types';

import { PageTitle } from '@hominem/ui';
import { useToast } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Checkbox } from '@hominem/ui/components/ui/checkbox';
import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Input } from '@hominem/ui/input';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import type { GoalFormData } from '~/components/goals/goal-modal';

import { ArchiveModal } from '~/components/goals/archive-modal';
import { GoalCard } from '~/components/goals/goal-card';
import { GoalModal } from '~/components/goals/goal-modal';
import { useGoals, useCreateGoal, useUpdateGoal, useArchiveGoal } from '~/lib/hooks/use-goals';

export default function GoalsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<'priority' | 'dueDate' | 'createdAt'>('priority');
  const [categoryFilter, setCategoryFilter] = useState('');

  const queryParams = {
    showArchived: String(showArchived),
    sortBy: sortOrder,
    category: categoryFilter || undefined,
  };

  const { data: goalsResult, isLoading: isLoadingGoals } = useGoals(queryParams);
  const goals = goalsResult?.success ? goalsResult.data : [];

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<GoalJson | null>(null);
  const { toast } = useToast();

  const createGoal = useCreateGoal(queryParams);
  const updateGoal = useUpdateGoal(queryParams);
  const archiveGoal = useArchiveGoal(queryParams);

  const handleCreateSubmit = (data: GoalFormData) => {
    createGoal.mutate(
      {
        ...data,
        startDate: data.startDate?.toISOString(),
        dueDate: data.dueDate?.toISOString(),
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setIsCreateModalOpen(false);
            toast({ description: 'Goal created successfully' });
          } else {
            toast({
              variant: 'destructive',
              description: result.message || 'Failed to create goal',
            });
          }
        },
      },
    );
  };

  const handleEditSubmit = (data: GoalFormData) => {
    if (!currentGoal?.id) return;
    updateGoal.mutate(
      {
        id: currentGoal.id,
        json: {
          ...data,
          startDate: data.startDate?.toISOString(),
          dueDate: data.dueDate?.toISOString(),
        },
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setIsEditModalOpen(false);
            toast({ description: 'Goal updated successfully' });
          } else {
            toast({
              variant: 'destructive',
              description: result.message || 'Failed to update goal',
            });
          }
        },
      },
    );
  };

  const handleEditClick = (goal: any) => {
    setCurrentGoal(goal);
    setIsEditModalOpen(true);
  };

  const handleArchiveClick = (goal: any) => {
    setCurrentGoal(goal);
    setIsArchiveModalOpen(true);
  };

  const handleArchive = () => {
    if (!currentGoal?.id) return;
    archiveGoal.mutate(
      { id: currentGoal.id },
      {
        onSuccess: (result) => {
          if (result.success) {
            setIsArchiveModalOpen(false);
            toast({ description: 'Goal archived successfully' });
          } else {
            toast({
              variant: 'destructive',
              description: result.message || 'Failed to archive goal',
            });
          }
        },
      },
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-4">
        <PageTitle title="Goals" subtitle="Track and achieve your aspirations" />
        <div className="flex items-center gap-4">
          <Input
            placeholder="Filter by category..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-48"
          />
          <Select
            value={sortOrder}
            onValueChange={(v) => setSortOrder(v as 'priority' | 'dueDate' | 'createdAt')}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="createdAt">Creation Date</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="showArchived"
              checked={showArchived}
              onCheckedChange={(checked: boolean) => setShowArchived(Boolean(checked))}
            />
            <Label htmlFor="showArchived">Show Archived</Label>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="h-10">
            <Plus className="w-5 h-5 mr-2" />
            New Goal
          </Button>
        </div>
      </div>

      {isLoadingGoals ? (
        <p className="text-center text-muted-foreground mt-10">Loading goals...</p>
      ) : goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal as any}
              onEdit={handleEditClick}
              onDelete={handleArchiveClick}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground mt-10">
          You haven't set any goals yet. Click "Add New Goal" to get started!
        </p>
      )}

      <GoalModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSubmit={handleCreateSubmit}
        isLoading={createGoal.isPending}
      />

      <GoalModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        goal={currentGoal || undefined}
        onSubmit={handleEditSubmit}
        isLoading={updateGoal.isPending}
      />

      <ArchiveModal
        open={isArchiveModalOpen}
        onOpenChange={setIsArchiveModalOpen}
        goalTitle={currentGoal?.title || ''}
        onConfirm={handleArchive}
      />
    </div>
  );
}
