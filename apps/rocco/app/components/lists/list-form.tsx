import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import { PlusCircle, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Loading from '~/components/loading'
import { useCreateList } from '~/lib/lists'
import type { List } from '~/lib/types'
import { cn } from '~/lib/utils'

interface ListFormProps {
  onCreate: (list: List) => void
  onCancel: () => void
  /** If provided, will be called when a save is attempted while unauthenticated */
  onRequireAuth?: () => void
  /** Authentication state from parent route; defaults to false */
  isAuthenticated?: boolean
}

type FormStatus = 'idle' | 'open' | 'submitting' | 'success'

export default function ListForm({
  onCreate,
  onCancel,
  onRequireAuth,
  isAuthenticated = false,
}: ListFormProps) {
  const STORAGE_KEY = useMemo(() => 'rocco:list-draft', [])
  const [name, setName] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { mutate: createList } = useCreateList({
    onSuccess: (newList) => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      setStatus('success')
      successTimerRef.current = setTimeout(() => {
        setName('')
        setStatus('idle')
        onCreate(newList)
      }, 1500)
    },
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string }
        if (parsed.name) {
          setName(parsed.name)
          setStatus('open')
        }
      }
    } catch {}
  }, [STORAGE_KEY])

  useEffect(() => {
    if (status === 'open' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [status])

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  const handleOpen = () => {
    setStatus('open')
  }

  const handleClose = () => {
    setName('')
    setStatus('idle')
    onCancel()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    if (!isAuthenticated) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim() }))
      } catch {}
      onRequireAuth?.()
      return
    }

    setStatus('submitting')
    createList({
      name: name.trim(),
      description: 'No description',
    })
  }

  const isOverlayVisible = status === 'submitting' || status === 'success'
  const showInput = status === 'open' || status === 'submitting' || status === 'success'

  return (
    <div className="flex gap-1">
      {showInput ? (
        <div className="relative w-full">
          <form onSubmit={handleSubmit} className="w-full">
            <div
              className={cn('transition-opacity duration-200', {
                'opacity-0 pointer-events-none': isOverlayVisible,
                'opacity-100': !isOverlayVisible,
              })}
            >
              <Input
                ref={inputRef}
                placeholder="Enter list name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleClose()
                  }
                }}
                required
                className="w-full"
              />
            </div>
          </form>

          {status === 'submitting' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
              <Loading size="sm" />
              <span className="ml-2 text-sm text-gray-600">Creating...</span>
            </div>
          ) : null}

          {status === 'success' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-lg">
              <span className="text-sm font-semibold text-green-700">Created!</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-1 justify-end">
        <Button
          type="button"
          onClick={
            status === 'open' || status === 'submitting' || status === 'success'
              ? handleClose
              : handleOpen
          }
          disabled={status === 'submitting'}
          className="flex items-center gap-2 disabled:bg-indigo-200"
        >
          {status === 'open' || status === 'submitting' || status === 'success' ? (
            <XCircle size={18} />
          ) : (
            <>
              <PlusCircle size={18} />
              <span>New List</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
