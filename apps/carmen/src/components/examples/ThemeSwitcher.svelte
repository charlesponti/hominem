<script lang="ts">
  import { writable } from 'svelte/store'
  
  // Available DaisyUI themes
  const themes = [
    'winter',  // Default
    'light',
    'dark',
    'cupcake',
    'bumblebee',
    'emerald',
    'corporate',
    'synthwave',
    'retro',
    'cyberpunk',
    'aqua'
  ]
  
  // Theme store
  const currentTheme = writable('winter')
  
  // Function to change theme
  function setTheme(theme: string) {
    // Update the HTML data-theme attribute
    document.documentElement.setAttribute('data-theme', theme)
    // Update the store
    currentTheme.set(theme)
  }
  
  // Initialize theme from local storage on mount
  import { onMount } from 'svelte'
  onMount(() => {
    const savedTheme = localStorage.getItem('theme') || 'winter'
    setTheme(savedTheme)
  })
  
  // Watch for theme changes and save to localStorage
  $: if ($currentTheme) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', $currentTheme)
    }
  }
</script>

<div class="theme-switcher p-4 bg-base-200 rounded-lg shadow-md">
  <h3 class="text-lg font-semibold mb-3">Theme Switcher</h3>
  
  <div class="flex flex-wrap gap-2">
    {#each themes as theme}
      <button 
        class="btn btn-sm {$currentTheme === theme ? 'btn-primary' : 'btn-ghost'}"
        on:click={() => setTheme(theme)}
      >
        {theme}
      </button>
    {/each}
  </div>
  
  <div class="mt-4">
    <p class="text-sm">Current theme: <span class="font-semibold">{$currentTheme}</span></p>
  </div>
  
  <!-- Theme preview -->
  <div class="mt-4 flex flex-col gap-2">
    <div class="grid grid-cols-5 gap-2">
      <div class="bg-primary h-8 rounded"></div>
      <div class="bg-secondary h-8 rounded"></div>
      <div class="bg-accent h-8 rounded"></div>
      <div class="bg-neutral h-8 rounded"></div>
      <div class="bg-base-100 h-8 rounded border"></div>
    </div>
    
    <div class="flex gap-1 mt-2">
      <div class="badge badge-primary">primary</div>
      <div class="badge badge-secondary">secondary</div>
      <div class="badge badge-accent">accent</div>
      <div class="badge badge-neutral">neutral</div>
    </div>
  </div>
</div>