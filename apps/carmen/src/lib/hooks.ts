import { useCallback, useEffect, useRef } from 'react'

export const useMountedState = () => {
  const isMountedRef = useRef<boolean>(false)
  const isMounted = useCallback(() => isMountedRef.current, [])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  return isMounted
}
