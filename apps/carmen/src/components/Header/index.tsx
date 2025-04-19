import styled from '@emotion/styled'
import { Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from 'src/lib/auth'
import { APP_NAME } from 'src/lib/constants'
import { LANDING, LOGIN } from 'src/lib/routes'

import AuthNavMenu from './auth-nav-menu'

const StyledHeader = styled.header`
	& > * {
		min-height: 50px;
	}
`

function Header() {
  const { isPending, user } = useAuth()

  return (
    <StyledHeader className="navbar flex flex-row justify-between items-center pt-4 px-0">
      <Link
        to={LANDING}
        className="flex flex-1 gap-2 items-center font-extrabold lowercase text-4xl py-1"
      >
        <Globe className="animate-spin-slow mt-1 size-7 text-primary" />
        {APP_NAME}
      </Link>
      {!isPending && user ? (
        <AuthNavMenu user={user} />
      ) : (
        <Link data-testid="header-login-button" to={LOGIN} className="btn btn-primary text-white">
          Log In
        </Link>
      )}
    </StyledHeader>
  )
}

export default Header
