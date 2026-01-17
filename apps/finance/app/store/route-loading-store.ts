import { create } from 'zustand'

interface RouteLoadingState {
  isRouteLoading: boolean
  setIsRouteLoading: (isLoading: boolean) => void
}

export const useRouteLoadingStore = create<RouteLoadingState>((set) => ({
  isRouteLoading: false,
  setIsRouteLoading: (isLoading) => set({ isRouteLoading: isLoading }),
}))
