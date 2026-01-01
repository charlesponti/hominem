import { useSupabaseAuthContext } from '@hominem/auth'
import { Button } from '@hominem/ui/button'
import { Input } from '@hominem/ui/input'
import { Loading } from '@hominem/ui/loading'
import { PlusCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useCreateList } from '~/lib/lists'
import { cn } from '~/lib/utils'

type FormStatus = 'idle' | 'open' | 'submitting' | 'success'

const STORAGE_KEY = 'rocco:list-draft'

export default function ListForm() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { supabase, isAuthenticated } = useSupabaseAuthContext()

  const { mutate: createList } = useCreateList({
    onSuccess: () => {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {}
      setStatus('success')
      successTimerRef.current = setTimeout(() => {
        setName('')
        setStatus('idle')
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
  }, [])

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
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    setStatus('idle')
  }

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!name.trim()) { return }

      if (!isAuthenticated) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim() }))
        } catch {}

        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/lists')}`,
          },
        })

        return
      }

      setStatus('submitting')
      createList({
        name: name.trim(),
        description: 'No description',
      })
    },
    [name, isAuthenticated, supabase, createList]
  )

  const isOverlayVisible = status === 'submitting' || status === 'success'
  const showInput = status === 'open' || status === 'submitting' || status === 'success'
  const canSubmit = name.trim().length > 0 && status === 'open'

  return (
    <div className="flex gap-1">
      {showInput ? (
        <div className="relative w-full">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="flex gap-1">
              <div
                className={cn('transition-opacity duration-200 flex-1', {
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
              {status === 'open' && (
                <Button type="submit" disabled={!canSubmit} className="flex items-center gap-2">
                  Create
                </Button>
              )}
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
          onClick={status === 'idle' ? handleOpen : handleClose}
          disabled={status === 'submitting'}
          variant={status !== 'idle' ? 'secondary' : 'default'}
          className="flex items-center gap-2 disabled:bg-indigo-200"
        >
          {status !== 'idle' ? (
            <span> Cancel </span>
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
