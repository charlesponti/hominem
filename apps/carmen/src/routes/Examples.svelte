<script lang="ts">
  import ThemeSwitcher from '../components/examples/ThemeSwitcher.svelte'
  import TailwindExample from '../components/examples/TailwindExample.svelte'
  import FontsDemo from '../components/examples/FontsDemo.svelte'
  
  // Demo state
  let selectedVariant = 'primary' 
  const variants = ['primary', 'secondary', 'accent', 'info', 'warning', 'error', 'success']
</script>

<div class="p-8 max-w-4xl mx-auto">
  <h1 class="text-4xl font-bold mb-8 text-center">Tailwind CSS & DaisyUI Examples</h1>
  
  <div class="mb-8">
    <ThemeSwitcher />
  </div>
  
  <div class="mb-8">
    <div class="form-control w-full max-w-xs mx-auto mb-4">
      <label class="label" for="variant-select">
        <span class="label-text">Select component variant</span>
      </label>
      <select 
        class="select select-bordered w-full" 
        id="variant-select"
        bind:value={selectedVariant}
      >
        {#each variants as variant}
          <option value={variant}>{variant}</option>
        {/each}
      </select>
    </div>
  </div>
  
  <div class="flex justify-center">
    <TailwindExample variant={selectedVariant} />
  </div>
  
  <!-- DaisyUI Component Demo -->
  <div class="mt-16">
    <h2 class="text-2xl font-bold mb-6 text-center">DaisyUI Component Examples</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Cards -->
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <h3 class="card-title">Cards</h3>
          <p>DaisyUI provides beautiful card components</p>
          <div class="card-actions justify-end">
            <button class="btn btn-primary btn-sm">Action</button>
          </div>
        </div>
      </div>
      
      <!-- Buttons -->
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <h3 class="card-title">Buttons</h3>
          <div class="flex flex-wrap gap-2">
            <button class="btn btn-outline">Outline</button>
            <button class="btn btn-link">Link</button>
            <button class="btn btn-primary btn-outline">Primary</button>
          </div>
        </div>
      </div>
      
      <!-- Form elements -->
      <div class="card bg-base-100 shadow-md">
        <div class="card-body">
          <h3 class="card-title">Form elements</h3>
          <div class="form-control">
            <label class="label">
              <span class="label-text">Input</span>
            </label>
            <input type="text" placeholder="Type here" class="input input-bordered w-full" />
          </div>
          <div class="form-control">
            <label class="label cursor-pointer">
              <span class="label-text">Toggle</span>
              <input type="checkbox" class="toggle toggle-primary" />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Tailwind Utility Classes Demo -->
  <div class="mt-16 mb-8">
    <h2 class="text-2xl font-bold mb-6 text-center">Tailwind CSS Utility Examples</h2>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Flex Layout Example -->
      <div class="p-4 bg-base-200 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold mb-3">Flex Layout</h3>
        <div class="flex flex-col md:flex-row gap-2">
          <div class="bg-primary text-primary-content p-4 rounded flex-1 text-center">Flex Item 1</div>
          <div class="bg-secondary text-secondary-content p-4 rounded flex-1 text-center">Flex Item 2</div>
          <div class="bg-accent text-accent-content p-4 rounded flex-1 text-center">Flex Item 3</div>
        </div>
      </div>
      
      <!-- Typography Example -->
      <div class="p-4 bg-base-200 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold mb-3">Typography</h3>
        <p class="text-xs">Extra small text</p>
        <p class="text-sm">Small text</p>
        <p class="text-base">Base text</p>
        <p class="text-lg">Large text</p>
        <p class="text-xl">Extra large text</p>
        <p class="font-bold">Bold text</p>
        <p class="italic">Italic text</p>
        <p class="underline">Underlined text</p>
      </div>
    </div>
  </div>
  
  <!-- Google Fonts Demo -->
  <div class="mt-16 mb-8">
    <h2 class="text-2xl font-bold mb-6 text-center">Google Fonts</h2>
    <FontsDemo />
  </div>
</div>