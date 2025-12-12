import type { Goal } from '@hominem/data/types'
import { Button } from '@hominem/ui/button'
import { Checkbox } from '@hominem/ui/components/ui/checkbox'
import { Input } from '@hominem/ui/components/ui/input'
import { Label } from '@hominem/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'
import { useToast } from '@hominem/ui/components/ui/use-toast'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { ArchiveModal } from '~/components/goals/archive-modal'
import { GoalCard } from '~/components/goals/goal-card'
import type { GoalFormData } from '~/components/goals/goal-modal'
import { GoalModal } from '~/components/goals/goal-modal'
import { trpc } from '~/lib/trpc'

export default function GoalsPage() {
  const utils = trpc.useUtils()
  const [showArchived, setShowArchived] = useState(false)
  const [sortOrder, setSortOrder] = useState('priority')
  const [categoryFilter, setCategoryFilter] = useState('')

  const { data: goals = [], isLoading: isLoadingGoals } = trpc.goals.list.useQuery({
    showArchived,
    sortBy: sortOrder,
    category: categoryFilter,
  })

  const typedGoals = goals as Goal[]

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [currentGoal, setCurrentGoal] = useState<Goal | null>(null)
  const { toast } = useToast()

  const createGoal = trpc.goals.create.useMutation({
    onMutate: async (newGoal) => {
      setIsCreateModalOpen(false)
      await utils.goals.list.cancel({ showArchived, sortBy: sortOrder, category: categoryFilter })
      const previousGoals = utils.goals.list.getData({
        showArchived,
        sortBy: sortOrder,
        category: categoryFilter,
      })
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        (old) => [
          ...(old || []),
          {
            ...newGoal,
            id: 'temp-id',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            userId: 'temp-user-id',
            description: newGoal.description ?? null,
            goalCategory: newGoal.goalCategory ?? null,
            priority: newGoal.priority ?? null,
            milestones: newGoal.milestones ?? null,
            startDate: newGoal.startDate ?? null,
            dueDate: newGoal.dueDate ?? null,
          } as Goal,
        ]
      )
      return { previousGoals }
    },
    onSuccess: () => {
      toast({ description: 'Goal created successfully' })
    },
    onError: (err, _newGoal, context) => {
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        context?.previousGoals
      )
      toast({
        variant: 'destructive',
        description: err.message || 'Failed to create goal',
      })
    },
    onSettled: () => {
      utils.goals.list.invalidate({ showArchived, sortBy: sortOrder, category: categoryFilter })
    },
  })

  const updateGoal = trpc.goals.update.useMutation({
    onMutate: async (updatedGoal) => {
      setIsEditModalOpen(false)
      await utils.goals.list.cancel({ showArchived, sortBy: sortOrder, category: categoryFilter })
      const previousGoals = utils.goals.list.getData({
        showArchived,
        sortBy: sortOrder,
        category: categoryFilter,
      })
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        (old) =>
          (old || []).map((goal) =>
            goal.id === updatedGoal.id ? ({ ...goal, ...updatedGoal } as Goal) : goal
          )
      )
      return { previousGoals }
    },
    onSuccess: () => {
      toast({ description: 'Goal updated successfully' })
    },
    onError: (err, _newGoal, context) => {
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        context?.previousGoals
      )
      toast({
        variant: 'destructive',
        description: err.message || 'Failed to update goal',
      })
    },
    onSettled: () => {
      utils.goals.list.invalidate({ showArchived, sortBy: sortOrder, category: categoryFilter })
      setCurrentGoal(null)
    },
  })

  const archiveGoal = trpc.goals.archive.useMutation({
    onMutate: async (archivedGoal) => {
      setIsArchiveModalOpen(false)
      await utils.goals.list.cancel({ showArchived, sortBy: sortOrder, category: categoryFilter })
      const previousGoals = utils.goals.list.getData({
        showArchived,
        sortBy: sortOrder,
        category: categoryFilter,
      })
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        (old) => (old || []).filter((goal) => goal.id !== archivedGoal.id)
      )
      return { previousGoals }
    },
    onSuccess: () => {
      toast({ description: 'Goal archived successfully' })
    },
    onError: (err, _newGoal, context) => {
      utils.goals.list.setData(
        { showArchived, sortBy: sortOrder, category: categoryFilter },
        context?.previousGoals
      )
      toast({
        variant: 'destructive',
        description: err.message || 'Failed to archive goal',
      })
    },
    onSettled: () => {
      utils.goals.list.invalidate({ showArchived, sortBy: sortOrder, category: categoryFilter })
      setCurrentGoal(null)
    },
  })

  const handleCreateSubmit = (data: GoalFormData) => {
    createGoal.mutate({
      ...data,
      startDate: data.startDate?.toISOString(),
      dueDate: data.dueDate?.toISOString(),
    })
  }

  const handleEditSubmit = (data: GoalFormData) => {
    if (!currentGoal?.id) return
    updateGoal.mutate({
      id: currentGoal.id,
      ...data,
      startDate: data.startDate?.toISOString(),
      dueDate: data.dueDate?.toISOString(),
    })
  }

  const handleEditClick = (goal: Goal) => {
    setCurrentGoal(goal)
    setIsEditModalOpen(true)
  }

  const handleArchiveClick = (goal: Goal) => {
    setCurrentGoal(goal)
    setIsArchiveModalOpen(true)
  }

  const handleArchive = () => {
    if (!currentGoal?.id) return
    archiveGoal.mutate({ id: currentGoal.id })
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-1">Goals</h1>
          <p className="text-muted-foreground">Track and achieve your aspirations</p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            placeholder="Filter by category..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-48"
          />
          <Select value={sortOrder} onValueChange={setSortOrder}>
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
      ) : typedGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {typedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
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
  )
}
