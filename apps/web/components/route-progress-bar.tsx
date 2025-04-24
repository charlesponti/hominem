'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useRouteLoadingStore } from '../store/route-loading-store'
import { ProgressBar } from './progress-bar'

export function RouteProgressBar() {
  const isRouteLoading = useRouteLoadingStore((state) => state.isRouteLoading)
  const setIsRouteLoading = useRouteLoadingStore((state) => state.setIsRouteLoading)
  const pathname = usePathname()
  const [progress, setProgress] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isRouteLoading) {
      setProgress(20)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev))
      }, 300)
    } else if (progress > 0) {
      setProgress(100)
      setTimeout(() => {
        setProgress(0)
        if (timerRef.current) clearInterval(timerRef.current)
      }, 400)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRouteLoading, progress])

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    setProgress(100)
    setTimeout(() => {
      setProgress(0)
      setIsRouteLoading(false)
    }, 400)
  }, [pathname, setIsRouteLoading])

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] w-screen"
      style={{
        pointerEvents: 'none',
        marginLeft: 0,
        marginRight: 0,
        paddingLeft: 0,
        paddingRight: 0,
        width: '100vw',
        maxWidth: '100vw',
        transform: 'translateZ(0)',
      }}
      aria-hidden="true"
    >
      {(isRouteLoading || progress > 0) && <ProgressBar progress={progress} />}
    </div>
  )
}
