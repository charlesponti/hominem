import { Globe2Icon, LogOut, MailIcon, MenuIcon, Settings, User as UserIcon } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { Link, useNavigate, useRevalidator, useRouteLoaderData } from 'react-router'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { createClient } from '~/lib/supabase/client'

const ACCOUNT = '/account'
const INVITES = '/invites'
const APP_NAME = 'rocco'

function Header() {
  const navigate = useNavigate()
  const supabase = createClient()
  const revalidator = useRevalidator()
  const { isAuthenticated } = useRouteLoaderData('routes/layout') as {
    isAuthenticated: boolean
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        revalidator.revalidate()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, revalidator])

  const onLogoutClick = useCallback(async () => {
    await supabase.auth.signOut()
    navigate('/')
  }, [supabase.auth, navigate])

  const NavigationMenu = () => (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="cursor-pointer px-4 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl"
        >
          <span className="flex items-center space-x-4">
            <UserIcon className="size-4" />
            <MenuIcon className="size-4" />
          </span>
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        sideOffset={8}
        avoidCollisions={true}
        side="bottom"
      >
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/explore" className="flex items-center space-x-2">
            <Globe2Icon className="size-4" />
            <span>Explore</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/about" className="flex items-center space-x-2">
            <MailIcon className="size-4" />
            <span>About</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/trips" className="flex items-center space-x-2">
            <MailIcon className="size-4" />
            <span>Trips</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to="/lists" className="flex items-center space-x-2">
            <MailIcon className="size-4" />
            <span>Lists</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to={INVITES} className="flex items-center space-x-2">
            <MailIcon className="size-4" />
            <span>Invites</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link to={ACCOUNT} className="flex items-center space-x-2">
            <Settings className="size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer flex items-center space-x-2"
          onClick={onLogoutClick}
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full shadow-sm bg-white"
      style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
    >
      <div className="w-full flex p-4 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Globe2Icon className="size-6" />
          <span className="font-bold">{APP_NAME}</span>
        </Link>
        <div className="flex items-center space-x-2">
          {isAuthenticated ? (
            <NavigationMenu />
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/about" className="text-gray-600 hover:text-gray-900">
                About
              </Link>
              <SignInButton />
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

const SignInButton = () => {
  const supabase = createClient()
  const onSignInClick = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }, [supabase.auth])

  return (
    <Button
      variant="outline"
      onClick={onSignInClick}
      className="flex cursor-pointer hover:bg-primary focus:bg-primary"
    >
      Sign In with Google
    </Button>
  )
}
