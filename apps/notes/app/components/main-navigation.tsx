import { Bot, Calendar, Lightbulb, Menu, Sparkles, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useUser } from '~/lib/hooks/use-user'
import { cn } from '~/lib/utils'
import { Button } from './ui/button'

const navItems = [
  {
    title: 'Animus',
    url: '/notes',
  },
  {
    title: 'AI Assistant',
    icon: Bot,
    url: '/chat',
  },
  {
    title: 'Content Strategy',
    icon: Lightbulb,
    url: '/content-strategy',
  },
  {
    title: 'Life Events',
    url: '/life-events',
  },
  {
    title: 'Goals',
    url: '/goals',
  },
  {
    title: 'Habits',
    url: '/habits',
  },
  {
    title: 'Calendar',
    icon: Calendar,
    url: '/calendar',
  },
]

export function MainNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { user, isLoading, isAuthenticated, signIn } = useUser()
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
  // biome-ignore lint/correctness/useExhaustiveDependencies: closeMenu is stable and only need to react to pathname changes
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
      await signIn()
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
            <Link to="/" className="flex items-center space-x-2">
              <span className="bg-purple-500 p-2 rounded-md">
                <Sparkles className="size-4 text-white" />
              </span>
              <span className="font-bold text-lg">Animus</span>
            </Link>
          </div>

          {!isLoading && (
            <div className="flex flex-1 items-center justify-end">
              <nav className="flex items-center space-x-6">
                {isAuthenticated ? (
                  <>
                    {navItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={cn(
                          'text-sm font-medium transition-colors hover:text-gray-900',
                          pathname === item.url ? 'text-gray-900' : 'text-gray-600'
                        )}
                      >
                        {item.title}
                      </Link>
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
          <Link to="/" className="flex items-center space-x-2">
            <span className="bg-purple-500 p-2 rounded-md">
              <Sparkles className="size-4 text-white" />
            </span>
            <span className="font-bold text-lg">Animus</span>
          </Link>

          {/* Right Side */}
          <div className="flex flex-1 items-center justify-end space-x-2">
            {isLoading ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isAuthenticated ? (
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
      {menuOpen && (
        <div
          className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-400 ${
            animateExit ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={closeMenu}
        >
          <div
            className={`fixed right-0 top-0 h-full w-80 bg-background shadow-xl transition-transform duration-400 ${
              animateExit ? 'translate-x-full' : 'translate-x-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center justify-between px-4 border-b">
              <span className="font-semibold">Menu</span>
              <Button variant="ghost" size="icon" onClick={closeMenu}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="p-4 space-y-2">
              {isAuthenticated ? (
                <>
                  {navItems.map((item) => (
                    <Link
                      key={item.title}
                      to={item.url}
                      className={cn(
                        'flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                        pathname === item.url
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                      onClick={closeMenu}
                    >
                      {item.icon && <item.icon className="h-4 w-4" />}
                      {item.title}
                    </Link>
                  ))}
                  <div className="pt-4 border-t">
                    <Link
                      to="/account"
                      className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                      onClick={closeMenu}
                    >
                      <User className="h-4 w-4" />
                      Account
                    </Link>
                  </div>
                </>
              ) : (
                <div className="pt-4">
                  <Button onClick={handleSignIn} disabled={isSigningIn} className="w-full">
                    {isSigningIn ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
