<script lang="ts">
import { onMount } from 'svelte'
import { navigate } from 'svelte-navigator'
import { isAuthenticated, user, lists } from '../lib/store'
import { LOGIN, LIST } from '../lib/routes'

// Protected route check
onMount(() => {
  if (!$isAuthenticated) {
    navigate(LOGIN)
  }
})

// Mock data
onMount(() => {
  if ($lists.length === 0) {
    lists.set([
      { id: '1', name: 'Places to Visit', description: 'My travel bucket list', itemsCount: 12 },
      { id: '2', name: 'Restaurants', description: 'Good places to eat', itemsCount: 8 },
      { id: '3', name: 'Shopping', description: 'Stores to check out', itemsCount: 5 },
    ])
  }
})

function goToList(id: string) {
  navigate(`/lists/${id}`)
}
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <div class="flex items-center space-x-4">
        <span class="text-gray-700">{$user?.name || 'User'}</span>
        <button 
          on:click={() => navigate('/account')}
          class="text-sm text-gray-600 hover:text-gray-900"
        >
          Account
        </button>
      </div>
    </div>
  </header>
  
  <main>
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <!-- Lists Section -->
      <div class="px-4 py-6 sm:px-0">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-semibold text-gray-900">Your Lists</h2>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
          >
            Create New List
          </button>
        </div>
        
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each $lists as list}
            <button 
              class="w-full text-left bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
              on:click={() => goToList(list.id)}
              on:keydown={e => e.key === 'Enter' && goToList(list.id)}
            >
              <div class="p-5">
                <h3 class="text-lg font-semibold text-gray-900 mb-1">{list.name}</h3>
                <p class="text-gray-600 text-sm mb-3">{list.description}</p>
                <div class="text-gray-500 text-xs font-medium">
                  {list.itemsCount} items
                </div>
              </div>
            </button>
          {/each}
        </div>
        
        {#if $lists.length === 0}
          <div class="text-center py-12">
            <p class="text-gray-500">You don't have any lists yet. Create your first list to get started!</p>
          </div>
        {/if}
      </div>
      
      <!-- Recent Activity Section -->
      <div class="px-4 py-6 sm:px-0 mt-8">
        <h2 class="text-2xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
        
        <div class="bg-white shadow rounded-lg overflow-hidden">
          <div class="divide-y divide-gray-200">
            <div class="p-4">
              <p class="text-gray-500 text-sm">No recent activity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>