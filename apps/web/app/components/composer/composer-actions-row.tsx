import { ArrowUp, CirclePlus, MessageSquare } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '~/lib/utils'

interface ComposerActionButtonProps {
  icon: ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  variant: 'primary' | 'secondary'
}

function ComposerActionButton({
  icon,
  label,
  onClick,
  disabled,
  variant,
}: ComposerActionButtonProps) {
  const isPrimary = variant === 'primary'

  return (
    <button
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

export function ComposerActionsRow({
  primaryActionIcon,
  primaryActionLabel,
  onPrimaryClick,
  secondaryActionIcon,
  secondaryActionLabel,
  onSecondaryClick,
  disabled = false,
}: {
  primaryActionIcon: 'circle-plus' | 'arrow-up'
  primaryActionLabel: string
  onPrimaryClick: () => void
  secondaryActionIcon: 'message-square' | 'circle-plus'
  secondaryActionLabel: string
  onSecondaryClick: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <ComposerActionButton
        icon={
          secondaryActionIcon === 'circle-plus'
            ? <CirclePlus className="size-[18px]" />
            : <MessageSquare className="size-[18px]" />
        }
        label={secondaryActionLabel}
        onClick={onSecondaryClick}
        disabled={disabled}
        variant="secondary"
      />
      <ComposerActionButton
        icon={
          primaryActionIcon === 'circle-plus'
            ? <CirclePlus className="size-[18px]" />
            : <ArrowUp className="size-[18px]" />
        }
        label={primaryActionLabel}
        onClick={onPrimaryClick}
        disabled={disabled}
        variant="primary"
      />
    </div>
  )
}
