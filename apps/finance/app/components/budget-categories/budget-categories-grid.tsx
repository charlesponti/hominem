import { BudgetCategoryCard, type DisplayBudgetCategory } from './budget-category-card';

interface BudgetCategoriesGridProps {
  categories: DisplayBudgetCategory[];
  onEditCategory: (category: DisplayBudgetCategory) => void;
  onDeleteCategory: (category: DisplayBudgetCategory) => void;
}

export function BudgetCategoriesGrid({
  categories,
  onEditCategory,
  onDeleteCategory,
}: BudgetCategoriesGridProps) {
  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <BudgetCategoryCard
          key={category.id}
          category={category}
          onEdit={onEditCategory}
          onDelete={onDeleteCategory}
        />
      ))}
    </div>
  );
}
