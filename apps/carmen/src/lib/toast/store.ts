import { writable } from 'svelte/store'
import type { ToastMessage } from './types'

// Define the store state type
interface ToastState {
  isOpen: boolean
  messages: ToastMessage[]
}

// Create a writable store with initial state
const createToastStore = () => {
  const { subscribe, update, set } = writable<ToastState>({
    isOpen: false,
    messages: []
  })

  return {
    subscribe,
    openToast: (message: ToastMessage) => {
      update(state => ({
        isOpen: true,
        messages: [...state.messages, message]
      }))
      
      // Set a timeout to close the toast automatically
      setTimeout(() => {
        set({
          isOpen: false,
          messages: []
        })
      }, 3000)
    },
    closeToast: () => {
      set({
        isOpen: false,
        messages: []
      })
    }
  }
}

// Export the store
export const toastStore = createToastStore()

// Helper hook for usage in components
export const useToast = () => toastStore