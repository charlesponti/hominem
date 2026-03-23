import { ArrowUp, CirclePlus, MessageSquare } from 'lucide-react'
import { memo, type ReactNode, type Ref } from 'react'

import { cn } from '~/lib/utils'

import { useComposerActions } from './composer-actions'
import type { ComposerPresentation } from './composer-presentation'
import { useComposerRefs } from './composer-provider'

interface ComposerActionButtonProps {
  buttonRef?: Ref<HTMLButtonElement>
  icon: ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  variant: 'primary' | 'secondary'
}

function ComposerActionButton({
  buttonRef,
  icon,
  label,
  onClick,
  disabled,
  variant,
}: ComposerActionButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      data-testid={isPrimary ? 'composer-primary' : 'composer-secondary'}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors',
        isPrimary ? 'size-[42px]' : 'size-[38px] border border-border bg-bg-surface text-foreground',
        isPrimary && (
          disabled
            ? 'cursor-not-allowed bg-bg-surface text-text-tertiary'
            : 'bg-foreground text-background hover:bg-foreground/85'
        ),
        !isPrimary && 'disabled:cursor-not-allowed disabled:opacity-40',
      )}
    >
      {icon}
    </button>
  )
}

export const ComposerActionsRow = memo(function ComposerActionsRow({
  primaryActionIcon,
  primaryActionLabel,
  secondaryActionIcon,
  secondaryActionLabel,
  posture,
  chatId,
  noteId,
}: {
  primaryActionIcon: 'circle-plus' | 'arrow-up'
  primaryActionLabel: string
  secondaryActionIcon: 'message-square' | 'circle-plus'
  secondaryActionLabel: string
  posture: ComposerPresentation['posture']
  chatId: string | null
  noteId: string | null
}) {
  const actions = useComposerActions({ posture, chatId, noteId })
  const { submitBtnRef } = useComposerRefs()

  return (
    <div className="flex items-center gap-2">
      <ComposerActionButton
        icon={
          secondaryActionIcon === 'circle-plus'
            ? <CirclePlus className="size-[18px]" />
            : <MessageSquare className="size-[18px]" />
        }
        label={secondaryActionLabel}
        onClick={() => void actions.secondary.execute()}
        disabled={!actions.canSubmit}
        variant="secondary"
      />
      <ComposerActionButton
        buttonRef={submitBtnRef}
        icon={
          primaryActionIcon === 'circle-plus'
            ? <CirclePlus className="size-[18px]" />
            : <ArrowUp className="size-[18px]" />
        }
        label={primaryActionLabel}
        onClick={() => void actions.primary.execute()}
        disabled={!actions.canSubmit}
        variant="primary"
      />
    </div>
  )
})
