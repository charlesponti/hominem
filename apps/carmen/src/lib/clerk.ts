import { writable, derived } from 'svelte/store'

// Will be initialized after module loads
let clerk: import('@clerk/clerk-js').Clerk | null = null

// Dynamic import of Clerk to work around build issues
async function loadClerk() {
  try {
    const Clerk = (await import('@clerk/clerk-js')).default
    clerk = new Clerk(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '')
    return clerk
  } catch (error) {
    console.error('Failed to load Clerk:', error)
    return null
  }
}

// Store for Clerk initialization status
export const isClerkLoaded = writable(false)

// Store for current user
export const user = writable(null)

// Derived store for authentication status
export const isAuthenticated = derived(user, ($user) => !!$user)

// Initialize Clerk
export async function initializeClerk() {
  try {
    const clerkInstance = await loadClerk()
    if (!clerkInstance) return

    await clerkInstance.load()
    isClerkLoaded.set(true)

    // Update user store when user state changes
    clerkInstance.addListener((event: { user: unknown }) => {
      if (event.user) {
        user.set(event.user)
      } else {
        user.set(null)
      }
    })

    // Set initial user state
    if (clerkInstance.user) {
      user.set(clerkInstance.user)
    }
  } catch (error) {
    console.error('Error initializing Clerk:', error)
  }
}

// Authentication functions
export async function signIn() {
  if (!clerk) {
    const clerkInstance = await loadClerk()
    if (!clerkInstance) return
    await clerkInstance.openSignIn()
  } else {
    await clerk.openSignIn()
  }
}

export async function signUp() {
  if (!clerk) {
    const clerkInstance = await loadClerk()
    if (!clerkInstance) return
    await clerkInstance.openSignUp()
  } else {
    await clerk.openSignUp()
  }
}

export async function signOut() {
  if (!clerk) {
    const clerkInstance = await loadClerk()
    if (!clerkInstance) return
    await clerkInstance.signOut()
  } else {
    await clerk.signOut()
  }
  user.set(null)
}

// Helper to get the current user
export function getUser() {
  return clerk?.user || null
}
