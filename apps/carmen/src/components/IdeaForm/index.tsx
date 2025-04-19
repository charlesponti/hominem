import Alert from '@hominem/components/Alert'
import Button from '@hominem/components/Button'
import { type SyntheticEvent, useCallback, useState } from 'react'

import { useCreateIdea } from 'src/lib/api/ideas'

type IdeaFormProps = {
  onCreate: () => void
}
export default function IdeaForm({ onCreate }: IdeaFormProps) {
  const [description, setDescription] = useState('')
  const { error, isSuccess, mutateAsync: createIdea, status } = useCreateIdea()

  const onFormSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      await createIdea(description)

      if (isSuccess) {
        onCreate()
      }
    },
    [createIdea, isSuccess, description, onCreate]
  )

  const onDescriptionChange = useCallback((e: SyntheticEvent<HTMLTextAreaElement>) => {
    setDescription(e.currentTarget.value)
  }, [])

  return (
    <>
      {error && <Alert type="error">There was an error creating the idea. Please try again.</Alert>}

      <form onSubmit={onFormSubmit}>
        <div className="form-control w-full mb-2">
          <label className="label hidden" htmlFor="idea">
            <span className="label-text">Description</span>
          </label>
          <textarea
            id="idea"
            placeholder="What's happening?"
            className="textarea w-full text-lg p-2 border-stone-300 rounded placeholder:text-zinc-400"
            value={description}
            onChange={onDescriptionChange}
          />
        </div>
        {!!description.length && <Button isLoading={status === 'pending'}>Submit</Button>}
      </form>
    </>
  )
}
