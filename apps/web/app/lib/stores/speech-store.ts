import { signal } from '@preact/signals-react';

const activeMessageId = signal<string | null>(null);

export const speechStore = {
  activeMessageId,
  activate(messageId: string) {
    activeMessageId.value = messageId;
  },
  deactivate(messageId: string) {
    if (activeMessageId.value === messageId) activeMessageId.value = null;
  },
};
