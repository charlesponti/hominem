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

  return (
    <div className="h-lvh max-h-lvh overflow-scroll flex flex-col justify-center p-4">
      {children}
    </div>
  )
}
