import { afterEach, describe, expect, it } from 'vitest';

import { speechStore } from './speech-store';

afterEach(() => {
  speechStore.activeMessageId.value = null;
});

describe('speechStore', () => {
  it('keeps only one active message', () => {
    speechStore.activate('message-1');
    expect(speechStore.activeMessageId.value).toBe('message-1');

    speechStore.activate('message-2');
    expect(speechStore.activeMessageId.value).toBe('message-2');
  });

  it('only deactivates the current message', () => {
    speechStore.activate('message-1');
    speechStore.deactivate('message-2');
    expect(speechStore.activeMessageId.value).toBe('message-1');

    speechStore.deactivate('message-1');
    expect(speechStore.activeMessageId.value).toBeNull();
  });
});
