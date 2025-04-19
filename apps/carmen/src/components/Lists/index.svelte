<script lang="ts">
  import Alert from '@hominem/components/Alert'
  import { LoadingScreen } from '@hominem/components/Loading'
  import type { List, User } from 'src/lib/types'
  import ListItem from './list-item.svelte'
  
  export let status: string
  export let lists: (List & { createdBy: User })[]
  export let error: Error | unknown
  export let currentUserEmail: string
</script>

{#if status === 'loading'}
  <LoadingScreen />
{:else if error}
  <Alert type="error">{error instanceof Error ? error.message : 'An error occurred'}</Alert>
{:else if lists?.length === 0}
  <div class="flex flex-col items-center justify-center text-center py-6">
    <p class="text-gray-400">Your lists will appear here once you create them.</p>
    <p class="text-gray-400"> Start saving your favorite places!</p>
  </div>
{:else if lists}
  <ul data-testid="lists" class="space-y-2">
    {#each lists as list (list.id)}
      <ListItem list={list} isOwnList={list.createdBy.email === currentUserEmail} />
    {/each}
  </ul>
{/if}