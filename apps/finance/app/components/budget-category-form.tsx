import { useIsMobile } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import { Drawer, DrawerContent } from '@hominem/ui/components/ui/drawer';
import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Dialog, DialogContent } from '@hominem/ui/dialog';
import { Input } from '@hominem/ui/input';
import { useEffect, useId, useState } from 'react';

import type { BudgetCategory } from '~/lib/types/budget.types';

import { useCreateBudgetCategory, useUpdateBudgetCategory } from '~/lib/hooks/use-budget';

type BudgetCategoryFormData = Pick<BudgetCategory, 'name' | 'type' | 'averageMonthlyExpense'>;

interface BudgetCategoryFormProps {
  category?: BudgetCategory;
  onSave: (data: BudgetCategoryFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function BudgetCategoryForm({
  category,
  onSave,
  onCancel,
  isLoading: isLoadingProp,
}: BudgetCategoryFormProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [averageMonthlyExpense, setAverageMonthlyExpense] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const createCategoryMutation = useCreateBudgetCategory();
  const updateCategoryMutation = useUpdateBudgetCategory();

  const nameId = useId();
  const typeId = useId();
  const averageMonthlyExpenseId = useId();

  useEffect(() => {
    if (category) {
      setName(category.name);
      if (category.type === 'income' || category.type === 'expense') {
        setType(category.type as 'income' | 'expense');
      } else {
        setType('expense');
      }
      setAverageMonthlyExpense(String(category.averageMonthlyExpense || ''));
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const formData: BudgetCategoryFormData = {
      name,
      type,
      averageMonthlyExpense,
    };
    try {
      if (category?.id) {
        await updateCategoryMutation.mutateAsync({
          id: category.id,
          name,
          type,
          averageMonthlyExpense,
        });
      } else {
        await createCategoryMutation.mutateAsync({
          name,
          type,
          averageMonthlyExpense,
        });
      }
      await onSave(formData);
    } catch (err) {
      if (err instanceof Error) setFormError(err.message);
      else setFormError('An unknown error occurred');
    }
  };

  const isLoading =
    isLoadingProp || createCategoryMutation.isPending || updateCategoryMutation.isPending;
  const errorMsg =
    formError || createCategoryMutation.error?.message || updateCategoryMutation.error?.message;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{category ? 'Edit' : 'Create'} Budget Category</CardTitle>
        <CardDescription>
          {category
            ? 'Update the details of your budget category.'
            : 'Define a new category for your budget.'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="text-destructive text-sm" role="alert">
              {errorMsg}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor={nameId}>Category Name</Label>
            <Input
              id={nameId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Utilities"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={typeId}>Category Type</Label>
            <Select
              value={type}
              onValueChange={(value: 'income' | 'expense') => setType(value)}
              required
            >
              <SelectTrigger id={typeId}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={averageMonthlyExpenseId}>Average Monthly Amount ($)</Label>
            <Input
              id={averageMonthlyExpenseId}
              type="number"
              value={averageMonthlyExpense}
              onChange={(e) => setAverageMonthlyExpense(e.target.value)}
              placeholder="e.g., 500"
              required
              min="0"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Category'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export function BudgetCategoryFormModal(
  props: BudgetCategoryFormProps & { open: boolean; onOpenChange: (open: boolean) => void },
) {
  const isMobile = useIsMobile();
  const { open, onOpenChange, ...formProps } = props;
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <BudgetCategoryForm {...formProps} />
        </DrawerContent>
      </Drawer>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md w-full">
        <BudgetCategoryForm {...formProps} />
      </DialogContent>
    </Dialog>
  );
}
