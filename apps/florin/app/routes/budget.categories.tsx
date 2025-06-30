import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import {
  BudgetCategoriesGrid,
  BudgetCategoriesHeader,
  BudgetCategoryFormDialog,
  BudgetSummaryCards,
  DeleteCategoryDialog,
  EmptyState,
  SetupFromTransactionsDialog,
  type DisplayBudgetCategory,
} from '~/components/budget-categories'
import { Alert, AlertDescription } from '~/components/ui/alert'
import { Button } from '~/components/ui/button'
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

export default function BudgetCategories() {
  // Database hooks
  const {
    data: dbCategories,
    isLoading,
    error,
    refetch,
  } = trpc.finance.budget.categories.list.useQuery()
  const createCategoryMutation = trpc.finance.budget.categories.create.useMutation()
  const updateCategoryMutation = trpc.finance.budget.categories.update.useMutation()
  const deleteCategoryMutation = trpc.finance.budget.categories.delete.useMutation()
  const { data: transactionCategories, isLoading: isLoadingTransactionCategories } =
    trpc.finance.budget.transactionCategories.useQuery()
  const bulkCreateMutation = trpc.finance.budget.bulkCreateFromTransactions.useMutation()

  // Component state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<DisplayBudgetCategory | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<DisplayBudgetCategory | null>(null)
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false)
  const [selectedTransactionCategories, setSelectedTransactionCategories] = useState<Set<string>>(
    new Set()
  )
  const [formData, setFormData] = useState({
    name: '',
    budgetAmount: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    color: categoryColors[0],
  })

  // Transform database categories to display format
  const categories: DisplayBudgetCategory[] = (dbCategories || []).map((cat, index) => ({
    ...cat,
    type: cat.type === 'income' || cat.type === 'expense' ? cat.type : 'expense',
    budgetAmount: Number.parseFloat(cat.averageMonthlyExpense || '0'),
    spent: 0, // TODO: This should come from actual transaction data
    color: categoryColors[index % categoryColors.length],
    description: '', // TODO: Add description field to database schema if needed
  }))

  const resetForm = () => {
    setFormData({
      name: '',
      budgetAmount: '',
      type: 'expense',
      description: '',
      color: categoryColors[0],
    })
  }

  const handleCreateCategory = async () => {
    if (!formData.name || !formData.budgetAmount) return

    try {
      await createCategoryMutation.mutateAsync({
        name: formData.name,
        type: formData.type,
        averageMonthlyExpense: formData.budgetAmount,
      })
      setIsCreateDialogOpen(false)
      resetForm()
      refetch() // Refresh the data
    } catch (error) {
      console.error('Failed to create category:', error)
      // TODO: Show toast notification for duplicate category error
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory || !formData.name || !formData.budgetAmount) return

    try {
      await updateCategoryMutation.mutateAsync({
        id: editingCategory.id,
        name: formData.name,
        type: formData.type,
        averageMonthlyExpense: formData.budgetAmount,
      })
      setEditingCategory(null)
      resetForm()
      refetch() // Refresh the data
    } catch (error) {
      console.error('Failed to update category:', error)
    }
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return

    try {
      await deleteCategoryMutation.mutateAsync({ id: deletingCategory.id })
      setDeletingCategory(null)
      refetch() // Refresh the data
    } catch (error) {
      console.error('Failed to delete category:', error)
    }
  }

  const openEditDialog = (category: DisplayBudgetCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      budgetAmount: category.budgetAmount.toString(),
      type: category.type === 'income' || category.type === 'expense' ? category.type : 'expense',
      description: category.description || '',
      color: category.color,
    })
  }

  const handleSetupFromTransactions = async () => {
    if (selectedTransactionCategories.size === 0) return

    try {
      const categoriesToCreate = Array.from(selectedTransactionCategories).map((categoryName) => {
        const transactionCategory = transactionCategories?.find((tc) => tc.name === categoryName)
        return {
          name: categoryName,
          type: 'expense' as const, // Default to expense, user can change later
          averageMonthlyExpense: (transactionCategory?.suggestedBudget || 0).toString(),
        }
      })

      const result = await bulkCreateMutation.mutateAsync({ categories: categoriesToCreate })

      setIsSetupDialogOpen(false)
      setSelectedTransactionCategories(new Set())
      refetch()
    } catch (error) {
      console.error('Failed to create categories from transactions:', error)
    }
  }

  const toggleTransactionCategory = (categoryName: string) => {
    const newSelected = new Set(selectedTransactionCategories)
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName)
    } else {
      newSelected.add(categoryName)
    }
    setSelectedTransactionCategories(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedTransactionCategories(
      new Set(transactionCategories?.map((tc: any) => tc.name) || [])
    )
  }

  const handleDeselectAll = () => {
    setSelectedTransactionCategories(new Set())
  }

  const totalBudget = categories.reduce((sum, cat) => sum + cat.budgetAmount, 0)
  const totalSpent = categories.reduce((sum, cat) => sum + cat.spent, 0)

  // Debug logging
  console.log('Current state:', {
    isCreateDialogOpen,
    isSetupDialogOpen,
    editingCategory: !!editingCategory,
    categoriesLength: categories.length,
  })

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading budget categories...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load budget categories: {error.message}</AlertDescription>
        </Alert>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <>
      {/* Header - Always shown */}
      <BudgetCategoriesHeader
        transactionCategoriesCount={transactionCategories?.length}
        onAddCategory={() => {
          console.log('Add category clicked, setting isCreateDialogOpen to true')
          setIsCreateDialogOpen(true)
        }}
        onSetupFromTransactions={() => {
          console.log('Setup from transactions clicked, setting isSetupDialogOpen to true')
          setIsSetupDialogOpen(true)
        }}
      />

      {/* Main Content */}
      {categories.length === 0 ? (
        <EmptyState
          transactionCategoriesCount={transactionCategories?.length}
          onAddCategory={() => {
            console.log('EmptyState: Add category clicked, setting isCreateDialogOpen to true')
            setIsCreateDialogOpen(true)
          }}
          onSetupFromTransactions={() => {
            console.log(
              'EmptyState: Setup from transactions clicked, setting isSetupDialogOpen to true'
            )
            setIsSetupDialogOpen(true)
          }}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Cards */}
          <BudgetSummaryCards totalBudget={totalBudget} totalSpent={totalSpent} />

          {/* Categories Grid */}
          <BudgetCategoriesGrid
            categories={categories}
            onEditCategory={openEditDialog}
            onDeleteCategory={setDeletingCategory}
          />
        </div>
      )}

      {/* Form Dialog */}
      <BudgetCategoryFormDialog
        open={isCreateDialogOpen || !!editingCategory}
        onOpenChange={(open) => {
          console.log('Form dialog onOpenChange called with:', open)
          if (!open) {
            setIsCreateDialogOpen(false)
            setEditingCategory(null)
            resetForm()
          }
        }}
        editingCategory={editingCategory}
        onSubmit={editingCategory ? handleEditCategory : handleCreateCategory}
        onCancel={() => {
          setIsCreateDialogOpen(false)
          setEditingCategory(null)
          resetForm()
        }}
        formData={formData}
        onFormDataChange={setFormData}
        isLoading={createCategoryMutation.isPending || updateCategoryMutation.isPending}
        categoryColors={categoryColors}
      />

      {/* Delete Dialog */}
      <DeleteCategoryDialog
        deletingCategory={deletingCategory}
        onOpenChange={() => setDeletingCategory(null)}
        onDelete={handleDeleteCategory}
        isLoading={deleteCategoryMutation.isPending}
      />

      {/* Setup from Transactions Dialog */}
      <SetupFromTransactionsDialog
        open={isSetupDialogOpen}
        onOpenChange={(open) => {
          console.log('Setup dialog onOpenChange called with:', open)
          setIsSetupDialogOpen(open)
        }}
        transactionCategories={transactionCategories}
        isLoading={isLoadingTransactionCategories}
        selectedCategories={selectedTransactionCategories}
        onToggleCategory={toggleTransactionCategory}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onSubmit={handleSetupFromTransactions}
        onCancel={() => {
          setIsSetupDialogOpen(false)
          setSelectedTransactionCategories(new Set())
        }}
        isSubmitting={bulkCreateMutation.isPending}
      />
    </>
  )
}
