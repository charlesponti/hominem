import { RedirectToSignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    return <RedirectToSignIn />
  }

  return <div className="w-full h-full flex flex-col">{children}</div>
}
