import { useId } from 'react'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

interface Category {
  id: string
  name: string
}

interface CategorySelectProps {
  selectedCategory: string
  onCategoryChange: (value: string) => void
  categories: Category[]
  isLoading?: boolean
  placeholder?: string
  label?: string
  className?: string
}

export function CategorySelect({
  selectedCategory,
  onCategoryChange,
  categories,
  isLoading = false,
  placeholder = 'All categories',
  label = 'Category',
  className,
}: CategorySelectProps) {
  const id = useId()
  const safeCategories = categories || []

  return (
    <div className={`space-y-2 ${className || ''}`}>
      <Label htmlFor={id}>{label}</Label>
      <Select name="category" value={selectedCategory} onValueChange={onCategoryChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {isLoading ? (
            <SelectItem value="loading" disabled>
              Loading categories...
            </SelectItem>
          ) : safeCategories.length === 0 ? (
            <SelectItem value="no-categories" disabled>
              No categories available
            </SelectItem>
          ) : (
            safeCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
