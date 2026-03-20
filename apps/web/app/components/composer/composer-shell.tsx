import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'

import { cn } from '~/lib/utils'

export function ComposerShell({
  cardRef,
  draftText,
  inputRef,
  isDraftMode,
  isSubmitting,
  onDraftTextChange,
  onKeyDown,
  placeholder,
  attachments,
  tools,
  actions,
}: {
  cardRef: RefObject<HTMLDivElement | null>
  draftText: string
  inputRef: RefObject<HTMLTextAreaElement | null>
  isDraftMode: boolean
  isSubmitting: boolean
  onDraftTextChange: (value: string) => void
  onKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  placeholder: string
  attachments: ReactNode
  tools: ReactNode
  actions: ReactNode
}) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-0 left-0 right-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),10px)]',
      )}
    >
      <div className="mx-auto w-full max-w-[780px]">
        <div
          ref={cardRef}
          className={cn(
            'pointer-events-auto flex w-full flex-col gap-3 rounded-3xl border border-border bg-background px-4 pb-3 pt-4 [box-shadow:0_-8px_24px_rgba(15,23,42,0.06)]',
            isDraftMode && 'min-h-40',
          )}
        >
          <textarea
            ref={inputRef}
            data-testid="composer-input"
            value={draftText}
            onChange={(event) => onDraftTextChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            disabled={isSubmitting}
            className={cn(
              'w-full resize-none border-0 bg-transparent p-0 text-base leading-normal text-foreground outline-none field-sizing-content overflow-y-auto placeholder:text-text-tertiary focus:outline-none',
              !isDraftMode && 'max-h-48 min-h-6',
              isDraftMode && 'min-h-24 max-h-64',
            )}
            aria-label="Compose message or note"
          />

          {attachments}

          <div className="mt-auto flex shrink-0 items-center justify-between">
            {tools}
            {actions}
          </div>
        </div>
      </div>
    </div>
  )
}
