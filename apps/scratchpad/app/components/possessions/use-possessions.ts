import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import type { Category, Possession, PossessionInsert } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

// Define query keys as constants
const POSSESSIONS_KEY = ['possessions']
const CATEGORIES_KEY = ['categories']

type PartialWithId<T> = Partial<T> & { id: string }

/**
 * Custom hook to manage possessions data
 */
export function usePossessions() {
  const queryClient = useQueryClient()
  const { userId } = useAuth()
  const api = useApiClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof Possession>('dateAcquired')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Fetch possessions
  const {
    data: possessions = [],
    isLoading: possessionsLoading,
    error: possessionsError,
  } = useQuery({
    queryKey: POSSESSIONS_KEY,
    queryFn: async () => {
      return api.get<never, Possession[]>('/api/possessions')
    },
    enabled: !!userId,
  })

  // Fetch categories
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      return api.get<never, Category[]>('/api/categories?domain=possessions')
    },
    enabled: !!userId,
  })

  // Create a new possession
  const [newPossession, setNewPossession] = useState<Partial<PossessionInsert>>({})

  const createPossession = useMutation({
    mutationFn: async (data: PossessionInsert) => {
      return api.post<PossessionInsert, Possession>('/api/possessions', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSSESSIONS_KEY })
      setNewPossession({})
    },
  })

  // Update an existing possession
  const [possessionToEdit, setPossessionToEdit] = useState<Possession | null>(null)

  const updatePossession = useMutation({
    mutationFn: async (data: PartialWithId<Possession>) => {
      return api.put<PartialWithId<Possession>, Possession>(`/api/possessions/${data.id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSSESSIONS_KEY })
      setPossessionToEdit(null)
    },
  })

  // Delete a possession
  const deletePossession = useMutation({
    mutationFn: async (id: string) => {
      return api.delete<never, { success: boolean }>(`/api/possessions/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: POSSESSIONS_KEY })
    },
  })

  // Filter and sort possessions
  const filteredPossessions = possessions
    .filter((possession) => {
      // Filter by search query
      if (
        searchQuery &&
        !possession.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !possession.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false
      }

      // Filter by category
      if (selectedCategory !== 'all' && possession.categoryId !== selectedCategory) {
        return false
      }

      return true
    })
    .sort((a, b) => {
      // Sort by selected field
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (aValue == null && bValue == null) return 0
      if (aValue == null) return sortDirection === 'asc' ? -1 : 1
      if (bValue == null) return sortDirection === 'asc' ? 1 : -1

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1

      return 0
    })

  // Calculate total value of possessions
  const getTotalValue = () => {
    return possessions.reduce((total, possession) => {
      // If item is sold, don't count it in the current value
      if (possession.dateSold) return total
      return total + possession.purchasePrice
    }, 0)
  }

  // Get categories as a map for easy lookup
  const categoriesMap = categories.reduce<Record<string, Category>>((acc, category) => {
    acc[category.id] = category
    return acc
  }, {})

  return {
    // Data
    possessions,
    filteredPossessions,
    categories,
    categoriesMap,

    // Loading and error states
    loading: possessionsLoading || categoriesLoading,
    possessionsError: possessionsError as Error | null,
    categoriesError: categoriesError as Error | null,

    // CRUD operations
    newPossession,
    setNewPossession,
    createPossession,
    possessionToEdit,
    setPossessionToEdit,
    updatePossession,
    deletePossession,

    // Filtering and sorting
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,

    // Calculated values
    getTotalValue,
  }
}
