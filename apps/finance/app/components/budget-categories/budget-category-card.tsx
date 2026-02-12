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
            <div className={`size-3 ${category.color}`} />
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
              className="size-6 p-0 text-destructive hover:text-destructive/80"
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
          <div className="text-base font-bold text-foreground">
            ${category.spent.toLocaleString()}
          </div>
          <span
            className={`text-xs font-medium ${remaining >= 0 ? 'text-foreground' : 'text-destructive'}`}
          >
            {remaining >= 0 ? '+' : ''}${remaining.toLocaleString()} remaining
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full border border-foreground h-1.5">
          <div
            className={cn('h-1.5', {
              'bg-destructive': spentPercentage > 100,
              'bg-warning': spentPercentage > 80 && spentPercentage <= 100,
              'bg-emphasis-highest': spentPercentage <= 80,
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
