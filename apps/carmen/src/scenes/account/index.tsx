import Alert from '@hominem/components/Alert'
import Button from '@hominem/components/Button'
import { UserCircle } from 'lucide-react'

import { useAuth } from 'src/lib/auth'
import { withAuth } from 'src/lib/utils'

function useDeleteUserMutation() {
  return {
    mutateAsync: () => Promise.resolve({ error: Error }),
    error: null,
  }
}

function MemberSince({ createdAt }: { createdAt: string }) {
  const memberSince = new Date(createdAt)
  const timeDiff = new Date().getTime() - memberSince.getTime()
  // Convert milliseconds to years
  const years = Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365))
  const month = memberSince.getMonth()
  const year = `${memberSince.getFullYear() + years}`

  return `Member since ${month}/${year}`
}

function DeleteAccount({ onSucess }: { onSucess?: () => void }) {
  const { mutateAsync: deleteUser, error } = useDeleteUserMutation()

  const onDelectAccount = async () => {
    await deleteUser()
    onSucess?.()
  }

  return (
    <>
      {error && <Alert type="error">{error.message}</Alert>}

      <Button
        className="btn-ghost border-red-400 text-error min-h-fit h-fit px-4 py-2"
        onClick={onDelectAccount}
      >
        Delete account
      </Button>
    </>
  )
}

function Account() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col w-full">
      <div className="col-span-12">
        <h1 className="text-2xl font-semibold mb-4">Account</h1>
        <div className="card shadow-md md:max-w-sm">
          <div className="card-body bg-slate-100 rounded-lg bg-gradient-to-br from-[#d7e9ff] to-[#ff94b7]">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt="user avatar"
                className="rounded-circle img-fluid profile-picture mb-3 mb-md-0"
              />
            ) : (
              <UserCircle size={64} />
            )}
            <p className="text-lg text-right w-full px-1 h-fit">{user?.name}</p>
            <p className="text-sm text-black text-right w-full px-1 h-fit">{user?.email}</p>
            <p className="text-sm text-black text-right w-full px-1 h-fit">
              <MemberSince createdAt={user.createdAt} />
            </p>
          </div>
        </div>
        <div className="flex flex-col mb-8" />

        <DeleteAccount />
      </div>
    </div>
  )
}

export const Component = withAuth(Account)
