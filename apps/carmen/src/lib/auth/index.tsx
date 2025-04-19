import { type UseMutationResult, useMutation, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { createContext, useContext, useEffect, useState } from 'react'
import api from 'src/lib/api'
import { queryClient } from '../api/base'
import type { User } from '../types'
import type { CurrentLocation } from './types'

type LocalStorageAuthState = {
  loginEmail: string
  expiryDate: Date | null
}

export interface AuthState {
  authState: LocalStorageAuthState | null
  currentLocation: CurrentLocation
  isPending: boolean
  setAuthState: (state: LocalStorageAuthState) => void
  updateAuth: () => void
  user?: User
  logout?: UseMutationResult<void, AxiosError, void, unknown>
  setCurrentLocation: (location: CurrentLocation) => void
}

const initialAuthState: AuthState = {
  authState: null,
  isPending: true,
  currentLocation: { latitude: 37.7749, longitude: -122.4194 }, // Default center (San Francisco)
  setAuthState: () => {},
  setCurrentLocation: () => {},
  updateAuth: () => {},
}

const LOCAL_STORAGE_KEY = 'rocco-auth'

export const AuthContext = createContext<AuthState>(initialAuthState)

export const AuthProvider = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState['authState'] | null>(() => {
    const storedAuthState = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (storedAuthState) {
      const parsedAuthState = JSON.parse(storedAuthState)

      if (!parsedAuthState) {
        return null
      }

      const expiryDate = parsedAuthState.expiryDate ? new Date(parsedAuthState.expiryDate) : null

      if (expiryDate && expiryDate.getTime() < Date.now()) {
        return null
      }

      return {
        loginEmail: parsedAuthState.loginEmail,
        expiryDate,
      }
    }
    return null
  })
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation>({
    latitude: 37.7749,
    longitude: -122.4194,
  })

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(authState))
  }, [authState])

  const {
    data: user,
    isPending,
    refetch: updateAuth,
  } = useQuery({
    queryKey: ['auth/me'],
    queryFn: async () => {
      const response = await api.get('/me')
      return response.data
    },
    retry: false,
  })

  const logout: AuthState['logout'] = useMutation({
    mutationFn: async () => {
      await api.post('/logout', {})
      queryClient.setQueryData(['auth/me'], null)
    },
  })

  return (
    <AuthContext.Provider
      value={{
        authState,
        currentLocation,
        isPending,
        logout,
        setAuthState,
        setCurrentLocation,
        user,
        updateAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a AuthProvider')
  }
  return context
}
