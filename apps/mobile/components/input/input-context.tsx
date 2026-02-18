import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

type InputContextValue = {
  message: string
  setMessage: (value: string) => void
  isRecording: boolean
  setIsRecording: (value: boolean) => void
  mode: 'text' | 'voice'
  setMode: (value: 'text' | 'voice') => void
}

const InputContext = createContext<InputContextValue | null>(null)

export const useInputContext = () => {
  const ctx = useContext(InputContext)
  if (!ctx) throw new Error('useInputContext must be used within an InputProvider')
  return ctx
}

export const InputProvider = ({ children }: PropsWithChildren) => {
  const [message, setMessage] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [mode, setMode] = useState<'text' | 'voice'>('text')

  const value = useMemo(
    () => ({ message, setMessage, isRecording, setIsRecording, mode, setMode }),
    [message, isRecording, mode]
  )

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>
}
