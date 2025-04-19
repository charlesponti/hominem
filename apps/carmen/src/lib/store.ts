// Basic store implementation with Svelte
import { writable } from 'svelte/store'

// Export auth stores from clerk.ts
export { user, isAuthenticated, signIn as login, signOut as logout } from './clerk'

// Lists store
export const lists = writable([])

// Bookmarks store
export const bookmarks = writable([])

// Base URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
