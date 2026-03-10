export interface SingleflightRef<T> {
  current: Promise<T> | null
}

export function runSingleflight<T>(
  ref: SingleflightRef<T>,
  factory: () => Promise<T>
) {
  if (ref.current) {
    return ref.current
  }

  const inFlight = factory().finally(() => {
    ref.current = null
  })

  ref.current = inFlight
  return inFlight
}
