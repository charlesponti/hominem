<script lang="ts">
  // This component demonstrates the use of the Google Fonts
  export let showVariants = false
</script>

<div class="p-6 bg-base-200 rounded-lg shadow-md">
  <h3 class="text-xl font-bold mb-6">Google Fonts Demonstration</h3>
  
  <div class="grid gap-8">
    <!-- Inter Font (Sans) -->
    <div class="space-y-4">
      <h4 class="text-lg font-semibold border-b pb-2">Inter (Sans)</h4>
      <p class="font-sans text-2xl">
        This is the Inter font — Used for body text.
      </p>
      {#if showVariants}
        <div class="grid gap-2">
          <p class="font-sans font-thin">Inter Font Weight 100 (Thin)</p>
          <p class="font-sans font-extralight">Inter Font Weight 200 (Extra Light)</p>
          <p class="font-sans font-light">Inter Font Weight 300 (Light)</p>
          <p class="font-sans font-normal">Inter Font Weight 400 (Regular)</p>
          <p class="font-sans font-medium">Inter Font Weight 500 (Medium)</p>
          <p class="font-sans font-semibold">Inter Font Weight 600 (Semi Bold)</p>
          <p class="font-sans font-bold">Inter Font Weight 700 (Bold)</p>
          <p class="font-sans font-extrabold">Inter Font Weight 800 (Extra Bold)</p>
          <p class="font-sans font-black">Inter Font Weight 900 (Black)</p>
        </div>
      {/if}
    </div>
    
    <!-- EB Garamond Font (Serif) -->
    <div class="space-y-4">
      <h4 class="text-lg font-semibold border-b pb-2">EB Garamond (Serif)</h4>
      <p class="font-serif text-2xl">
        This is the EB Garamond font — Perfect for elegant, literary content.
      </p>
      {#if showVariants}
        <div class="grid gap-2">
          <p class="font-serif font-normal">EB Garamond Font Weight 400 (Regular)</p>
          <p class="font-serif font-medium">EB Garamond Font Weight 500 (Medium)</p>
          <p class="font-serif font-semibold">EB Garamond Font Weight 600 (Semi Bold)</p>
          <p class="font-serif font-bold">EB Garamond Font Weight 700 (Bold)</p>
          <p class="font-serif font-extrabold">EB Garamond Font Weight 800 (Extra Bold)</p>
          <p class="font-serif italic">EB Garamond Italic Style</p>
        </div>
      {/if}
    </div>
    
    <!-- Montserrat Font (Display) -->
    <div class="space-y-4">
      <h4 class="text-lg font-semibold border-b pb-2">Montserrat (Display)</h4>
      <p class="font-display text-2xl">
        This is the Montserrat font — Used for headings and display text.
      </p>
      {#if showVariants}
        <div class="grid gap-2">
          <p class="font-display font-thin">Montserrat Font Weight 100 (Thin)</p>
          <p class="font-display font-extralight">Montserrat Font Weight 200 (Extra Light)</p>
          <p class="font-display font-light">Montserrat Font Weight 300 (Light)</p>
          <p class="font-display font-normal">Montserrat Font Weight 400 (Regular)</p>
          <p class="font-display font-medium">Montserrat Font Weight 500 (Medium)</p>
          <p class="font-display font-semibold">Montserrat Font Weight 600 (Semi Bold)</p>
          <p class="font-display font-bold">Montserrat Font Weight 700 (Bold)</p>
          <p class="font-display font-extrabold">Montserrat Font Weight 800 (Extra Bold)</p>
          <p class="font-display font-black">Montserrat Font Weight 900 (Black)</p>
        </div>
      {/if}
    </div>
  </div>
  
  <div class="mt-8">
    <button class="btn btn-primary" on:click={() => showVariants = !showVariants}>
      {showVariants ? 'Hide' : 'Show'} Font Variants
    </button>
  </div>
  
  <div class="mt-8 p-6 bg-base-100 rounded-lg shadow-sm">
    <h4 class="text-heading-3 mb-4">Practical Example with Typography Classes</h4>
    <h2 class="text-display-2 text-primary mb-4">Welcome to Carmen</h2>
    <p class="text-body-large mb-4">
      Carmen is a personal travel companion and list manager application. 
      Built with Svelte, Tailwind CSS, and DaisyUI, it provides a smooth and 
      responsive user experience for managing your travel plans.
    </p>
    <blockquote class="text-quote text-gray-600 border-l-4 border-primary pl-4 py-2 mb-4">
      "Travel makes one modest. You see what a tiny place you occupy in the world."
      – Gustave Flaubert
    </blockquote>
    <p class="text-body">
      With Carmen, you can create, organize, and share your favorite places, 
      creating the perfect itinerary for your next adventure.
    </p>
    
    <div class="divider my-6">Typography Classes</div>
    
    <div class="grid gap-2">
      <div class="text-display-1">text-display-1</div>
      <div class="text-display-2">text-display-2</div>
      <div class="text-heading-1">text-heading-1</div>
      <div class="text-heading-2">text-heading-2</div>
      <div class="text-heading-3">text-heading-3</div>
      <div class="text-body-large">text-body-large</div>
      <div class="text-body">text-body</div>
      <div class="text-body-small">text-body-small</div>
      <div class="text-quote">text-quote</div>
    </div>
  </div>
</div>