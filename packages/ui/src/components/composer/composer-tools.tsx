import { BookOpen, Camera, Mic, Plus, StopCircle } from 'lucide-react'
import { memo, type ReactNode } from 'react'

import { cn } from '../../lib/utils'

interface ComposerToolButtonProps {
  icon: ReactNode
  label: string
  onClick: (() => void) | undefined
  active: boolean
  disabled: boolean
}

function ComposerToolButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: ComposerToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        'flex size-[38px] shrink-0 items-center justify-center rounded-full border transition-colors',
        disabled && 'cursor-not-allowed opacity-40',
        active
          ? 'border-foreground/40 bg-bg-surface text-foreground'
          : 'border-border bg-bg-surface text-foreground',
      )}
    >
      {icon}
    </button>
  )
}

export const ComposerTools = memo(function ComposerTools({
  attachedNotesCount,
  isRecording,
  showsAttachmentButton,
  showsNotePicker,
  showsVoiceButton,
  onAttachmentClick,
  onCameraClick,
  onNotePickerClick,
  onVoiceClick,
}: {
  attachedNotesCount: number
  isRecording: boolean
  showsAttachmentButton: boolean
  showsNotePicker: boolean
  showsVoiceButton: boolean
  onAttachmentClick?: () => void
  onCameraClick?: () => void
  onNotePickerClick?: () => void
  onVoiceClick?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="sr-only" aria-live="polite" role="status">
        {isRecording ? 'Recording started' : 'Recording stopped'}
      </span>
      {showsNotePicker ? (
        <ComposerToolButton
          icon={<BookOpen className="size-[18px]" />}
          label="Attach notes as context"
          onClick={onNotePickerClick}
          active={attachedNotesCount > 0}
          disabled={!onNotePickerClick}
        />
      ) : null}
      {showsAttachmentButton ? (
        <ComposerToolButton
          icon={<Plus className="size-[18px]" />}
          label="Add attachment"
          onClick={onAttachmentClick}
          active={false}
          disabled={!onAttachmentClick}
        />
      ) : null}
      {showsAttachmentButton ? (
        <ComposerToolButton
          icon={<Camera className="size-[18px]" />}
          label="Take photo"
          onClick={onCameraClick}
          active={false}
          disabled={!onCameraClick}
        />
      ) : null}
      {showsVoiceButton ? (
        <ComposerToolButton
          icon={
            isRecording
              ? <StopCircle className="size-[18px] text-destructive" />
              : <Mic className="size-[18px]" />
          }
          label={isRecording ? 'Stop recording' : 'Voice note'}
          onClick={onVoiceClick}
          active={isRecording}
          disabled={!onVoiceClick}
        />
      ) : null}
    </div>
  )
})
