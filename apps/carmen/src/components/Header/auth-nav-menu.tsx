import { List, LogOut, Mail, Search, Settings, UserCircle } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AppLink from 'src/components/AppLink'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from 'src/components/ui/dropdown-menu'
import { useAuth } from 'src/lib/auth'
import { ACCOUNT, DASHBOARD, INVITES, LANDING, LISTS } from 'src/lib/routes'
import type { User } from 'src/lib/types'

const AuthNavMenu = ({ user }: { user: User }) => {
  const { logout } = useAuth()
  const navMenuRef = useRef(null)
  const navigate = useNavigate()
  const onLogoutClick = useCallback(async () => logout.mutateAsync(), [logout.mutateAsync])

  useEffect(() => {
    logout.status === 'success' && navigate(LANDING)
  }, [logout.status, navigate])

  return (
    <>
      <div className="flex-1 justify-end">
        <div className="hidden md:visible md:flex justify-end gap-6 mr-6">
          <AppLink to={DASHBOARD} className="px-4 py-2 rounded-xl">
            <Search />
          </AppLink>
          <AppLink to={LISTS} className="px-4 py-2 rounded-xl">
            <List />
          </AppLink>
          <AppLink to={INVITES} className="px-4 py-2 rounded-xl">
            <Mail />
          </AppLink>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            ref={navMenuRef}
            data-testid="auth-dropdown-button"
            className="btn bg-transparent border-black py-2 px-3"
          >
            <UserCircle />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            data-testid="dropdown-content"
            className="min-w-[200px] w-fit"
          >
            <div className="text-right bg-white text-sm text-gray-400 hover:outline-none pt-2 px-2 pb-3 w-full">
              {user.email}
            </div>
            <DropdownMenuItem>
              <Link to={LISTS} className="flex gap-4 py-2">
                <List size={20} />
                Lists
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={INVITES} className="flex gap-4 py-2">
                <Mail size={20} />
                Invites
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link to={ACCOUNT} className="flex gap-4 py-2">
                <Settings size={20} />
                Account
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <button type="button" className="btn-ghost flex gap-4 py-2" onClick={onLogoutClick}>
                <LogOut size={20} />
                Logout
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  )
}

export default AuthNavMenu
