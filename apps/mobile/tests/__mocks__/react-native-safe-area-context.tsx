import React from 'react'

export function SafeAreaView({
  children,
  ...props
}: {
  children: React.ReactNode
  [key: string]: unknown
}) {
  return React.createElement('SafeAreaView', props, children)
}

export function useSafeAreaInsets() {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }
}
