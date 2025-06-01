import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { useAuth } from '@/lib/supabase/auth-hooks'
import { motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Link as RouterLink } from 'react-router'

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
              <RouterLink to="/auth" className="btn btn-sm btn-primary rounded-md px-4 shadow-md">
                Log in
              </RouterLink>
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
