import { useCallback, useState } from 'react'
import { useNavigate, useRouteLoaderData } from 'react-router'
import ListForm from '~/components/lists/list-form'
import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/components/ui/dialog'
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
        // Add query params directly to redirectTo URL (like notes app does)
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/lists/create')}`,
      },
    })
  }, [supabase.auth])

  return (
    <div className="flex flex-col gap-4 w-full">
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
            <DialogDescription>You need an account to create and manage lists.</DialogDescription>
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
