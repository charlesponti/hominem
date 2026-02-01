import { Analytics, type TrackParams, type UserTraits } from '@segment/analytics-node';

export const APP_USER_ID = process.env.APP_USER_ID || 'app_user';

// instantiation
export const analytics = new Analytics({
  writeKey: process.env.SEGMENT_KEY || '',
});

type EventProperties = TrackParams['properties'];
export function identify(userId: string, traits: UserTraits) {
  analytics.identify({
    userId,
    traits,
  });
}

export function track(userId: string, event: string, properties: EventProperties) {
  analytics.track({
    userId,
    event,
    properties,
  });
}

export function page(userId: string, name: string, properties: EventProperties) {
  analytics.page({
    userId,
    name,
    properties,
  });
}

export function group(userId: string, groupId: string, traits: EventProperties) {
  analytics.group({
    userId,
    groupId,
    traits,
  });
}

export function alias(userId: string, previousId: string) {
  analytics.alias({
    userId,
    previousId,
  });
}

export const USER_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  REGISTER_SUCCESS: 'register_success',
  REGISTER_FAILURE: 'register_failure',
  EMAIL_TOKEN_SENT: 'email_token_sent',
  EMAIL_TOKEN_SENT_FAILURE: 'email_token_sent_failure',
  EMAIL_TOKEN_VALIDATED: 'email_token_validated',
  EMAIL_TOKEN_VALIDATED_FAILURE: 'email_token_validated_failure',
  EMAIL_TOKEN_VALIDATED_SUCCESS: 'email_token_validated_success',
};

export const EVENTS = {
  ...USER_EVENTS,
  LIST_CREATED: 'list_created',
  PLACE_ADDED: 'place_added',
};
