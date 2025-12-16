import { Button } from '@hominem/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu'
import { Bot, Calendar, Lightbulb, LogOut, MenuIcon, Settings, Sparkles } from 'lucide-react'
import { useCallback } from 'react'
import { href, Link, useNavigate } from 'react-router'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

const APP_NAME = 'Animus'

const navItems = [
  {
    title: 'Animus',
    url: '/notes',
    icon: Sparkles,
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

const NavigationMenu = () => {
  const navigate = useNavigate()
  const { logout } = useSupabaseAuth()
  const onLogoutClick = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer px-2 text-primary focus-visible:ring-2 ring-primary focus-visible:ring-offset-0 rounded-md"
        >
          <MenuIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        sideOffset={8}
        avoidCollisions={true}
        side="bottom"
      >
        {navItems.map((item) => (
          <DropdownMenuItem key={item.title} asChild className="cursor-pointer py-2">
            <Link to={href(item.url)} className="flex items-center space-x-2">
              {item.icon && <item.icon className="size-4" />}
              <span>{item.title}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/account')} className="flex items-center space-x-2">
            <Settings className="size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer py-2 flex items-center space-x-2"
          onClick={onLogoutClick}
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Header() {
  const { isAuthenticated, isLoading } = useSupabaseAuth()

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50"
      style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
    >
      <div className="flex px-2 py-4 md:px-8 items-center justify-between">
        <Link to="/" className="flex items-center space-x-1">
          <span className="bg-primary p-2 rounded-md">
            <Sparkles className="size-4 text-primary-foreground" />
          </span>
          <span className="heading-2 text-primary">{APP_NAME}</span>
        </Link>
        {!isLoading && (
          <div className="flex items-center space-x-2">
            {isAuthenticated ? <NavigationMenu /> : <SignInButton />}
          </div>
        )}
      </div>
    </header>
  )
}

export default Header

const SignInButton = () => {
  const { supabase } = useSupabaseAuth()

  const onSignInClick = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
      },
    })
  }, [supabase.auth])

  return (
    <Button onClick={onSignInClick} className="flex cursor-pointer">
      Sign In with Google
    </Button>
  )
}
