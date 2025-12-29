import type { Goal, GoalMilestone, GoalStatus } from '@hominem/data/types'
import { Button } from '@hominem/ui/button'
import { DatePicker } from '@hominem/ui/components/date-picker'
import { Label } from '@hominem/ui/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@hominem/ui/dialog'
import { Input } from '@hominem/ui/input'
import { Textarea } from '@hominem/ui/components/ui/textarea'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { GoalMilestoneList } from './goal-milestone-list'

export const GoalFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  goalCategory: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'archived']),
  priority: z.number().min(1).max(5).optional(),
  startDate: z.date().optional(),
  dueDate: z.date().optional(),
  milestones: z
    .array(z.object({ description: z.string().min(1), completed: z.boolean() }))
    .optional(),
})

export type GoalFormData = z.infer<typeof GoalFormSchema>

interface GoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal?: Goal
  onSubmit: (data: GoalFormData) => void
  isLoading?: boolean
}

export function GoalModal({ open, onOpenChange, goal, onSubmit, isLoading }: GoalModalProps) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(GoalFormSchema),
    defaultValues: {
      title: goal?.title ?? '',
      description: goal?.description ?? '',
      goalCategory: goal?.goalCategory ?? '',
      status: (goal?.status as GoalStatus) ?? 'todo',
      priority: goal?.priority ?? 1,
      startDate: goal?.startDate ? new Date(goal.startDate) : undefined,
      dueDate: goal?.dueDate ? new Date(goal.dueDate) : undefined,
      milestones: goal?.milestones ?? [],
    },
  })

  const {
    handleSubmit,
    control,
    register,
    formState: { errors },
  } = form

  const handleMilestoneChange = (
    index: number,
    field: keyof GoalMilestone,
    value: string | boolean
  ) => {
    const milestones = form.getValues('milestones') || []
    const newMilestones = [...milestones]
    if (newMilestones[index]) {
      const milestoneToUpdate = newMilestones[index]
      if (field === 'description') {
        milestoneToUpdate.description = value as string
      } else if (field === 'completed') {
        milestoneToUpdate.completed = value as boolean
      }
    }
    form.setValue('milestones', newMilestones)
  }

  const addMilestone = () => {
    const milestones = form.getValues('milestones') || []
    form.setValue('milestones', [...milestones, { description: '', completed: false }])
  }

  const removeMilestone = (index: number) => {
    const milestones = form.getValues('milestones') || []
    form.setValue(
      'milestones',
      milestones.filter((_, i) => i !== index)
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 py-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold">
              Title
            </Label>
            <Input
              id="title"
              {...register('title')}
              className="w-full text-lg"
              placeholder="What do you want to achieve?"
            />
            {errors.title && (
              <p className="text-right text-red-500 text-sm">{errors.title.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-base font-semibold">
              Description
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              className="resize-none"
              placeholder="Add more details about your goal..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-base font-semibold">
              Category
            </Label>
            <Input
              id="category"
              {...register('goalCategory')}
              className="w-full"
              placeholder="e.g., Career, Health, Learning"
            />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-base font-semibold">
                Status
              </Label>
              <select
                id="status"
                {...register('status')}
                className="w-full p-2 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-base font-semibold">
                Priority (1-5)
              </Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="5"
                {...register('priority', { valueAsNumber: true })}
                className="w-full"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-base font-semibold">
                Start Date
              </Label>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onSelect={field.onChange}
                    placeholder="Select a start date"
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-base font-semibold">
                Due Date
              </Label>
              <Controller
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onSelect={field.onChange}
                    placeholder="Select a due date"
                  />
                )}
              />
            </div>
          </div>

          <GoalMilestoneList
            milestones={form.watch('milestones') || []}
            onAdd={addMilestone}
            onChange={handleMilestoneChange}
            onRemove={removeMilestone}
          />

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : goal ? 'Save Changes' : 'Create Goal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
