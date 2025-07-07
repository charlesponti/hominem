import { Outlet, useRouteLoaderData } from 'react-router'
import { useState, useEffect } from 'react'
import { Menu, User } from 'lucide-react'
import { Link as RouterLink } from 'react-router'
import { Button } from '~/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '~/components/ui/sheet'
import { AppSidebar } from '~/components/app-sidebar'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function Layout() {
  const rootData = useRouteLoaderData<{ supabaseUserId: string | null }>('root')
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const { supabase } = useSupabaseAuth()

  const userId = rootData?.supabaseUserId || undefined
  const isLoggedIn = !!userId

  // Check if mobile (less than 1200px)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 1200)
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen h-screen w-full bg-background text-foreground flex flex-col">
      {/* Mobile Header - only show on mobile */}
      {isMobile && (
        <header className="sticky top-0 z-50 bg-background border-b xl:hidden">
          <div className="flex h-16 items-center px-4">
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <AppSidebar
                  userId={userId}
                  isMobile={true}
                  onClose={() => setIsMobileSidebarOpen(false)}
                />
              </SheetContent>
            </Sheet>

            <RouterLink to="/" className="flex items-center space-x-2 ml-4">
              <span className="text-2xl">💬</span>
              <span className="font-bold text-lg">Chat</span>
            </RouterLink>

            <div className="flex flex-1 items-center justify-end">
              {isLoggedIn ? (
                <RouterLink to="/profile">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </RouterLink>
              ) : (
                <Button size="sm" onClick={handleSignIn} disabled={isSigningIn}>
                  {isSigningIn ? 'Signing in...' : 'Sign In'}
                </Button>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Main Layout */}
      <div className="flex flex-1 h-full">
        {/* Desktop Sidebar - always show on desktop */}
        {!isMobile && (
          <div className="w-80 flex-shrink-0 border-r">
            <AppSidebar userId={userId} isMobile={false} />
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
