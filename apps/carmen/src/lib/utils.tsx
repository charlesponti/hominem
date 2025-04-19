import { LoadingScreen } from '@hominem/components/Loading'
import { type ClassValue, clsx } from 'clsx'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { twMerge } from 'tailwind-merge'
import { useAuth } from './auth'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function withAuth(Component: React.ComponentType) {
  return function AuthComponent(props: Record<string, unknown>) {
    const { isPending, user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
      if (!user) {
        navigate('/login')
      }
    }, [user, navigate])

    if (isPending) {
      return <LoadingScreen />
    }

    return <Component {...props} />
  }
}
