import { ArrowLeft } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useNavigate, useRouteLoaderData } from 'react-router'
import ListForm from '~/components/lists-components/list-form'
import Modal from '~/components/modal'
import { Button } from '~/components/ui/button'
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
      // Navigate to the newly created list
      navigate(`/lists/${newList.id}`)
    },
    [navigate]
  )

  const handleCancel = useCallback(() => {
    // Navigate back to dashboard
    navigate('/dashboard')
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

      <Modal isOpen={isSignInOpen} onModalClose={() => setIsSignInOpen(false)}>
        <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm flex flex-col items-center justify-center gap-4 min-w-sm">
          <div className="flex flex-col items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">Save your list</h3>
            <p className="text-sm text-gray-600">You need an account to create and manage lists.</p>
          </div>
          <Button
            onClick={onSignInWithGoogle}
            className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer w-full"
          >
            Sign In
          </Button>
        </div>
      </Modal>
    </div>
  )
}
