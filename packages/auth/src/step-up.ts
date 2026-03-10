import { redis } from '../../services/src/redis'

import type { StepUpAction } from './step-up-actions'

export { isStepUpAction, STEP_UP_ACTIONS } from './step-up-actions'
export type { StepUpAction } from './step-up-actions'

export const STEP_UP_TTL_SECONDS = 5 * 60

function getStepUpKey(userId: string, action: StepUpAction) {
  return `auth:stepup:${userId}:${action}`
}

export async function grantStepUp(userId: string, action: StepUpAction) {
  await redis.set(getStepUpKey(userId, action), '1', 'EX', STEP_UP_TTL_SECONDS)
}

export async function hasRecentStepUp(userId: string, action: StepUpAction) {
  return (await redis.get(getStepUpKey(userId, action))) === '1'
}

export function isFreshPasskeyAuth(input: {
  amr: string[] | undefined
  authTime: number | null | undefined
  nowMs?: number
}) {
  if (!input.amr?.includes('passkey')) {
    return false
  }

  if (!input.authTime) {
    return false
  }

  const nowSeconds = Math.floor((input.nowMs ?? Date.now()) / 1000)
  return nowSeconds - input.authTime <= STEP_UP_TTL_SECONDS
}
