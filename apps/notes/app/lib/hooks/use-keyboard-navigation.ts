import { useCallback, useEffect, useRef } from 'react'

interface UseKeyboardNavigationProps {
  onCopyAll?: () => void
  onGoBack?: () => void
  onCopySection?: (sectionName: string) => void
  sections?: string[]
  enabled?: boolean
}

export function useKeyboardNavigation({
  onCopyAll,
  onGoBack,
  onCopySection,
  sections = [],
  enabled = true,
}: UseKeyboardNavigationProps) {
  const lastFocusedElement = useRef<HTMLElement | null>(null)
  const skipLinksRef = useRef<HTMLDivElement>(null)

  // Store the last focused element for restoration
  const storeFocus = useCallback(() => {
    lastFocusedElement.current = document.activeElement as HTMLElement
  }, [])

  // Restore focus to the last focused element
  const restoreFocus = useCallback(() => {
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus()
      lastFocusedElement.current = null
    }
  }, [])

  // Jump to main content (skip navigation)
  const jumpToMainContent = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"], #main-content')
    if (mainContent instanceof HTMLElement) {
      mainContent.focus()
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Navigate between sections using headings
  const navigateToSection = useCallback((direction: 'next' | 'previous') => {
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')
    )
    const currentFocus = document.activeElement

    if (headings.length === 0) return

    let currentIndex = headings.findIndex(
      (heading) => heading === currentFocus || heading.contains(currentFocus)
    )

    if (currentIndex === -1) {
      // If no heading is focused, start from the first one
      currentIndex = direction === 'next' ? -1 : headings.length
    }

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % headings.length
        : currentIndex === 0
          ? headings.length - 1
          : currentIndex - 1

    const targetHeading = headings[nextIndex] as HTMLElement
    if (targetHeading) {
      targetHeading.setAttribute('tabindex', '-1')
      targetHeading.focus()
      targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Navigate between interactive elements
  const navigateToInteractiveElement = useCallback((direction: 'next' | 'previous') => {
    const interactiveElements = Array.from(
      document.querySelectorAll(
        'button, [role="button"], a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[]

    const currentFocus = document.activeElement
    let currentIndex = interactiveElements.indexOf(currentFocus)

    if (currentIndex === -1) {
      currentIndex = direction === 'next' ? -1 : interactiveElements.length
    }

    const nextIndex =
      direction === 'next'
        ? (currentIndex + 1) % interactiveElements.length
        : currentIndex === 0
          ? interactiveElements.length - 1
          : currentIndex - 1

    const targetElement = interactiveElements[nextIndex]
    if (targetElement) {
      targetElement.focus()
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when user is typing in an input, unless it's escape
      if (
        (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) &&
        event.key !== 'Escape'
      ) {
        return
      }

      // Skip links (Alt + S)
      if (event.altKey && event.key === 's') {
        event.preventDefault()
        jumpToMainContent()
        return
      }

      // Cmd+K or Ctrl+K - Copy all
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        onCopyAll?.()
        return
      }

      // Escape - Go back or clear focus
      if (event.key === 'Escape') {
        event.preventDefault()
        if (document.activeElement !== document.body) {
          // First escape clears focus
          ;(document.activeElement as HTMLElement)?.blur()
        } else {
          // Second escape goes back
          onGoBack?.()
        }
        return
      }

      // Number keys 1-9 for copying specific sections (Cmd/Ctrl + number)
      if (event.key >= '1' && event.key <= '9' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        const sectionIndex = Number.parseInt(event.key, 10) - 1
        if (sections[sectionIndex]) {
          onCopySection?.(sections[sectionIndex])
        }
        return
      }

      // Alt + H - Navigate between headings
      if (event.altKey && event.key === 'h') {
        event.preventDefault()
        navigateToSection(event.shiftKey ? 'previous' : 'next')
        return
      }

      // Alt + Arrow keys for button/interactive element navigation
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        const copyButtons = Array.from(
          document.querySelectorAll('[data-copy-button]')
        ) as HTMLElement[]

        if (copyButtons.length === 0) return

        const currentFocus = document.activeElement
        let currentIndex = copyButtons.indexOf(currentFocus)

        if (currentIndex === -1) {
          currentIndex = event.key === 'ArrowDown' ? -1 : copyButtons.length
        }

        const nextIndex =
          event.key === 'ArrowDown'
            ? (currentIndex + 1) % copyButtons.length
            : currentIndex === 0
              ? copyButtons.length - 1
              : currentIndex - 1

        const nextButton = copyButtons[nextIndex]
        if (nextButton) {
          nextButton.focus()
          nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }

      // Tab navigation enhancement (Ctrl + Tab for interactive elements)
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault()
        navigateToInteractiveElement(event.shiftKey ? 'previous' : 'next')
        return
      }
    },
    [
      enabled,
      onCopyAll,
      onGoBack,
      onCopySection,
      sections,
      jumpToMainContent,
      navigateToSection,
      navigateToInteractiveElement,
    ]
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  // Helper function to get keyboard shortcut text
  const getShortcutText = useCallback((action: string) => {
    const isMac =
      typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC')
    const cmdKey = isMac ? '⌘' : 'Ctrl'

    switch (action) {
      case 'copyAll':
        return `${cmdKey}+K`
      case 'goBack':
        return 'Esc'
      case 'navigateSections':
        return 'Alt+↑/↓'
      case 'navigateHeadings':
        return 'Alt+H'
      case 'skipToContent':
        return 'Alt+S'
      case 'navigateInteractive':
        return 'Ctrl+Tab'
      case 'copySection':
        return `${cmdKey}+1-9`
      default:
        return ''
    }
  }, [])

  return {
    getShortcutText,
    storeFocus,
    restoreFocus,
    jumpToMainContent,
    skipLinksRef,
  }
}
