import styled from '@emotion/styled'
import { Link, Navigate } from 'react-router-dom'

import { useAuth } from 'src/lib/auth'
import { DASHBOARD, LOGIN } from 'src/lib/routes'
import { mediaQueries } from 'src/lib/styles'

const Wrap = styled.div`
  position: relative;
  display: flex;
  justify-items: center;
  align-items: center;
  margin-bottom: 4rem;
  width: 100%;

  ${mediaQueries.belowMedium} {
    flex-direction: column;
  }

  ${mediaQueries.belowMedium} {
    max-width: calc(100% - 16px);
    margin: 0 auto;
  }
`

const LandingPage = () => {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={DASHBOARD} />
  }

  return (
    <Wrap>
      <div className="flex flex-col items-center justify-center w-full">
        <div className="flex items-center justify-center gap-2 text-black font-extrabold mb-8 py-[100px]w-full">
          <div className="flex flex-col justify-center">
            <p className="text-2xl text-slate-600" data-testid="home-header">
              For all the places you've been and will be.
            </p>
            <p className="text-xl text-slate-600">All in one place.</p>
          </div>
        </div>
        <div className="mt-2">
          <Link to={LOGIN} className="btn btn-primary text-white">
            Get Started
          </Link>
        </div>
      </div>
    </Wrap>
  )
}

export default LandingPage
