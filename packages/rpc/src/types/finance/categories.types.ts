import type { EmptyInput } from '../utils';

// ============================================================================
// Categories
// ============================================================================

export type CategoriesListInput = EmptyInput;
export type CategoriesListItem = {
  id: string
  userId: string
  name: string
  parentId?: string | null
  icon?: string | null
  color?: string | null
}

export type CategoriesListOutput = CategoriesListItem[];
