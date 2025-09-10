import { useEffect, useMemo, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { useCreateList } from '~/lib/trpc/api'
import type { List } from '~/lib/types'
import { Label } from '../ui/label'

interface ListFormProps {
  onCreate: (list: List) => void
  onCancel: () => void
  /** If provided, will be called when a save is attempted while unauthenticated */
  onRequireAuth?: () => void
  /** Authentication state from parent route; defaults to false */
  isAuthenticated?: boolean
}

export default function ListForm({
  onCreate,
  onCancel,
  onRequireAuth,
  isAuthenticated = false,
}: ListFormProps) {
  const STORAGE_KEY = useMemo(() => 'rocco:list-draft', [])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { mutate: createList, isPending } = useCreateList({
    onSuccess: (newList) => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      onCreate(newList)
    },
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string; description?: string }
        if (parsed.name) setName(parsed.name)
        if (parsed.description) setDescription(parsed.description)
      }
    } catch {}
  }, [STORAGE_KEY])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    // If unauthenticated and form submitted via Enter, do nothing (modal only on click)
    if (!isAuthenticated) return
    createList({
      name: name.trim(),
      description: description.trim() || 'No description',
    })
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Create New List</h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <Label>List Name</Label>
          <Input
            placeholder="Enter list name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <Label>Description (optional)</Label>
          <Input
            placeholder="Enter description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </fieldset>
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={(e) => {
              if (!isAuthenticated) {
                e.preventDefault()
                try {
                  localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ name: name.trim(), description: description.trim() })
                  )
                } catch {}
                onRequireAuth?.()
              }
            }}
          >
            {isPending ? 'Creating...' : 'Create List'}
          </Button>
        </div>
      </form>
    </div>
  )
}
