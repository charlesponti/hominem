import { Edit3, Trash2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export interface DisplayBudgetCategory {
  id: string
  name: string
  type: 'income' | 'expense'
  budgetAmount: number
  spent: number
  color: string
  description?: string
}

interface BudgetCategoryCardProps {
  category: DisplayBudgetCategory
  onEdit: (category: DisplayBudgetCategory) => void
  onDelete: (category: DisplayBudgetCategory) => void
}

export function BudgetCategoryCard({ category, onEdit, onDelete }: BudgetCategoryCardProps) {
  const spentPercentage = (category.spent / category.budgetAmount) * 100
  const remaining = category.budgetAmount - category.spent

  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${category.color}`} />
            <CardTitle className="text-lg">{category.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              className="h-8 w-8 p-0"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {category.description && <CardDescription>{category.description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Budget</span>
            <span className="font-medium">${category.budgetAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Spent</span>
            <span className="font-medium">${category.spent.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Remaining</span>
            <span className={`font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${remaining.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Progress</span>
            <Badge
              variant={
                spentPercentage > 100
                  ? 'destructive'
                  : spentPercentage > 80
                    ? 'secondary'
                    : 'default'
              }
            >
              {spentPercentage.toFixed(0)}%
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                spentPercentage > 100
                  ? 'bg-red-500'
                  : spentPercentage > 80
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(spentPercentage, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
