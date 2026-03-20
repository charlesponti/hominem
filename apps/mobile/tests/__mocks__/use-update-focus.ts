import { vi } from 'vitest'

export interface UpdateFocusItemInput {
  id: string
  text: string
  category: string
  scheduledFor?: Date | null
  timezone: string
}

export function useUpdateFocusItem() {
  return {
    isPending: false,
    mutateAsync: vi.fn(),
  }
}
