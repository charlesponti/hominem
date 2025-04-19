<script>
import { LANDING } from '../lib/routes'
import { navigate } from 'svelte-navigator'
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
    <h1 class="text-9xl font-bold text-gray-900">404</h1>
    <h2 class="mt-6 text-center text-3xl font-bold text-gray-900">
      Page not found
    </h2>
    <p class="mt-4 text-gray-600">
      The page you're looking for doesn't exist or you don't have permission to view it.
    </p>
    <div class="mt-8">
      <button 
        on:click={() => navigate(LANDING)}
        class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Return to home
      </button>
    </div>
  </div>
</div>