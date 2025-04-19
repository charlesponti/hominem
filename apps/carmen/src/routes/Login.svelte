<script lang="ts">
import { login, isAuthenticated } from '../lib/store'
import { DASHBOARD } from '../lib/routes'
import { navigate } from 'svelte-navigator'
import { onMount } from 'svelte'
import { isClerkLoaded } from '../lib/clerk'

let error = ''
let loading = false

// Redirect if already authenticated
onMount(() => {
  if ($isAuthenticated) {
    navigate(DASHBOARD)
  }
})

// Handle Clerk sign in
async function handleSignIn() {
  try {
    loading = true
    error = ''
    await login()
  } catch (err) {
    console.error('Sign in error:', err)
    error = 'An error occurred during sign in'
  } finally {
    loading = false
  }
}
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
      Sign in to your account
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
      {#if error}
        <div class="bg-red-50 text-red-800 p-3 rounded mb-4">
          {error}
        </div>
      {/if}
      
      <div class="space-y-6">
        <p class="text-center text-gray-600">
          Sign in securely with your account to access all features.
        </p>
        
        <div>
          <button 
            on:click={handleSignIn}
            disabled={loading || !$isClerkLoaded}
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {#if loading}
              <span class="flex items-center">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            {:else if !$isClerkLoaded}
              Loading authentication...
            {:else}
              Sign in with Clerk
            {/if}
          </button>
        </div>
        
        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account? 
            <button on:click={handleSignIn} class="font-medium text-blue-600 hover:text-blue-500">
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  </div>
</div>