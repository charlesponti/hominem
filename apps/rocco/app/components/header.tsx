import { useSupabaseAuth } from '@hominem/ui'
import { Button } from '@hominem/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu'
import {
  Globe2Icon,
  Info,
  List,
  LogOut,
  MapPin,
  MenuIcon,
  Settings,
  User as UserIcon,
  UserPlus,
} from 'lucide-react'
import { useCallback } from 'react'
import { Link, useNavigate } from 'react-router'

const ACCOUNT = '/account'
const INVITES = '/invites'
const APP_NAME = 'rocco'

interface NavigationMenuProps {
  onLogoutClick: () => void
}

const NavigationMenu = ({ onLogoutClick }: NavigationMenuProps) => (
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
        <Link to="/" className="flex items-center space-x-2">
          <Globe2Icon className="size-4" />
          <span>Explore</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer">
        <Link to="/about" className="flex items-center space-x-2">
          <Info className="size-4" />
          <span>About</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer">
        <Link to="/trips" className="flex items-center space-x-2">
          <MapPin className="size-4" />
          <span>Trips</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer">
        <Link to="/lists" className="flex items-center space-x-2">
          <List className="size-4" />
          <span>Lists</span>
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild className="cursor-pointer">
        <Link to={INVITES} className="flex items-center space-x-2">
          <UserPlus className="size-4" />
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

function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, logout } = useSupabaseAuth()

  const onLogoutClick = useCallback(async () => {
    await logout()
    navigate('/')
  }, [logout, navigate])

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full"
      style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
    >
      <div className="flex px-2 py-4 md:px-8 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Globe2Icon className="size-6" />
          <span className="font-bold">{APP_NAME}</span>
        </Link>
        <div className="flex items-center space-x-2">
          {isAuthenticated ? <NavigationMenu onLogoutClick={onLogoutClick} /> : <SignInButton />}
        </div>
      </div>
    </header>
  )
}

export default Header

const SignInButton = () => {
  const { signInWithGoogle } = useSupabaseAuth()

  const onSignInClick = useCallback(async () => {
    await signInWithGoogle({ redirectToPath: '/' })
  }, [signInWithGoogle])

  return (
    <Button onClick={onSignInClick} className="flex cursor-pointer">
      Sign In with Google
    </Button>
  )
}
