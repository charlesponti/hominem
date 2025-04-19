<script>
import { onMount } from 'svelte'
import { navigate, useParams } from 'svelte-navigator'
import { DASHBOARD } from '../lib/routes'

// Get route params
const params = useParams()
let placeId
$: placeId = $params.id

// Mock place data
let place = null

onMount(() => {
  // In a real app, this would be an API call using the placeId
  setTimeout(() => {
    place = {
      id: placeId,
      name: 'Empire State Building',
      description: 'Iconic 102-story skyscraper in Midtown Manhattan',
      address: '350 5th Ave, New York, NY 10118',
      rating: 4.7,
      photos: ['https://via.placeholder.com/800x400'],
      website: 'https://www.esbnyc.com/',
      openingHours: [
        'Monday: 10:00 AM – 10:00 PM',
        'Tuesday: 10:00 AM – 10:00 PM',
        'Wednesday: 10:00 AM – 10:00 PM',
        'Thursday: 10:00 AM – 10:00 PM',
        'Friday: 10:00 AM – 10:00 PM',
        'Saturday: 10:00 AM – 10:00 PM',
        'Sunday: 10:00 AM – 10:00 PM',
      ],
    }
  }, 500)
})
</script>

<div class="min-h-screen bg-gray-50">
  <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex items-center">
      <button 
        on:click={() => navigate(DASHBOARD)}
        class="mr-4 text-gray-600 hover:text-gray-900"
      >
        ← Back
      </button>
      <h1 class="text-3xl font-bold text-gray-900">{place?.name || 'Loading place...'}</h1>
    </div>
  </header>
  
  <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    {#if place}
      <!-- Place photos -->
      {#if place.photos && place.photos.length > 0}
        <div class="mb-6 bg-white p-2 rounded-lg shadow-sm">
          <img 
            src={place.photos[0]} 
            alt={place.name} 
            class="w-full h-64 object-cover rounded"
          />
        </div>
      {/if}
      
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <!-- Place details -->
          <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 class="text-xl font-semibold mb-4">About</h2>
            <p class="text-gray-700 mb-4">{place.description}</p>
            
            {#if place.website}
              <div class="mb-4">
                <h3 class="text-sm font-medium text-gray-500 mb-1">Website</h3>
                <a 
                  href={place.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800"
                >
                  {place.website}
                </a>
              </div>
            {/if}
            
            {#if place.address}
              <div>
                <h3 class="text-sm font-medium text-gray-500 mb-1">Address</h3>
                <p class="text-gray-900">{place.address}</p>
              </div>
            {/if}
          </div>
          
          <!-- Hours -->
          {#if place.openingHours && place.openingHours.length > 0}
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <h2 class="text-xl font-semibold mb-4">Hours</h2>
              <ul class="space-y-2">
                {#each place.openingHours as hours}
                  <li class="text-gray-700">{hours}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
        
        <div>
          <!-- Actions -->
          <div class="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h2 class="text-xl font-semibold mb-4">Actions</h2>
            <div class="space-y-3">
              <button class="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Add to List
              </button>
              <button class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition">
                Get Directions
              </button>
              <button class="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition">
                Save as Bookmark
              </button>
            </div>
          </div>
          
          <!-- Rating -->
          {#if place.rating}
            <div class="bg-white p-6 rounded-lg shadow-sm">
              <h2 class="text-xl font-semibold mb-4">Rating</h2>
              <div class="flex items-center">
                <span class="text-2xl font-bold text-gray-900">{place.rating}</span>
                <div class="ml-2 flex text-yellow-400">
                  <!-- Simple rating stars -->
                  {#each Array(5) as _, i}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill={i < Math.floor(place.rating) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {:else}
      <!-- Loading state -->
      <div class="flex justify-center py-12">
        <div class="animate-pulse text-gray-500">Loading place details...</div>
      </div>
    {/if}
  </main>
</div>