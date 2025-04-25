import { useAuth } from '@clerk/react-router'
import { createContext, useContext, type ReactNode } from 'react'

interface UserContextValue {
  auth?: ReturnType<typeof useAuth>
}

const UserContext = createContext<UserContextValue>({})

interface UserProviderProps {
  children: ReactNode
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const auth = useAuth()

  return <UserContext.Provider value={{ auth }}>{children}</UserContext.Provider>
}

export const useUserContext = () => useContext(UserContext)
