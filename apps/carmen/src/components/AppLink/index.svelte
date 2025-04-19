<script lang="ts">
  import { Link, useLocation } from 'svelte-navigator'
  import { twMerge } from 'tailwind-merge'
  
  export let to: string
  export let btn: boolean = false
  export let className: string = ''
  
  // Get current location to check if link is active
  const location = useLocation()
  $: isActive = $location.pathname === to
</script>

{#if btn}
  <Link {to} {...$$restProps}>
    <span class={twMerge('btn btn-primary text-white px-4 py-3 hover:cursor-pointer', className)}>
      <slot></slot>
    </span>
  </Link>
{:else}
  <Link 
    {to} 
    class={twMerge('text-black', isActive ? 'bg-blue-100' : null, className)} 
    {...$$restProps}
  >
    <slot></slot>
  </Link>
{/if}