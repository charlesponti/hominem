import { Analytics, type TrackParams, type UserTraits } from '@segment/analytics-node'
export { default as EVENTS } from './events'

export const APP_USER_ID = process.env.APP_USER_ID || 'app_user'

// instantiation
export const analytics = new Analytics({
  writeKey: process.env.SEGMENT_KEY || '',
})

type EventProperties = TrackParams['properties']
export function identify(userId: string, traits: UserTraits) {
  analytics.identify({
    userId,
    traits,
  })
}

export function track(userId: string, event: string, properties: EventProperties) {
  analytics.track({
    userId,
    event,
    properties,
  })
}

export function page(userId: string, name: string, properties: EventProperties) {
  analytics.page({
    userId,
    name,
    properties,
  })
}

export function group(userId: string, groupId: string, traits: EventProperties) {
  analytics.group({
    userId,
    groupId,
    traits,
  })
}

export function alias(userId: string, previousId: string) {
  analytics.alias({
    userId,
    previousId,
  })
}
