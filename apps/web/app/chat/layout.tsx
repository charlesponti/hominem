import { RedirectToSignIn } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  if (!userId) {
    return <RedirectToSignIn redirectUrl="/chat" />
  }

  return <div className="h-full overflow-hidden">{children}</div>
}
