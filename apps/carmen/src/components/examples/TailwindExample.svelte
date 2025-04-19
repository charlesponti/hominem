<script lang="ts">
  // Example props
  export let title: string = "Tailwind CSS & DaisyUI Example"
  export let variant: "primary" | "secondary" | "accent" | "info" | "warning" | "error" | "success" = "primary"
  
  // Example state
  let count = 0
  let showModal = false
  
  // Example function
  function incrementCount() {
    count += 1
  }
  
  function toggleModal() {
    showModal = !showModal
  }
</script>

<div class="card w-96 bg-base-100 shadow-xl">
  <div class="card-body">
    <h2 class="card-title text-center">{title}</h2>
    <p class="py-4">This is an example component using Tailwind CSS and DaisyUI.</p>
    
    <!-- Tailwind classes example -->
    <div class="flex flex-col gap-4 items-center">
      <div class="bg-gray-100 rounded-lg p-4 w-full text-center">
        <p class="text-lg font-semibold">Count: {count}</p>
      </div>
      
      <!-- DaisyUI button variants -->
      <div class="flex flex-wrap gap-2 justify-center">
        <button class="btn btn-primary" on:click={incrementCount}>Primary</button>
        <button class="btn btn-secondary">Secondary</button>
        <button class="btn btn-accent">Accent</button>
        <button class="btn btn-ghost">Ghost</button>
      </div>
      
      <!-- DaisyUI button sizes -->
      <div class="flex flex-wrap gap-2 justify-center mt-4">
        <button class="btn btn-{variant} btn-xs">Tiny</button>
        <button class="btn btn-{variant} btn-sm">Small</button>
        <button class="btn btn-{variant}">Normal</button>
        <button class="btn btn-{variant} btn-lg">Large</button>
      </div>
      
      <!-- DaisyUI alert -->
      <div class="alert alert-{variant} w-full">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>This is a {variant} alert</span>
      </div>
      
      <!-- Modal example -->
      <button class="btn btn-{variant}" on:click={toggleModal}>Open Modal</button>
    </div>
  </div>
</div>

<!-- DaisyUI Modal -->
{#if showModal}
  <div class="modal modal-open">
    <div class="modal-box">
      <h3 class="font-bold text-lg">DaisyUI Modal</h3>
      <p class="py-4">This is a modal example using DaisyUI components</p>
      <div class="modal-action">
        <button class="btn" on:click={toggleModal}>Close</button>
      </div>
    </div>
  </div>
{/if}

<!-- Component styling with Tailwind -->
<style>
  /* You can still use Svelte scoped styles alongside Tailwind */
  .card-title {
    @apply text-2xl font-bold text-primary;
  }
</style>