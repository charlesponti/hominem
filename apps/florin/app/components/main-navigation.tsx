import { SignInButton, useUser } from '@clerk/react-router'
import { CircleDollarSignIcon, Menu, PenTool, User, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
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
    title: 'Notes',
    icon: PenTool,
    url: '/notes',
  },
]

export function MainNavigation() {
  const location = useLocation()
  const pathname = location.pathname
  const { user, isLoaded } = useUser()
  const isLoggedIn = isLoaded && user
  const [isMobile, setIsMobile] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [animateExit, setAnimateExit] = useState(false)

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

  // Desktop sidebar
  if (!isMobile) {
    return (
      <header className="fixed left-0 top-0 h-screen flex flex-col w-14 md:w-16 border-r bg-background z-40">
        <div className="flex flex-col items-center py-6">
          <RouteLink to="/" className="mb-8">
            <img
              src="/logo-hominem-transparent.png"
              alt="Hominem Logo"
              width={24}
              height={24}
              className="transition-opacity hover:opacity-80"
            />
          </RouteLink>

          <nav className="flex flex-col items-center gap-8 mb-auto">
            {navItems.map((item) => (
              <RouteLink
                key={item.title}
                to={item.url}
                className={cn(
                  'flex items-center justify-center h-10 w-10 rounded-none transition-colors relative',
                  pathname === item.url
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {pathname === item.url && (
                  <span className="absolute -left-[1px] top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary" />
                )}
              </RouteLink>
            ))}
          </nav>

          <div className="mt-auto pt-6">
            {!isLoaded ? (
              <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
            ) : isLoggedIn ? (
              <RouteLink to="/account" aria-label="Account settings">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none text-muted-foreground hover:text-foreground"
                >
                  <User className="h-[18px] w-[18px]" />
                </Button>
              </RouteLink>
            ) : (
              <SignInButton>
                <Button variant="ghost" size="icon" className="rounded-none">
                  <User className="h-[18px] w-[18px]" />
                </Button>
              </SignInButton>
            )}
          </div>
        </div>
      </header>
    )
  }

  // Mobile top bar with full screen menu
  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-14 bg-background border-b flex items-center justify-between px-4 z-40">
        <RouteLink to="/" className="flex items-center">
          <img
            src="/logo-hominem-transparent.png"
            alt="Hominem Logo"
            width={24}
            height={24}
            className="transition-opacity hover:opacity-80"
          />
        </RouteLink>

        <div className="flex items-center gap-2">
          {!isLoaded ? (
            <div className="h-8 w-8 rounded-full animate-pulse bg-muted" />
          ) : isLoggedIn ? (
            <RouteLink to="/account" aria-label="Account settings">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                <User className="h-[18px] w-[18px]" />
              </Button>
            </RouteLink>
          ) : (
            <SignInButton>
              <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-[18px] w-[18px]" />
              </Button>
            </SignInButton>
          )}

          <Button variant="ghost" size="icon" className="ml-1" onClick={toggleMenu}>
            {menuOpen ? (
              <X className="h-5 w-5 transition-all duration-300 ease-out" />
            ) : (
              <Menu className="h-5 w-5 transition-all duration-300 ease-out" />
            )}
          </Button>
        </div>
      </header>

      {/* Full-screen Mobile Menu */}
      {menuOpen && (
        <div
          className={cn(
            'fixed inset-0 z-50 bg-background flex flex-col pt-14',
            animateExit ? 'menu-container-exit' : 'menu-container-enter'
          )}
        >
          <div className="relative w-full h-full overflow-auto p-6 flex flex-col">
            <h2 className="font-serif text-xl mb-8 opacity-0 animate-[menuSlideUp_0.4s_cubic-bezier(0.22,1,0.36,1)_0.1s_forwards]">
              Navigation
            </h2>

            <nav className="flex flex-col space-y-4 mb-8">
              {navItems.map((item, index) => (
                <RouteLink
                  key={item.title}
                  to={item.url}
                  onClick={closeMenu}
                  className={cn(
                    'flex items-center py-3 border-b border-muted transition-colors',
                    pathname === item.url
                      ? 'text-primary border-primary'
                      : 'text-foreground border-muted hover:text-primary'
                  )}
                  style={{
                    opacity: 0,
                    animation: `menuSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + index * 0.05}s forwards`,
                  }}
                >
                  <div className="w-10 flex items-center justify-center">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="ml-4 text-lg font-light">{item.title}</span>
                </RouteLink>
              ))}
            </nav>

            <div
              className="mt-auto opacity-0"
              style={{
                animation: 'menuSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.5s forwards',
              }}
            >
              <div className="border-t border-muted pt-4">
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Hominem. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
