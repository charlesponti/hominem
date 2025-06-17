import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/supabase/auth-hooks'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Link as RouterLink } from 'react-router'

function GoogleLoginButton() {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      await signInWithGoogle()
    } catch (error) {
      console.error('Google login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className="btn btn-sm btn-primary rounded-md px-4 shadow-md flex items-center gap-2"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Google logo"
        role="img"
      >
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {isLoading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="sm"
      className="rounded-md"
      disabled={isLoading}
    >
      {isLoading ? 'Logging out...' : 'Logout'}
    </Button>
  )
}

export function Navbar() {
  const { user, isLoading } = useAuth()

  return (
    <motion.div
      className="sticky top-0 z-50 backdrop-blur-xl bg-base-200/70 border-b border-white/10 shadow-lg"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="container mx-auto navbar py-3">
        <div className="navbar-start">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <nav className="flex flex-col gap-2">
                <motion.div
                  className="w-full"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <RouterLink to="/" className="block px-4 py-2 text-sm hover:bg-accent rounded-md">
                    Home
                  </RouterLink>
                </motion.div>

                <motion.div
                  className="w-full"
                  whileHover={{ x: 5 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <RouterLink
                    to="/chat"
                    className="block px-4 py-2 text-sm hover:bg-accent rounded-md"
                  >
                    Chat
                  </RouterLink>
                </motion.div>

                {!isLoading && (
                  <div className="mt-4 pt-4 border-t">
                    {!user ? (
                      <GoogleLoginButton />
                    ) : (
                      <div className="space-y-3">
                        <div className="px-4 py-2">
                          <p className="text-sm text-muted-foreground">Signed in as:</p>
                          <p className="text-sm font-medium">{user.email}</p>
                        </div>
                        <LogoutButton />
                      </div>
                    )}
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <RouterLink to="/" className="flex items-center gap-2 group">
            <motion.div
              className="w-9 h-9 bg-gradient-to-bl from-primary to-red-500 rounded-lg grid place-items-center text-white font-bold text-lg shadow-md"
              whileHover={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5 }}
            >
              S
            </motion.div>
            <motion.span
              className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-red-500 hidden sm:inline-block"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              Scratchpad
            </motion.span>
          </RouterLink>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1 flex items-center gap-2">
            <motion.li whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
              <RouterLink to="/" className="font-medium rounded-full hover:bg-primary/10">
                Home
              </RouterLink>
            </motion.li>

            <motion.li whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 400 }}>
              <RouterLink to="/chat" className="font-medium rounded-full hover:bg-primary/10">
                Chat
              </RouterLink>
            </motion.li>
          </ul>
        </div>

        <div className="navbar-end flex gap-2">
          {!isLoading && !user ? (
            <motion.div
              className="hidden md:flex"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <GoogleLoginButton />
            </motion.div>
          ) : user ? (
            <motion.div
              className="hidden md:flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <LogoutButton />
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
