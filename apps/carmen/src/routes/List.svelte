<script>
import { onMount } from 'svelte'
import { navigate, useParams } from 'svelte-navigator'
import { lists, isAuthenticated } from '../lib/store'
import { LOGIN, LISTS } from '../lib/routes'

// Get route params
const params = useParams()
let listId
$: listId = $params.id

// Current list state
let list
let listItems = []

// Protect route
onMount(() => {
  if (!$isAuthenticated) {
    navigate(LOGIN)
  }
})

// Load list data
$: {
  if (listId && $lists.length > 0) {
    list = $lists.find((l) => l.id === listId)

    // If list not found, redirect
    if (!list) {
      navigate(LISTS)
    }

    // Mock list items data
    listItems = [
      { id: '1', name: 'Central Park', description: 'Famous park in NYC', completed: false },
      { id: '2', name: 'Empire State Building', description: 'Iconic skyscraper', completed: true },
      { id: '3', name: 'Times Square', description: 'Bustling tourist area', completed: false },
    ]
  }
}

function toggleItem(id) {
  listItems = listItems.map((item) =>
    item.id === id ? { ...item, completed: !item.completed } : item
  )
}
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center">
      <button 
        on:click={() => navigate(LISTS)}
        class="mr-4 text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>
      <h1 class="text-3xl font-bold text-gray-900">{list?.name || 'Loading...'}</h1>
    </div>
  </header>
  
  <main>
    <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {#if list}
        <div class="px-4 py-6 sm:px-0">
          <div class="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div class="px-4 py-5 sm:px-6">
              <h2 class="text-lg leading-6 font-medium text-gray-900">List Details</h2>
              <p class="mt-1 max-w-2xl text-sm text-gray-500">{list.description}</p>
            </div>
            <div class="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div class="flex justify-between">
                <div>
                  <span class="text-sm font-medium text-gray-500">Items: {listItems.length}</span>
                </div>
                <div>
                  <button class="text-sm text-blue-600 hover:text-blue-800">
                    Share List
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-medium text-gray-900">List Items</h3>
            <button class="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
              Add Item
            </button>
          </div>
          
          <div class="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul class="divide-y divide-gray-200">
              {#each listItems as item}
                <li class="px-4 py-4 sm:px-6">
                  <div class="flex items-center">
                    <input 
                      type="checkbox" 
                      checked={item.completed}
                      on:change={() => toggleItem(item.id)}
                      class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div class="ml-3">
                      <p class="text-sm font-medium text-gray-900 {item.completed ? 'line-through' : ''}">
                        {item.name}
                      </p>
                      <p class="text-sm text-gray-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </li>
              {/each}
              
              {#if listItems.length === 0}
                <li class="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No items in this list yet
                </li>
              {/if}
            </ul>
          </div>
        </div>
      {/if}
    </div>
  </main>
</div>