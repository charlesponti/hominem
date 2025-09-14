import { useSupabaseAuth } from '@hominem/ui'
import { createContext, useContext, type ReactNode } from 'react'

interface UserContextValue {
  auth?: ReturnType<typeof useSupabaseAuth>
}

const UserContext = createContext<UserContextValue>({})

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const auth = useSupabaseAuth()

  return <UserContext.Provider value={{ auth }}>{children}</UserContext.Provider>
}

export const useUserContext = () => useContext(UserContext)
