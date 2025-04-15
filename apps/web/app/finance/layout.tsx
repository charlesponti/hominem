import { RedirectToSignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="min-h-screen w-full max-w-full">
      <div className="w-full max-w-full">
        <main className="w-full max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}
