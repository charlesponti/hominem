import { Button } from '@hominem/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/components/ui/dialog'
import { useSupabaseAuth } from '@hominem/ui/supabase'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import ListForm from '~/components/lists/list-form'
import { useModal } from '~/hooks/useModal'
import type { List } from '~/lib/types'

export default function CreateListPage() {
  const navigate = useNavigate()
  const { isAuthenticated, supabase } = useSupabaseAuth()
  const { isOpen: isSignInOpen, open: openSignIn, close: closeSignIn } = useModal()

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
    openSignIn()
  }, [openSignIn])

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
      <div className="bg-white rounded-lg shadow-sm border border-border p-6">
        <ListForm
          onCreate={handleCreate}
          onCancel={handleCancel}
          // Gate saves behind auth for this page only
          onRequireAuth={handleRequireAuth}
          isAuthenticated={isAuthenticated}
        />
      </div>

      <Dialog open={isSignInOpen} onOpenChange={(open) => (open ? openSignIn() : closeSignIn())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save your list</DialogTitle>
            <DialogDescription>You need an account to create and manage lists.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-4">
            <Button onClick={onSignInWithGoogle} className="cursor-pointer w-full">
              Sign In
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
