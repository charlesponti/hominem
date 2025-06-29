import { ConnectTwitterAccount } from '~/components/connect-twitter-account'
import { useTwitterOAuth } from '~/hooks/use-twitter'
import { useUser } from '~/lib/hooks/use-user'

export default function AccountPage() {
  const { signOut } = useUser()
  const { accounts } = useTwitterOAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Account Settings</h1>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="grid gap-6">
        <ConnectTwitterAccount />
        
        {accounts.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-medium text-green-800 mb-2">Connected Accounts</h3>
            <p className="text-green-700 text-sm">
              You have {accounts.length} Twitter account{accounts.length === 1 ? '' : 's'} connected.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
