import Providers from '@/components/providers'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { auth } from '@clerk/nextjs/server'
import { Menu } from 'lucide-react'
import { SiteNavigation } from '../components/app-navigation'
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
          <div className="bg-background text-foreground min-h-screen min-w-full flex max-h-screen overflow-x-hidden">
            <SiteNavigation />
            <div className="flex-1 flex flex-col">
              {userId ? (
                <SidebarTrigger className="md:hidden mt-2 ml-2">
                  <div className="border border-gray-500 rounded-full p-1">
                    <Menu size={20} />
                  </div>
                </SidebarTrigger>
              ) : null}
              <main className="h-full pb-safe-area-inset-bottom overflow-y-auto">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
