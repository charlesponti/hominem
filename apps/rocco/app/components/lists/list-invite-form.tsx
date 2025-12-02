import { Mail } from 'lucide-react'
import { type SyntheticEvent, useCallback, useId, useState } from 'react'
import Alert from '~/components/alert'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

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
    onSuccess: (data) => {
      setEmail('')
      onCreate(data)
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
    [email, mutation.mutateAsync, listId]
  )

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <Mail className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Invite Someone</h2>
      </div>

      {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}

      <form className="space-y-4" onSubmit={onFormSubmit}>
        <div className="space-y-2">
          <label htmlFor={emailId} className="text-sm font-medium text-gray-900">
            Email address
          </label>
          <Input
            id={emailId}
            type="email"
            name="email"
            placeholder="colleague@example.com"
            value={email}
            onChange={onNameChange}
          />
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-700 text-white rounded-lg shadow-sm transition-colors font-medium"
            disabled={email.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? 'Sending invitation...' : 'Send Invitation'}
          </Button>
        </div>
      </form>
    </div>
  )
}
