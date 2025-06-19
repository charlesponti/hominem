import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Menu, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router'
import { useAuth } from '~/lib/supabase/auth-context'

const navItems = [
  {
    title: 'Chat',
    url: '/chat',
  },
]

export function MainNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { user, isLoading, signInWithGoogle } = useAuth()
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
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in failed:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  // Desktop navbar
  if (!isMobile) {
    return (
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="flex h-16 items-center px-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <RouterLink to="/" className="flex items-center space-x-2">
              <span className="text-2xl">💬</span>
              <span className="font-bold text-lg">Chat</span>
            </RouterLink>
          </div>

          {/* Center Navigation */}
          {isLoggedIn && (
            <div className="flex flex-1 items-center justify-center">
              <nav className="flex items-center space-x-6">
                {navItems.map((item) => (
                  <RouterLink
                    key={item.title}
                    to={item.url}
                    className={cn(
                      'text-sm font-medium transition-colors hover:text-gray-900',
                      pathname === item.url ? 'text-gray-900' : 'text-gray-600'
                    )}
                  >
                    {item.title}
                  </RouterLink>
                ))}
              </nav>
            </div>
          )}

          {/* Right Side Auth */}
          <div className="flex flex-1 items-center justify-end">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
              <RouterLink to="/profile">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </RouterLink>
            ) : (
              <Button onClick={handleSignIn} disabled={isSigningIn}>
                {isSigningIn ? 'Signing in...' : 'Sign In'}
              </Button>
            )}
          </div>
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
          <RouterLink to="/" className="flex items-center space-x-2">
            <span className="text-2xl">💬</span>
            <span className="font-bold text-lg">Chat</span>
          </RouterLink>

          {/* Right Side */}
          <div className="flex flex-1 items-center justify-end space-x-2">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
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
                <RouterLink
                  key={item.title}
                  to={item.url}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center py-3 text-lg font-medium transition-colors',
                    pathname === item.url ? 'text-primary' : 'text-foreground hover:text-primary'
                  )}
                >
                  {item.title}
                </RouterLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
