/**
 * ComposerTools
 *
 * Toolbar buttons. Receives stable refs directly and calls browser APIs
 * (showModal, click) inline — no callback props, no useCallback.
 * Subscribes to attachedNotesCount from the store — only re-renders when
 * the count changes, not on every draft keystroke.
 */

import { BookOpen, Camera, Plus } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

import { cn, isTouchDevice } from '../../lib/utils';
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
  notePickerDialogRef,
  presentation,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  notePickerDialogRef: React.RefObject<HTMLDialogElement | null>;
  presentation: ComposerPresentation;
}) {
  const attachedNotesCount = useComposerSlice((s) => s.attachedNotes.length);
  const [isTouchDeviceState, setIsTouchDeviceState] = useState(() => isTouchDevice());

  useEffect(() => {
    // Listen for viewport changes to update touch device state
    const mediaQuery = window.matchMedia('(max-width: 768px) and (any-hover: none)');
    const handleChange = () => {
      setIsTouchDeviceState(isTouchDevice());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

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
      {isTouchDeviceState && presentation.showsAttachmentButton && (
        <ToolButton
          icon={<Camera className="size-4" />}
          label="Take photo"
          onClick={() => cameraInputRef.current?.click()}
          active={false}
          disabled={false}
        />
      )}
    </div>
  );
});
