import { PasskeyManagement, usePasskeyAuth } from '@hominem/ui'
import { useCallback } from 'react'
import { redirect } from 'react-router'
import { getAuthState } from '~/lib/auth.server'

export async function loader({ request }: { request: Request }) {
  const { isAuthenticated, headers } = await getAuthState(request)
  if (!isAuthenticated) {
    return redirect('/auth', { headers })
  }
  return null
}

export default function SecuritySettingsPage() {
  const { register } = usePasskeyAuth()
  const handleAdd = useCallback(() => register(), [register])

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage sign-in methods and authentication settings.
        </p>
      </div>
      <PasskeyManagement onAdd={handleAdd} />
    </div>
  )
}
