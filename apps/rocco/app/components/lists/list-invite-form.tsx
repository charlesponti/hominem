import { type SyntheticEvent, useCallback, useId, useState } from 'react'
import Alert from '~/components/alert'
import Input from '~/components/input'
import { Button } from '~/components/ui/button'

import { trpc } from '~/lib/trpc/client'
import type { ListInvite } from '~/lib/types'
import styles from './list-invite-form.module.css'

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
    <div className="mb-4">
      {mutation.error && <Alert type="error">{mutation.error.message}</Alert>}
      <form className={styles.form} onSubmit={onFormSubmit}>
        <Input
          id={emailId}
          type="email"
          name="email"
          label="Email address"
          value={email}
          onChange={onNameChange}
        />

        <Button className="float-right mt-4" disabled={email.length === 0} variant="outline">
          {mutation.isPending ? 'Submitting...' : 'Submit'}
        </Button>
      </form>
    </div>
  )
}
