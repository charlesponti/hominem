import { type SyntheticEvent, useCallback, useId, useState } from 'react'
import Alert from '~/components/alert'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/components/ui/input'
import { Label } from '@hominem/ui/components/ui/label'

import { trpc } from '~/lib/trpc/client'
import type { ListInvite } from '~/lib/types'

type ListInviteFormProps = {
  listId: string
  onCreate: (invite: ListInvite) => void
}

export default function ListInviteForm({ listId, onCreate }: ListInviteFormProps) {
  const [email, setEmail] = useState('')
  const emailId = useId()

  const mutation = trpc.invites.create.useMutation({
    onSuccess: (invite) => {
      setEmail('')
      onCreate(invite)
    },
  })

  const onNameChange = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    setEmail(e.currentTarget.value)
  }, [])

  const onFormSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      await mutation.mutateAsync({ listId, invitedUserEmail: email })
    },
    [email, mutation, listId]
  )

  return (
    <div className="flex flex-col gap-3">
      {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}

      <form className="flex items-center gap-1" onSubmit={onFormSubmit}>
        <Label htmlFor={emailId} className="sr-only">
          Email address
        </Label>
        <Input
          id={emailId}
          type="email"
          name="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={onNameChange}
          className="flex-1 min-w-0"
          autoComplete="email"
        />

        <Button
          type="submit"
          className="px-4 py-2 rounded-md shadow-sm transition-colors font-medium"
          disabled={email.length === 0 || mutation.isPending}
        >
          <span>Invit{mutation.isPending ? <span className="fade-in">ing...</span> : 'e'}</span>
        </Button>
      </form>
    </div>
  )
}
