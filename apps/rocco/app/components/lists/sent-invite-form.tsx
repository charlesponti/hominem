import { Alert } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import { Label } from '@hominem/ui/label'
import { type SyntheticEvent, useCallback, useId, useState } from 'react'
import { trpc } from '~/lib/trpc/client'
import type { SentInvite } from '~/lib/types'

type SentInviteFormProps = {
  listId: string
  onCreate: (invite: SentInvite) => void
}

export default function SentInviteForm({ listId, onCreate }: SentInviteFormProps) {
  const [email, setEmail] = useState('')
  const emailId = useId()

  const mutation = trpc.invites.create.useMutation({
    onSuccess: (invite) => {
      setEmail('')
      onCreate(invite as SentInvite)
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
