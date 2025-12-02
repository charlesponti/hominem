import { ArrowLeft } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useRouteLoaderData } from 'react-router'
import ListForm from '~/components/lists/list-form'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { createClient } from '~/lib/supabase/client'
import type { List } from '~/lib/types'

export default function CreateListPage() {
  const navigate = useNavigate()
  const supabase = createClient()
  const layoutData = useRouteLoaderData('routes/layout') as { isAuthenticated: boolean } | undefined
  const isAuthenticated = layoutData?.isAuthenticated ?? false
  const [isSignInOpen, setIsSignInOpen] = useState(false)

  const handleCreate = useCallback(
    (newList: List) => {
      navigate(`/lists/${newList.id}`)
    },
    [navigate]
  )

  const handleCancel = useCallback(() => {
    navigate('/')
  }, [navigate])

  const handleRequireAuth = useCallback(() => {
    setIsSignInOpen(true)
  }, [])

  const onSignInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Return the user to this page to preserve context and restore draft
        redirectTo: `${window.location.origin}/auth/callback?next=/lists/create`,
      },
    })
  }, [supabase.auth])

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <ListForm
          onCreate={handleCreate}
          onCancel={handleCancel}
          // Gate saves behind auth for this page only
          onRequireAuth={handleRequireAuth}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <Dialog open={isSignInOpen} onOpenChange={setIsSignInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your list</DialogTitle>
            <DialogDescription>
              You need an account to create and manage lists.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button
              onClick={onSignInWithGoogle}
              className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer w-full"
            >
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
