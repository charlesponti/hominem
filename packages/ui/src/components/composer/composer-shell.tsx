import type { ReactNode, RefObject } from 'react'

import { cn } from '../../lib/utils'

export function ComposerShell({
  cardRef,
  isDraftMode,
  input,
  attachments,
  tools,
  actions,
}: {
  cardRef: RefObject<HTMLDivElement | null>
  isDraftMode: boolean
  input: ReactNode
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
          {input}

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
