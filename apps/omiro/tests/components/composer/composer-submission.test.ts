import { describe, expect, it } from 'vitest';

import { getComposerSubmissionConfig } from '~/components/composer/composerSubmission.helpers';

describe('composer submission config', () => {
  it('configures inbox note capture as the primary action with chat as secondary', () => {
    expect(getComposerSubmissionConfig({ mode: 'inbox', entryMode: 'note' })).toMatchObject({
      inputTestID: 'inbox-composer-input',
      primarySubmitKind: 'note',
      submitTestID: 'composer-submit-note',
      secondaryAction: {
        kind: 'start-chat',
        testID: 'composer-start-chat',
      },
      shellTestID: 'inbox-composer',
    });
  });

  it('configures inbox chat entry with note as the secondary action', () => {
    expect(getComposerSubmissionConfig({ mode: 'inbox', entryMode: 'chat' })).toMatchObject({
      inputTestID: 'inbox-composer-input',
      primarySubmitKind: 'start-chat',
      submitTestID: 'composer-submit-chat',
      secondaryAction: {
        kind: 'note',
        testID: 'composer-save-note',
      },
      shellTestID: 'inbox-composer',
    });
  });

  it('configures chat detail for message submission', () => {
    expect(
      getComposerSubmissionConfig({
        mode: 'chat',
        chatId: 'chat-1',
        testID: 'custom-chat',
        chatSend: { sendChatMessage: async () => {}, isChatSending: false },
      }),
    ).toMatchObject({
      inputTestID: 'chat-composer-input',
      isChatMode: true,
      primarySubmitKind: 'message',
      submitTestID: 'composer-submit-message',
      secondaryAction: undefined,
      shellTestID: 'custom-chat',
    });
  });
});
