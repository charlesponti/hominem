'use client'

import Alert from '@hominem/components/Alert'
import Button from '@hominem/components/Button'
import { type SyntheticEvent, useCallback, useState } from 'react'

import { useCreateBookmark } from 'src/lib/api/bookmarks'

type BookmarksFormProps = {
  onCreate: () => void
}
export default function BookmarksForm({ onCreate }: BookmarksFormProps) {
  const { mutateAsync, error, status } = useCreateBookmark()
  const [url, setUrl] = useState('')

  const onUrlChange = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    setUrl(e.currentTarget.value)
  }, [])

  const onFormSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault()
      await mutateAsync(url)
      setUrl('')
      onCreate()
    },
    [mutateAsync, onCreate, url]
  )

  return (
    <>
      {error && (
        <Alert type="error">There was an error creating the bookmark. Please try again.</Alert>
      )}

      <form onSubmit={onFormSubmit}>
        <div className="form-control w-full mb-2">
          <label className="label hidden" htmlFor="url">
            <span className="label-text">URL</span>
          </label>
          <input
            id="url"
            type="url"
            placeholder="Add bookmark url"
            className="input w-full text-lg p-2 border-stone-300 rounded placeholder:text-zinc-400"
            value={url}
            onChange={onUrlChange}
          />
        </div>
        {!!url.length && <Button isLoading={status === 'pending'}>Submit</Button>}
      </form>
    </>
  )
}
