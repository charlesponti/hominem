import { LOG_MESSAGES, logger } from '@hominem/telemetry';

import OmiroIntents from '~/modules/omiro-intents';

type IntentName = 'AddNoteIntent' | 'StartChatIntent';

function donateIntent(name: IntentName): void {
  void OmiroIntents.donate(name).then(
    (donated) => {
      if (!donated && __DEV__)
        logger.warn(LOG_MESSAGES.INTENT_DONATION_FAILED, { intentName: name });
    },
    (error) => {
      if (__DEV__) logger.warn(LOG_MESSAGES.INTENT_DONATION_FAILED, { error, intentName: name });
    },
  );
}

/** Call when the user creates a new note manually. */
export function donateAddNoteIntent(): void {
  donateIntent('AddNoteIntent');
}
