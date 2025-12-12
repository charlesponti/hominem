import { Button } from '@hominem/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Input } from '@hominem/ui/components/ui/input'
import { Label } from '@hominem/ui/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select'
import { ArrowLeft, Save } from 'lucide-react'
import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
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

export default function NewBudgetCategory() {
  const navigate = useNavigate()
  const createCategoryMutation = trpc.finance.budget.categories.create.useMutation()
  const nameId = useId()
  const budgetId = useId()

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    averageMonthlyExpense: '',
    color: categoryColors[0],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.averageMonthlyExpense) return

    try {
      await createCategoryMutation.mutateAsync({
        name: formData.name,
        type: formData.type,
        averageMonthlyExpense: formData.averageMonthlyExpense,
        color: formData.color,
      })
      navigate('/budget')
    } catch (error) {
      console.error('Failed to create category:', error)
    }
  }

  const handleCancel = () => {
    navigate('/budget')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Categories
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Budget Category</CardTitle>
        </CardHeader>
        <CardContent>
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
                onChange={(e) =>
                  setFormData({ ...formData, averageMonthlyExpense: e.target.value })
                }
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

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !formData.name ||
                  !formData.averageMonthlyExpense ||
                  createCategoryMutation.isPending
                }
              >
                <Save className="h-4 w-4 mr-2" />
                {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
