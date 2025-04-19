<script lang="ts">
  import Alert from '@hominem/components/Alert'
  import Input from '@hominem/components/Input'
  import Button from '@hominem/components/Button'
  import { URLS, api } from 'src/lib/api/base'
  import { mutationStore } from '@tanstack/svelte-query'
  import { writable } from 'svelte/store'
  
  const MIN_LENGTH = 3
  
  export let onCreate: () => void
  export let onCancel: () => void
  
  let name = ''
  let error = null
  
  const createList = mutationStore({
    mutationFn: async () => {
      await api.post(URLS.lists, { name })
    },
    onSuccess: () => {
      name = ''
      onCreate()
    },
    onError: (err) => {
      error = err
    }
  })
  
  function handleCancel(e) {
    e.preventDefault()
    name = ''
    onCancel()
  }
  
  function handleSubmit(e) {
    e.preventDefault()
    $createList.mutate()
  }
</script>

{#if error}
  <Alert type="error">{error.message}</Alert>
{/if}

<form on:submit={handleSubmit}>
  <Input
    autoFocus={true}
    name="listName"
    type="text"
    label="List name"
    bind:value={name}
  />
  <div class="btn-group-horizontal float-right">
    <Button class="btn-outline px-12 bg-blue-100" on:click={handleCancel}>
      Cancel
    </Button>
    <Button
      class="px-12"
      disabled={name.length < MIN_LENGTH}
      isLoading={$createList.isPending}
    >
      Submit
    </Button>
  </div>
</form>