import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/components/ui/dialog'
import { Input } from '@hominem/ui/components/ui/input'
import { Label } from '@hominem/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'
import type { DisplayBudgetCategory } from './budget-category-card'

interface FormData {
  name: string
  budgetAmount: string
  type: 'income' | 'expense'
  description: string
  color: string
}

interface BudgetCategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCategory: DisplayBudgetCategory | null
  onSubmit: () => void
  onCancel: () => void
  formData: FormData
  onFormDataChange: (data: FormData) => void
  isLoading: boolean
  categoryColors: string[]
}

export function BudgetCategoryFormDialog({
  open,
  onOpenChange,
  editingCategory,
  onSubmit,
  onCancel,
  formData,
  onFormDataChange,
  isLoading,
  categoryColors,
}: BudgetCategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
          <DialogDescription>
            {editingCategory
              ? 'Update the category details below.'
              : 'Add a new budget category to track your spending.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="e.g., Groceries"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Category Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'income' | 'expense') =>
                onFormDataChange({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget">Budget Amount</Label>
            <Input
              id="budget"
              type="number"
              value={formData.budgetAmount}
              onChange={(e) => onFormDataChange({ ...formData, budgetAmount: e.target.value })}
              placeholder="500"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {categoryColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onFormDataChange({ ...formData, color })}
                  className={`w-8 h-8 rounded-full ${color} ${
                    formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!formData.name || !formData.budgetAmount || isLoading}
          >
            {isLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'} Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
