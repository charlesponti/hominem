<script>
import { isAuthenticated } from '../lib/store'
import { navigate } from 'svelte-navigator'
import UserMenu from './UserMenu.svelte'

// Get current path from URL for highlighting active nav item
let currentPath = ''

// Update current path when it changes
function updateCurrentPath() {
  currentPath = window.location.hash.slice(1) || '/'
}
</script>

<svelte:window on:hashchange={updateCurrentPath} />

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between h-16">
      <div class="flex">
        <!-- Logo -->
        <div class="flex-shrink-0 flex items-center">
          <a href="#/" class="font-bold text-xl text-blue-600">Carmen</a>
        </div>
        
        <!-- Navigation -->
        <nav class="hidden sm:ml-6 sm:flex sm:space-x-8">
          <a 
            href="#/"
            class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full {currentPath === '/' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Home
          </a>
          
          {#if $isAuthenticated}
            <a 
              href="#/dashboard"
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full {currentPath === '/dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              Dashboard
            </a>
            
            <a 
              href="#/lists"
              class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full {currentPath === '/lists' || currentPath.startsWith('/lists/') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            >
              Lists
            </a>
          {/if}
          
          <!-- Examples link (always visible) -->
          <a 
            href="#/examples"
            class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full {currentPath === '/examples' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          >
            Examples
          </a>
        </nav>
      </div>
      
      <!-- Right side -->
      <div class="flex items-center">
        {#if $isAuthenticated}
          <!-- User menu -->
          <UserMenu />
        {:else}
          <!-- Login button -->
          <button 
            on:click={() => navigate('/login')}
            class="ml-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in
          </button>
        {/if}
      </div>
    </div>
  </div>
</header>