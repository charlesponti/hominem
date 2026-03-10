import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STEP_UP_ACTIONS } from './step-up-actions'
import {
  STEP_UP_TTL_SECONDS,
  configureStepUpStore,
  grantStepUp,
  hasRecentStepUp,
  isFreshPasskeyAuth,
} from './step-up'

const redisState = vi.hoisted(() => new Map<string, string>())

describe('step-up helpers', () => {
  beforeEach(() => {
    redisState.clear()
    configureStepUpStore({
      set: vi.fn(async (key: string, value: string) => {
        redisState.set(key, value)
        return 'OK'
      }),
      get: vi.fn(async (key: string) => redisState.get(key) ?? null),
    })
  })

  it('stores and reads recent action-bound step-up proofs', async () => {
    const userId = 'user-1'

    expect(await hasRecentStepUp(userId, STEP_UP_ACTIONS.PASSKEY_DELETE)).toBe(false)

    await grantStepUp(userId, STEP_UP_ACTIONS.PASSKEY_DELETE)

    expect(await hasRecentStepUp(userId, STEP_UP_ACTIONS.PASSKEY_DELETE)).toBe(true)
  })

  it('accepts only recent passkey-authenticated sessions as fresh step-up equivalents', () => {
    const nowMs = Date.UTC(2026, 2, 10, 12, 0, 0)
    const freshAuthTime = Math.floor(nowMs / 1000) - (STEP_UP_TTL_SECONDS - 10)
    const staleAuthTime = Math.floor(nowMs / 1000) - (STEP_UP_TTL_SECONDS + 10)

    expect(
      isFreshPasskeyAuth({
        amr: ['passkey'],
        authTime: freshAuthTime,
        nowMs,
      }),
    ).toBe(true)

    expect(
      isFreshPasskeyAuth({
        amr: ['email_otp'],
        authTime: freshAuthTime,
        nowMs,
      }),
    ).toBe(false)

    expect(
      isFreshPasskeyAuth({
        amr: ['passkey'],
        authTime: staleAuthTime,
        nowMs,
      }),
    ).toBe(false)
  })
})
