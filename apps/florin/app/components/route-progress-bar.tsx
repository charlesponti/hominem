'use client'

import { useEffect, useRef, useState } from 'react'
import { useNavigation } from 'react-router'
import { cn } from '~/lib/utils'
import { useRouteLoadingStore } from '../store/route-loading-store'
import { ProgressBar } from './progress-bar'

export function RouteProgressBar() {
  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'
  const isLoading = useRouteLoadingStore((state) => state.isRouteLoading)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleComplete = () => {
      // Set progress to 100% to complete the animation
      setProgress(100)

      // After a short delay, hide the progress bar
      const timeout = setTimeout(() => {
        setVisible(false)
        setProgress(0)
        useRouteLoadingStore.getState().setIsRouteLoading(false)
      }, 200)

      return () => clearTimeout(timeout)
    }

    if (isLoading || isNavigating) {
      // Clear any existing timer
      if (timer.current) clearTimeout(timer.current)

      // Show the progress bar
      setVisible(true)

      // Start at 0
      setProgress(0)

      // Animate to 80% over time
      timer.current = setTimeout(() => {
        setProgress(80)
      }, 50)
    } else if (visible) {
      handleComplete()
    }

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [isLoading, isNavigating, visible])

  return <ProgressBar className={cn({ visible })} progress={progress} />
}
