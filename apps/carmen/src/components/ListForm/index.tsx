import Alert from '@hominem/components/Alert'
import Input from '@hominem/components/Input'
import { useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { type SyntheticEvent, useCallback, useState } from 'react'

import Button from '@hominem/components/Button'
import { URLS, api } from 'src/lib/api/base'

const MIN_LENGTH = 3

type ListFormProps = {
  onCancel: () => void
  onCreate: () => void
}
export default function ListForm({ onCreate, onCancel }: ListFormProps) {
  const [name, setName] = useState('')
  const { error, mutate, status } = useMutation({
    mutationFn: async () => {
      await api.post(URLS.lists, { name })
    },
    onSuccess: () => {
      setName('')
      onCreate()
    },
  })

  const onCancelClick = useCallback(
    (e: SyntheticEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setName('')
      onCancel()
    },
    [onCancel]
  )

  const onSubmit = useCallback(
    (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      mutate()
    },
    [mutate]
  )

  const onNameChange = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    setName(e.currentTarget.value)
  }, [])

  return (
    <>
      {error && <Alert type="error">{(error as AxiosError).message}</Alert>}

      <form onSubmit={onSubmit}>
        <Input
          autoFocus
          name="listName"
          type="text"
          label="List name"
          onChange={onNameChange}
          value={name}
        />
        <div className="btn-group-horizontal float-right">
          <Button className="btn-outline px-12 bg-blue-100" onClick={onCancelClick}>
            Cancel
          </Button>
          <Button
            className="px-12"
            disabled={name.length < MIN_LENGTH}
            isLoading={status === 'pending'}
          >
            Submit
          </Button>
        </div>
      </form>
    </>
  )
}
