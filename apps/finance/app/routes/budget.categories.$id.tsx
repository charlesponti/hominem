import { Button } from '@hominem/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@hominem/ui/components/ui/alert-dialog'
import { Label } from '@hominem/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'
import { Input } from '@hominem/ui/input'
import { Save, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { trpc } from '~/lib/trpc'

const categoryColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
]

export default function EditBudgetCategory() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const nameId = useId()
  const budgetId = useId()

  const { data: category, isLoading } = trpc.finance.budget.categories.get.useQuery(
    { id: id! },
    { enabled: !!id }
  )

  const updateCategoryMutation = trpc.finance.budget.categories.update.useMutation()
  const deleteCategoryMutation = trpc.finance.budget.categories.delete.useMutation()

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    averageMonthlyExpense: '',
    color: categoryColors[0],
  })

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Update form data when category loads
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type === 'income' || category.type === 'expense' ? category.type : 'expense',
        averageMonthlyExpense: category.averageMonthlyExpense || '',
        color: category.color || categoryColors[0],
      })
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.averageMonthlyExpense || !id) return

    try {
      await updateCategoryMutation.mutateAsync({
        id,
        name: formData.name,
        type: formData.type,
        averageMonthlyExpense: formData.averageMonthlyExpense,
        color: formData.color,
      })
      navigate('/budget')
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteCategoryMutation.mutateAsync({ id })
      navigate('/budget')
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const handleCancel = () => {
    navigate('/budget')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading category...</p>
        </div>
      </div>
    )
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Category Not Found</h3>
        <p className="text-gray-600 mb-4">The category you're looking for doesn't exist.</p>
        <Button onClick={handleCancel}>Back to Categories</Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-serif tracking-tight text-gray-900">{category.name}</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={nameId}>Category Name</Label>
          <Input
            id={nameId}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Groceries, Dining Out, Transportation"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Category Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'income' | 'expense') =>
              setFormData({ ...formData, type: value })
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
          <Label htmlFor={budgetId}>Monthly Budget Amount</Label>
          <Input
            id={budgetId}
            type="number"
            value={formData.averageMonthlyExpense}
            onChange={(e) => setFormData({ ...formData, averageMonthlyExpense: e.target.value })}
            placeholder="500"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex gap-2 flex-wrap">
            {categoryColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData({ ...formData, color })}
                className={`w-8 h-8 rounded-full ${color} ${
                  formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={
              !formData.name || !formData.averageMonthlyExpense || updateCategoryMutation.isPending
            }
          >
            <Save className="size-4 mr-2" />
            {updateCategoryMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
      <div className="flex gap-3 justify-center py-4">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteCategoryMutation.isPending}
        >
          <Trash2 className="size-4 mr-2" />
          Delete Category
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{category.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteCategoryMutation.isPending}
            >
              {deleteCategoryMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
