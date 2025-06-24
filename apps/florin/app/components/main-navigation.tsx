import type { User as SupabaseUser } from '@supabase/supabase-js'
import { ChartLine, CircleDollarSignIcon, Landmark, Menu, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { cn } from '~/lib/utils'
import { RouteLink } from './route-link'
import { Button } from './ui/button'

const navItems = [
  {
    title: 'Finance',
    icon: CircleDollarSignIcon,
    url: '/finance',
  },
  {
    title: 'Analytics',
    icon: ChartLine,
    url: '/analytics',
  },
  {
    title: 'Accounts',
    icon: Landmark,
    url: '/accounts',
  },
]

export function MainNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { getUser, supabase } = useSupabaseAuth()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const isLoggedIn = !isLoading && user
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [animateExit, setAnimateExit] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 768)
      }

      // Initial check
      checkMobile()

      // Add event listener for window resize
      window.addEventListener('resize', checkMobile)

      // Cleanup
      return () => {
        window.removeEventListener('resize', checkMobile)
      }
    }

    return () => {}
  }, [])

  // Control body scroll when menu is open
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (menuOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.body.style.overflow = ''
      }
    }
  }, [menuOpen])

  const closeMenu = useCallback(() => {
    if (menuOpen) {
      setAnimateExit(true)
      setTimeout(() => {
        setMenuOpen(false)
        setAnimateExit(false)
      }, 400) // Match this with the animation duration
    }
  }, [menuOpen])

  // Close the menu when navigating to a new page
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    closeMenu()
  }, [pathname])

  // Close the menu when the Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    if (menuOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    // Cleanup function to remove the event listener
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen, closeMenu]) // Re-run effect if menuOpen or closeMenu changes

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu()
    } else {
      setMenuOpen(true)
    }
  }

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

  // Get user data on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [getUser])

  // Desktop navbar
  if (!isMobile) {
    return (
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex h-16 items-center px-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <RouteLink to="/" className="flex items-center space-x-2">
              <img
                src="/logo-florin.png"
                alt="Florin Logo"
                width={24}
                height={24}
                className="transition-opacity hover:opacity-80"
              />
              <span className="font-bold text-lg">Florin</span>
            </RouteLink>
          </div>

          {!isLoading && (
            <div className="flex flex-1 items-center justify-end">
              <nav className="flex items-center space-x-6">
                {isLoggedIn ? (
                  <>
                    {navItems.map((item) => (
                      <RouteLink
                        key={item.title}
                        to={item.url}
                        className={cn(
                          'text-sm font-medium transition-colors hover:text-gray-900',
                          pathname === item.url ? 'text-gray-900' : 'text-gray-600'
                        )}
                      >
                        {item.title}
                      </RouteLink>
                    ))}
                    <Link to="/account">
                      <Button variant="ghost" size="icon" className="rounded-full">
                        <User className="h-5 w-5" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Button onClick={handleSignIn} disabled={isSigningIn}>
                    {isSigningIn ? 'Signing in...' : 'Sign In'}
                  </Button>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>
    )
  }

  // Mobile navbar
  return (
    <>
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex h-16 items-center px-4">
          {/* Logo */}
          <RouteLink to="/" className="flex items-center space-x-2">
            <img
              src="/logo-florin.png"
              alt="Florin Logo"
              width={24}
              height={24}
              className="transition-opacity hover:opacity-80"
            />
            <span className="font-bold text-lg">Florin</span>
          </RouteLink>

          {/* Right Side */}
          <div className="flex flex-1 items-center justify-end space-x-2">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
              <Link to="/account">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={handleSignIn} disabled={isSigningIn}>
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </Button>
            )}

            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {menuOpen && isLoggedIn && (
        <div
          className={cn(
            'fixed inset-0 z-50 bg-background flex flex-col pt-16',
            animateExit ? 'menu-container-exit' : 'menu-container-enter'
          )}
        >
          <div className="p-6">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <RouteLink
                  key={item.title}
                  to={item.url}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center py-3 text-lg font-medium transition-colors',
                    pathname === item.url ? 'text-primary' : 'text-foreground hover:text-primary'
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.title}
                </RouteLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
