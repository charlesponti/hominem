<script lang="ts">
  import AppLink from '../AppLink/index.svelte'
  import ListMenu from './list-menu.svelte'
  import type { List } from 'src/lib/types'
  
  export let list: List & { createdBy: { email: string } }
  export let isOwnList: boolean
</script>

<li class="flex">
  <AppLink
    class="flex justify-between items-center p-3 text-lg border rounded-md w-full"
    to={`/list/${list.id}`}
  >
    {list.name}

    <span class="flex items-center gap-2">
      <!-- Only display list owner if the list does not belong to current user -->
      {#if isOwnList}
        <p class="text-xs text-gray-400">{list.createdBy.email}</p>
      {/if}
      <ListMenu {list} {isOwnList} />
    </span>
  </AppLink>
</li>