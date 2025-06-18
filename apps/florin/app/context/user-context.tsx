import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '~/lib/supabase'

interface UserContextValue {
  auth: ReturnType<typeof useAuth>
}

const UserContext = createContext<UserContextValue | null>(null)

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const auth = useAuth()

  return <UserContext.Provider value={{ auth }}>{children}</UserContext.Provider>
}

export const useUserContext = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider')
  }
  return context
}
