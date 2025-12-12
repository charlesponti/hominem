import { Button } from '@hominem/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { Edit3, Trash2 } from 'lucide-react'
import type { RouterOutput } from '~/lib/trpc'

// Derive from tRPC type and add UI-specific properties
export type DisplayBudgetCategory =
  RouterOutput['finance']['budget']['categories']['list'][number] & {
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
  const spentPercentage =
    category.budgetAmount > 0 ? (category.spent / category.budgetAmount) * 100 : 0
  const remaining = category.budgetAmount - category.spent

  // Determine the color based on spending percentage
  const getProgressColor = () => {
    if (spentPercentage > 100) return '#ef4444' // red-500
    if (spentPercentage > 80) return '#f59e0b' // amber-500
    return '#10b981' // emerald-500
  }

  return (
    <Card className="relative">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${category.color}`} />
            <CardTitle className="text-base">{category.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              className="h-6 w-6 p-0"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category)}
              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {category.description && (
          <CardDescription className="text-xs">{category.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="px-4 pt-0 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="text-base font-bold text-gray-900">
            ${category.spent.toLocaleString()}
          </div>
          <span
            className={`text-xs font-medium ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {remaining >= 0 ? '+' : ''}${remaining.toLocaleString()} remaining
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${Math.min(spentPercentage, 100)}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
