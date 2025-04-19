<script lang="ts">
  import { MoreVertical } from 'lucide-svelte'
  import { writable } from 'svelte/store'
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from 'src/components/ui/dropdown-menu.svelte'
  import type { List } from 'src/lib/types'
  import ListEditSheet from './list-edit-sheet.svelte'
  
  export let list: List & { createdBy: { email: string } }
  export let isOwnList: boolean
  
  // Create stores for state management
  const isEditSheetOpen = writable(false)
  const isDeleteSheetOpen = writable(false)
  
  // Export the stores for other components to use if needed
  export { isEditSheetOpen, isDeleteSheetOpen }
</script>

{#if isOwnList}
  <DropdownMenu>
    <DropdownMenuTrigger data-testid="list-dropdownmenu-trigger">
      <MoreVertical />
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem class="p-2" on:click={() => $isEditSheetOpen = true}>
        Edit
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  <ListEditSheet {list} bind:isOpen={$isEditSheetOpen} />
{/if}