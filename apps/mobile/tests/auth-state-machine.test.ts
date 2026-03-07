import { describe, expect, it } from 'vitest'

import { authStateMachine, initialAuthState } from '../utils/auth/types'

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('authStateMachine', () => {
  it('returns initial state for unknown events', () => {
    const state = authStateMachine(initialAuthState, { type: 'UNKNOWN_ACTION' } as { type: 'UNKNOWN_ACTION' })
    expect(state).toEqual(initialAuthState)
  })

  it('transitions booting to signed_in on session load', () => {
    const state = authStateMachine(initialAuthState, { type: 'SESSION_LOADED', user: testUser })
    expect(state.status).toBe('signed_in')
    expect(state.user).toEqual(testUser)
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('transitions to signed_out on session expiry', () => {
    const loaded = authStateMachine(initialAuthState, { type: 'SESSION_LOADED', user: testUser })
    const expired = authStateMachine(loaded, { type: 'SESSION_EXPIRED' })
    expect(expired.status).toBe('signed_out')
    expect(expired.user).toBeNull()
  })

  it('moves to otp_requested after OTP request succeeds', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'signed_out' },
      { type: 'OTP_REQUESTED' },
    )
    expect(state.status).toBe('otp_requested')
    expect(state.error).toBeNull()
  })

  it('moves to degraded when OTP request fails', () => {
    const error = new Error('network')
    const state = authStateMachine(
      { ...initialAuthState, status: 'signed_out' },
      { type: 'OTP_REQUEST_FAILED', error },
    )
    expect(state.status).toBe('degraded')
    expect(state.error).toBe(error)
  })

  it('moves to verifying_otp while verifying code', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'otp_requested' },
      { type: 'OTP_VERIFICATION_STARTED' },
    )
    expect(state.status).toBe('verifying_otp')
    expect(state.isLoading).toBe(true)
  })

  it('moves to minting_api_token after OTP verification and before profile sync', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'verifying_otp', isLoading: true },
      { type: 'API_TOKEN_MINT_STARTED' },
    )
    expect(state.status).toBe('minting_api_token')
    expect(state.isLoading).toBe(true)
  })

  it('moves to syncing_profile before entering signed_in', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'minting_api_token', isLoading: true },
      { type: 'PROFILE_SYNC_STARTED' },
    )
    expect(state.status).toBe('syncing_profile')
    expect(state.isLoading).toBe(true)
  })

  it('returns to otp_requested on OTP verification failure', () => {
    const error = new Error('invalid code')
    const state = authStateMachine(
      { ...initialAuthState, status: 'verifying_otp', isLoading: true },
      { type: 'OTP_VERIFICATION_FAILED', error },
    )
    expect(state.status).toBe('otp_requested')
    expect(state.error).toBe(error)
    expect(state.isLoading).toBe(false)
  })

  it('transitions to signing_out while sign-out is in-flight', () => {
    const loaded = authStateMachine(initialAuthState, { type: 'SESSION_LOADED', user: testUser })
    const state = authStateMachine(loaded, { type: 'SIGN_OUT_REQUESTED' })
    expect(state.status).toBe('signing_out')
    expect(state.isLoading).toBe(true)
  })

  it('always lands in signed_out after sign-out success', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'signing_out', isLoading: true, user: testUser },
      { type: 'SIGN_OUT_SUCCESS' },
    )
    expect(state.status).toBe('signed_out')
    expect(state.user).toBeNull()
    expect(state.error).toBeNull()
    expect(state.isLoading).toBe(false)
  })

  it('can hard reset to signed_out from any state', () => {
    const state = authStateMachine(
      { ...initialAuthState, status: 'signed_in', user: testUser },
      { type: 'RESET_TO_SIGNED_OUT' },
    )
    expect(state.status).toBe('signed_out')
    expect(state.user).toBeNull()
  })

  it('enters terminal_error on fatal error', () => {
    const error = new Error('fatal')
    const state = authStateMachine(initialAuthState, { type: 'FATAL_ERROR', error })
    expect(state.status).toBe('terminal_error')
    expect(state.error).toBe(error)
  })
})
