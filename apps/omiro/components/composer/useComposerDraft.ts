import { useCallback, useState } from 'react';

import { createComposerMessageStore, type ComposerMessageStore } from './useComposerMessageStore';

interface UseComposerDraftOptions {
  initialMessage?: string;
  onDraftChange?: (message: string) => void;
}

// The draft lives in an external store (not React state) so that typing
// doesn't re-render every component holding a `useComposerController` result --
// only whichever leaf component subscribes to the store re-renders per
// keystroke. See useComposerMessageStore.ts and ComposerActiveArea.tsx.
export function useComposerDraft({
  initialMessage = '',
  onDraftChange,
}: UseComposerDraftOptions = {}) {
  const [store] = useState<ComposerMessageStore>(() => createComposerMessageStore(initialMessage));

  const setMessage = useCallback(
    (nextMessage: string) => {
      store.setMessage(nextMessage);
      onDraftChange?.(nextMessage);
    },
    [store, onDraftChange],
  );

  const clearDraft = useCallback(() => setMessage(''), [setMessage]);

  return {
    store,
    getMessage: store.getMessage,
    setMessage,
    clearDraft,
  };
}
