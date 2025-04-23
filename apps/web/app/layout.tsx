import Providers from '@/components/providers'
import { auth } from '@clerk/nextjs/server'
import { MainNavigation } from '../components/main-navigation'
import './animations.css'
import './globals.css'

export const metadata = {
  title: 'hominem',
  description: 'manage life easier.',
  keywords: 'nextjs, react, example, keywords',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
            <main className="flex-1 overflow-y-auto pt-4">
              <div className="md:container md:mx-auto md:h-[calc(100dvh-85px)] px-4">
                {children}
              </div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
