import { useCallback, useRef, useState } from 'react';

interface UseComposerDraftOptions {
  initialMessage?: string;
  onDraftChange?: (message: string) => void;
}

export function useComposerDraft({
  initialMessage = '',
  onDraftChange,
}: UseComposerDraftOptions = {}) {
  const [message, setMessageState] = useState(() => initialMessage);
  // Mirrors `message` so callbacks that fire later (e.g. voice transcription
  // finishing after the user kept typing) can read the latest draft via
  // getMessage() without depending on `message` and re-creating on every keystroke.
  const messageRef = useRef(initialMessage);

  const applyMessage = useCallback(
    (nextMessage: string) => {
      messageRef.current = nextMessage;
      setMessageState(nextMessage);
      onDraftChange?.(nextMessage);
    },
    [onDraftChange],
  );

  const setMessage = useCallback(
    (nextMessage: string) => applyMessage(nextMessage),
    [applyMessage],
  );

  const clearDraft = useCallback(() => applyMessage(''), [applyMessage]);

  return {
    getMessage: () => messageRef.current,
    message,
    setMessage,
    clearDraft,
  };
}
