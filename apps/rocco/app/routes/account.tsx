import { UserCircle } from 'lucide-react'
import { useCallback } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Alert from '~/components/alert'
import { LoadingScreen } from '~/components/loading'
import { Button } from '@hominem/ui/button'
import { trpc } from '~/lib/trpc/client'
import { requireAuth } from '~/routes/guards'
import type { Route } from './+types/account'

export async function loader(args: Route.LoaderArgs) {
  const authResult = await requireAuth(args)

  if (authResult instanceof Response) {
    return authResult
  }

  return { user: authResult.user }
}

function MemberSince({ createdAt }: { createdAt: string }) {
  const memberSince = new Date(createdAt)
  const timeDiff = Date.now() - memberSince.getTime()
  // Convert milliseconds to years
  const years = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365))
  const month = memberSince.getMonth()
  const year = `${memberSince.getFullYear() + years}`

  return `Member since ${month}/${year}`
}

function DeleteAccount() {
  const navigate = useNavigate()
  const { isError, mutate } = trpc.user.deleteAccount.useMutation({
    onSuccess: () => {
      return navigate('/login')
    },
  })

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      mutate()
    },
    [mutate]
  )

  return (
    <>
      {isError && (
        <Alert type="error">
          <span data-testid="delete-account-error">
            There was an error deleting your account. Please try again.
          </span>
        </Alert>
      )}

      <form onSubmit={onSubmit}>
        <Button
          data-testid="delete-account-form"
          className="px-4 py-2"
          type="submit"
          variant="destructive"
        >
          Delete account
        </Button>
      </form>
    </>
  )
}

export default function Account() {
  const loaderData = useLoaderData<typeof loader>()
  // Add a check to handle the case when loaderData might be undefined (in tests)
  const user = loaderData?.user

  // If no user is available, show a loading state
  if (!user) {
    return <LoadingScreen />
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <div className="border border-gray-200 rounded-lg shadow-md p-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {user.user_metadata.image ||
            user.user_metadata.picture ||
            user.user_metadata.avatar_url ? (
              <img
                src={
                  user.user_metadata.image ||
                  user.user_metadata.picture ||
                  user.user_metadata.avatar_url ||
                  ''
                }
                alt="user avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <UserCircle data-testid="user-circle-icon" size={64} />
            )}
            <div className="flex flex-col">
              <p className="text-lg font-medium">{user.user_metadata.name}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              <p className="text-sm text-gray-500">
                <MemberSince createdAt={user.created_at} />
              </p>
            </div>
          </div>
        </div>

        <DeleteAccount />
      </div>
    </div>
  )
}

export function ErrorBoundary({ error }: { error: unknown }) {
  console.error(error)
  return <Alert type="error">An unexpected error occurred.</Alert>
}

export function HydrateFallback() {
  return <LoadingScreen />
}
