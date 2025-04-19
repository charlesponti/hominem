<script>
import Header from '../components/Header.svelte'

// Slot for page content
export const path = '' // Path info (not used but needed to satisfy API)
</script>

<div class="flex flex-col min-h-screen">
  <Header />
  
  <main class="flex-grow">
    <slot></slot>
  </main>
  
  <footer class="bg-gray-800 text-white py-4">
    <div class="container mx-auto px-4 text-center">
      <p class="text-sm">© {new Date().getFullYear()} Carmen. All rights reserved.</p>
    </div>
  </footer>
</div>