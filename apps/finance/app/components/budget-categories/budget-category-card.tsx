import { Button } from '@hominem/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import { Edit3, Trash2 } from 'lucide-react';

import type { BudgetCategory } from '~/lib/types/budget.types';

import { cn } from '~/lib/utils';

// Derive from BudgetCategory type and add UI-specific properties
export type DisplayBudgetCategory = BudgetCategory & {
  budgetAmount: number;
  spent: number;
  color: string;
  description?: string;
};

interface BudgetCategoryCardProps {
  category: DisplayBudgetCategory;
  onEdit: (category: DisplayBudgetCategory) => void;
  onDelete: (category: DisplayBudgetCategory) => void;
}

export function BudgetCategoryCard({ category, onEdit, onDelete }: BudgetCategoryCardProps) {
  const spentPercentage =
    category.budgetAmount > 0 ? (category.spent / category.budgetAmount) * 100 : 0;
  const remaining = category.budgetAmount - category.spent;

  return (
    <Card className="relative">
      <CardHeader className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`size-3 rounded-full ${category.color}`} />
            <CardTitle className="text-base">{category.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(category)}
              className="size-6 p-0"
            >
              <Edit3 className="size-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(category)}
              className="size-6 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="size-3" />
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
            className={cn('h-1.5 rounded-full transition-all duration-300 ease-in-out', {
              'bg-red-500': spentPercentage > 100,
              'bg-amber-500': spentPercentage > 80 && spentPercentage <= 100,
              'bg-emerald-500': spentPercentage <= 80,
            })}
            style={{
              width: `${Math.min(spentPercentage, 100)}%`,
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
