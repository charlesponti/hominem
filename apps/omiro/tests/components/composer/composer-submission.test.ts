import { describe, expect, it } from 'vitest';

import { getComposerSubmissionConfig } from '~/components/composer/composerSubmission.helpers';

describe('composer submission config', () => {
  it('configures inbox note capture as the primary action with chat as secondary', () => {
    expect(getComposerSubmissionConfig({ mode: 'inbox', entryMode: 'note' })).toMatchObject({
      inputTestID: 'inbox-composer-input',
      isChatEntryMode: false,
      primarySubmitKind: 'note',
      secondarySubmitKind: 'start-chat',
      shellTestID: 'inbox-composer',
    });
  });

  it('configures inbox chat entry with note as the secondary action', () => {
    expect(getComposerSubmissionConfig({ mode: 'inbox', entryMode: 'chat' })).toMatchObject({
      inputTestID: 'inbox-composer-input',
      isChatEntryMode: true,
      primarySubmitKind: 'start-chat',
      secondarySubmitKind: 'note',
      shellTestID: 'inbox-composer',
    });
  });

  it('configures chat detail for message submission', () => {
    expect(
      getComposerSubmissionConfig({ mode: 'chat', chatId: 'chat-1', testID: 'custom-chat' }),
    ).toMatchObject({
      inputTestID: 'chat-composer-input',
      isChatMode: true,
      primarySubmitKind: 'message',
      secondarySubmitKind: undefined,
      shellTestID: 'custom-chat',
    });
  });
});
