import { useEffect } from 'react'
import { isMac } from '~/lib/utils/platform'

interface ChatKeyboardShortcutsOptions {
  onFocusInput?: () => void
  onScrollToTop?: () => void
  onScrollToBottom?: () => void
  onSearch?: () => void
  enabled?: boolean
}

const isInput = (target: HTMLElement) => {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
}

export function useChatKeyboardShortcuts({
  onFocusInput,
  onScrollToTop,
  onScrollToBottom,
  onSearch,
  enabled = true,
}: ChatKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input, textarea, or contenteditable
      const target = event.target as HTMLElement

      if (isInput(target)) {
        // Allow Escape to work even in inputs
        if (event.key === 'Escape') {
          target.blur()
        }
        return
      }

      const modifier = isMac() ? event.metaKey : event.ctrlKey
      const key = event.key.toLowerCase()

      event.preventDefault()

      // Cmd/Ctrl + K: Focus input
      if (modifier && key === 'k') {
        onFocusInput?.()
        return
      }

      // Cmd/Ctrl + /: Show shortcuts help
      if (modifier && key === '/') {
        // Could show a shortcuts modal here
        return
      }

      // Cmd/Ctrl + F: Search
      if (modifier && key === 'f') {
        onSearch?.()
        return
      }

      // Cmd/Ctrl + Arrow Up Scroll to top
      if (modifier && key === 'arrowup') {
        onScrollToTop?.()
        return
      }

      // Cmd/Ctrl + Arrow Down: Scroll to bottom
      if (modifier && key === 'arrowdown') {
        onScrollToBottom?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onFocusInput, onScrollToTop, onScrollToBottom, onSearch])
}
