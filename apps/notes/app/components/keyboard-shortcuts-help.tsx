import { Keyboard, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface KeyboardShortcut {
  keys: string
  description: string
  category: string
}

const shortcuts: KeyboardShortcut[] = [
  { keys: '⌘/Ctrl + K', description: 'Copy entire strategy', category: 'Copy Actions' },
  {
    keys: '⌘/Ctrl + 1-9',
    description: 'Copy specific section (by number)',
    category: 'Copy Actions',
  },
  { keys: 'Esc', description: 'Go back or clear focus', category: 'Navigation' },
  { keys: 'Alt + S', description: 'Skip to main content', category: 'Navigation' },
  { keys: 'Alt + H', description: 'Navigate between section headings', category: 'Navigation' },
  { keys: 'Shift + Alt + H', description: 'Navigate to previous heading', category: 'Navigation' },
  { keys: 'Alt + ↑/↓', description: 'Navigate between copy buttons', category: 'Navigation' },
  {
    keys: 'Ctrl + Tab',
    description: 'Navigate between interactive elements',
    category: 'Navigation',
  },
  {
    keys: 'Shift + Ctrl + Tab',
    description: 'Navigate to previous interactive element',
    category: 'Navigation',
  },
  { keys: '?', description: 'Show/hide this help dialog', category: 'Help' },
]

interface KeyboardShortcutsHelpProps {
  className?: string
}

export function KeyboardShortcutsHelp({ className = '' }: KeyboardShortcutsHelpProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (
        event.key === '?' &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement
        // Don't trigger if user is typing in an input
        if (
          target.tagName !== 'INPUT' &&
          target.tagName !== 'TEXTAREA' &&
          !target.isContentEditable
        ) {
          event.preventDefault()
          setIsOpen((prev) => !prev)
        }
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault()
        setIsOpen(false)
      }
    },
    [isOpen]
  )

  // Add global key listener for ? key
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = []
      }
      acc[shortcut.category].push(shortcut)
      return acc
    },
    {} as Record<string, KeyboardShortcut[]>
  )

  return (
    <>
      {/* Help Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className={`fixed bottom-4 right-4 z-40 ${className}`}
        aria-label="Show keyboard shortcuts help"
        title="Keyboard shortcuts (Press ? for quick access)"
      >
        <Keyboard className="w-4 h-4 mr-2" />
        Help
      </Button>

      {/* Help Modal */}
      {isOpen && (
        <dialog
          open
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false)
            }
          }}
          onKeyUp={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false)
            }
          }}
        >
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle id="shortcuts-title" className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Keyboard Shortcuts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close help dialog"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg mb-3 text-gray-900">{category}</h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut) => (
                        <div
                          key={`${shortcut.keys}-${shortcut.description}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                        >
                          <span className="text-gray-700">{shortcut.description}</span>
                          <code className="px-2 py-1 bg-white border rounded text-sm font-mono text-gray-800 shadow-sm">
                            {shortcut.keys}
                          </code>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="pt-4 border-t text-sm text-gray-600">
                  <p className="mb-2">
                    <strong>Tip:</strong> Most shortcuts work from anywhere on the page.
                  </p>
                  <p>
                    <strong>Navigation:</strong> Use Tab to move between interactive elements, or
                    use the enhanced navigation shortcuts for faster movement.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </dialog>
      )}
    </>
  )
}
