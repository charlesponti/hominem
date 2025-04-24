import Providers from '@/components/providers'
import { auth } from '@clerk/nextjs/server'
import { Gilda_Display, Montserrat } from 'next/font/google'
import { MainNavigation } from '../components/main-navigation'
import { RouteProgressBar } from '../components/route-progress-bar'
import './animations.css'
import './globals.css'

// Luxury serif font for headings
const gildaDisplay = Gilda_Display({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-gilda',
})

// Clean sans-serif for body text
const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
})

export const metadata = {
  title: 'Hominem',
  description: 'Sophisticated tools for managing life.',
  keywords: 'productivity, organization, luxury, tools, management',
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
    <html lang="en" className={`${gildaDisplay.variable} ${montserrat.variable}`}>
      <body className={montserrat.className}>
        <Providers>
          <RouteProgressBar />
          <div className="bg-background text-foreground min-h-screen min-w-full flex flex-col max-h-screen overflow-x-hidden">
            <MainNavigation />
            <main className="flex-1 overflow-y-auto md:pl-16 pt-14 md:pt-4">
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