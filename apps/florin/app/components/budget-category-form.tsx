'use client'

import { useIsMobile } from '@hominem/ui'
import type { BudgetCategory } from '@hominem/utils/types'
import { useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Dialog, DialogContent } from '~/components/ui/dialog'
import { Drawer, DrawerContent } from '~/components/ui/drawer'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useCreateBudgetCategory, useUpdateBudgetCategory } from '~/lib/hooks/use-budget-data'

// Define the structure for form data
export interface BudgetCategoryFormData {
  name: string
  type: 'income' | 'expense' // Or string if more flexible types are needed
  allocatedAmount: number
  id?: string // For updates
}

// Define props for the component
interface BudgetCategoryFormProps {
  category?: BudgetCategory & { allocatedAmount?: number } // Optional: for editing an existing category, extend with allocatedAmount
  onSave: (data: BudgetCategoryFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function BudgetCategoryForm({
  category,
  onSave,
  onCancel,
  isLoading: isLoadingProp,
}: BudgetCategoryFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [allocatedAmount, setAllocatedAmount] = useState<number>(0)
  const [formError, setFormError] = useState<string | null>(null)

  const { createCategory, isLoading: isCreating, error: createError } = useCreateBudgetCategory()
  const { updateCategory, isLoading: isUpdating, error: updateError } = useUpdateBudgetCategory()

  useEffect(() => {
    if (category) {
      setName(category.name)
      if (category.type === 'income' || category.type === 'expense') {
        setType(category.type as 'income' | 'expense')
      } else {
        setType('expense')
      }
      setAllocatedAmount(category.allocatedAmount || 0)
    }
  }, [category])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const formData: BudgetCategoryFormData = {
      name,
      type,
      allocatedAmount,
    }
    try {
      if (category?.id) {
        await updateCategory({
          id: category.id,
          name,
          type,
          allocatedAmount,
        })
      } else {
        await createCategory({
          name,
          type,
          allocatedAmount,
          averageMonthlyExpense: allocatedAmount.toString(), // required by BudgetCategoryCreation as string
        })
      }
      await onSave(formData)
    } catch (err) {
      if (err instanceof Error) setFormError(err.message)
      else setFormError('An unknown error occurred')
    }
  }

  const isLoading = isLoadingProp || isCreating || isUpdating
  const errorMsg = formError || createError?.message || updateError?.message

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
            <div className="text-red-500 text-sm" role="alert">
              {errorMsg}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Utilities"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Category Type</Label>
            <Select
              value={type}
              onValueChange={(value: 'income' | 'expense') => setType(value)}
              required
            >
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="allocatedAmount">Allocated Amount ($)</Label>
            <Input
              id="allocatedAmount"
              type="number"
              value={allocatedAmount}
              onChange={(e) => setAllocatedAmount(Number.parseFloat(e.target.value) || 0)}
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
  )
}

export function BudgetCategoryFormModal(
  props: BudgetCategoryFormProps & { open: boolean; onOpenChange: (open: boolean) => void }
) {
  const isMobile = useIsMobile()
  const { open, onOpenChange, ...formProps } = props
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <BudgetCategoryForm {...formProps} />
        </DrawerContent>
      </Drawer>
    )
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-md w-full">
        <BudgetCategoryForm {...formProps} />
      </DialogContent>
    </Dialog>
  )
}
