import { BudgetCategoryCard, type DisplayBudgetCategory } from './budget-category-card'

interface BudgetCategoriesGridProps {
  categories: DisplayBudgetCategory[]
  onEditCategory: (category: DisplayBudgetCategory) => void
  onDeleteCategory: (category: DisplayBudgetCategory) => void
}

export function BudgetCategoriesGrid({
  categories,
  onEditCategory,
  onDeleteCategory,
}: BudgetCategoriesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <BudgetCategoryCard
          key={category.id}
          category={category}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
        />
      ))}
    </div>
  )
}
