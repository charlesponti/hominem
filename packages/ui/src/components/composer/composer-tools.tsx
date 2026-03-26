/**
 * ComposerTools
 *
 * Toolbar buttons. Receives stable refs directly and calls browser APIs
 * (showModal, click) inline — no callback props, no useCallback.
 * Subscribes to attachedNotesCount from the store — only re-renders when
 * the count changes, not on every draft keystroke.
 */

import { BookOpen, Camera, Mic, Plus } from 'lucide-react';
import { memo } from 'react';

import { cn } from '../../lib/utils';
import type { ComposerPresentation } from './composer-presentation';
import { useComposerSlice } from './composer-provider';

function ToolButton({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active || undefined}
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-md transition-colors',
        disabled && 'cursor-not-allowed opacity-40',
        active ? 'bg-foreground/8 text-foreground' : 'text-text-tertiary hover:text-foreground',
      )}
    >
      {icon}
    </button>
  );
}

export const ComposerTools = memo(function ComposerTools({
  fileInputRef,
  cameraInputRef,
  voiceDialogRef,
  notePickerDialogRef,
  presentation,
  showsVoiceButton,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  voiceDialogRef: React.RefObject<HTMLDialogElement | null>;
  notePickerDialogRef: React.RefObject<HTMLDialogElement | null>;
  presentation: ComposerPresentation;
  showsVoiceButton: boolean;
}) {
  const attachedNotesCount = useComposerSlice((s) => s.attachedNotes.length);

  return (
    <div className="flex items-center gap-1">
      {presentation.showsNotePicker && (
        <ToolButton
          icon={<BookOpen className="size-4" />}
          label="Attach notes as context"
          onClick={() => notePickerDialogRef.current?.showModal()}
          active={attachedNotesCount > 0}
          disabled={false}
        />
      )}
      {presentation.showsAttachmentButton && (
        <ToolButton
          icon={<Plus className="size-4" />}
          label="Add attachment"
          onClick={() => fileInputRef.current?.click()}
          active={false}
          disabled={false}
        />
      )}
      {presentation.showsAttachmentButton && (
        <ToolButton
          icon={<Camera className="size-4" />}
          label="Take photo"
          onClick={() => cameraInputRef.current?.click()}
          active={false}
          disabled={false}
        />
      )}
      {showsVoiceButton && (
        <ToolButton
          icon={<Mic className="size-4" />}
          label="Voice note"
          onClick={() => voiceDialogRef.current?.showModal()}
          active={false}
          disabled={false}
        />
      )}
    </div>
  );
});
