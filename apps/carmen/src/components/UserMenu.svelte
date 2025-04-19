<script>
import { user, logout } from '../lib/store'
import { navigate } from 'svelte-navigator'
import { LOGIN } from '../lib/routes'

// Show dropdown state
let showDropdown = false

// Toggle dropdown visibility
function toggleDropdown() {
  showDropdown = !showDropdown
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
  if (showDropdown && !event.target.closest('.user-menu')) {
    showDropdown = false
  }
}

// Handle logout
async function handleLogout() {
  try {
    await logout()
    navigate(LOGIN)
  } catch (err) {
    console.error('Logout error:', err)
  }
}
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative user-menu">
  <button 
    on:click={toggleDropdown} 
    class="flex items-center space-x-2 focus:outline-none"
    aria-expanded={showDropdown}
    aria-haspopup="true"
  >
    <!-- User avatar (placeholder) -->
    <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
      {#if $user?.firstName}
        <span>{$user.firstName.charAt(0)}</span>
      {:else}
        <span>U</span>
      {/if}
    </div>
    
    <!-- Username -->
    <span class="text-sm font-medium text-gray-700">
      {$user?.firstName || 'User'}
    </span>
    
    <!-- Chevron icon -->
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      class="h-4 w-4 text-gray-500" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      class:rotate-180={showDropdown}
      style="transition: transform 0.2s ease-in-out"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  
  <!-- Dropdown menu -->
  {#if showDropdown}
    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
      <a href="#/account" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
        Account Settings
      </a>
      <button
        on:click={handleLogout}
        class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        Sign out
      </button>
    </div>
  {/if}
</div>