import Providers from '@/components/providers'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { auth } from '@clerk/nextjs/server'
import { Menu } from 'lucide-react'
import { SiteNavigation } from '../components/app-navigation'
import './globals.css'

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
          <div className="bg-background text-foreground min-h-screen min-w-full flex max-h-screen">
            {userId ? <SiteNavigation /> : null}
            {/* Sidebar */}
            <div className="flex-1 flex flex-col">
              {userId ? (
                <SidebarTrigger className="md:hidden">
                  <div className="border border-gray-500 rounded-full">
                    <Menu size={24} />
                  </div>
                </SidebarTrigger>
              ) : null}
              <main className="h-full px-2">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
