import Providers from '@/components/providers'
import { auth } from '@clerk/nextjs/server'
import { MainNavigation } from '../components/main-navigation'
import './animations.css'
import './globals.css'

export const metadata = {
  title: 'hominem',
  description: 'manage life easier.',
  keywords: 'nextjs, react, example, keywords',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="bg-background text-foreground min-h-screen min-w-full flex flex-col max-h-screen overflow-x-hidden">
            <MainNavigation />
            <main className="flex-1 overflow-y-auto pt-4 pb-safe-area-inset-bottom">
              <div className="md:container md:mx-auto px-4 overflow-x-hidden">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
