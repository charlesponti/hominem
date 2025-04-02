import { useNavigate } from 'react-router'
import { useAuth } from '../../lib/supabase/auth-context'
import { AuthPage } from './auth-page'
import './auth.css'

export function AuthApp() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/profile')
    return null
  }

  return (
    <div className="container">
      <header>
        <h1 className="text-2xl">Profile</h1>
      </header>

      <main>
        <AuthPage />
      </main>
    </div>
  )
}
