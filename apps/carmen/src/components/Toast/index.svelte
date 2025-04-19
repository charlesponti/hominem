<script lang="ts">
  import { CheckCircleIcon } from 'lucide-svelte'
  import { toastStore } from 'src/lib/toast/store'
  import type { ToastMessage } from 'src/lib/toast/types'
  
  // Subscribe to the toast store
  $: messages = $toastStore.messages
</script>

<div class="toast toast-center z-50 bottom-20">
  {#each messages as message (message.text)}
    <div class="alert alert-{message.type}">
      {#if message.type === 'success'}
        <CheckCircleIcon size={16} class="w-4 h-4 mr-2" />
      {/if}
      <span>{message.text}</span>
    </div>
  {/each}
</div>