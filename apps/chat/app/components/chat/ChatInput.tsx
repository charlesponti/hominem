import type { ChatInputProps } from './types.js'

export function ChatInput({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  disabled,
  canSubmit,
  isOverLimit,
  characterCount,
  maxLength,
  textareaRef,
}: ChatInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (!e.shiftKey || e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (canSubmit) {
        onSubmit()
      }
    }
    onKeyDown(e)
  }

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything"
        disabled={disabled}
        className="w-full resize-none rounded-md px-3 py-2 text-sm sm:text-base focus-visible:outline-none bg-transparent min-h-[44px] max-h-[200px] touch-manipulation disabled:opacity-50"
        style={{
          height: 'auto',
          WebkitAppearance: 'none',
          fontSize: '16px',
        }}
        autoComplete="off"
        autoCorrect="on"
        autoCapitalize="sentences"
        spellCheck="true"
      />

      {/* Character counter */}
      {characterCount > maxLength * 0.8 && (
        <div
          className={`absolute bottom-1 right-2 text-xs ${
            isOverLimit ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {characterCount}/{maxLength}
        </div>
      )}
    </div>
  )
}
