import { RedirectToSignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="min-h-screen">
      <div className="flex">
        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  )
}
